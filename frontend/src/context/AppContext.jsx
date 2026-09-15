import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { startTagPolling, pollTagData, POLL_INTERVAL_SECONDS, TAG_ADDRESSES } from '../services/api';

const AppContext = createContext();

// ── localStorage persistence helpers ──────────────────────
const STORAGE_KEY = 'dairy_history_v1';

function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveHistoryToStorage(historyParams) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyParams));
  } catch { /* quota exceeded — ignore */ }
}
// ──────────────────────────────────────────────────────────

const initialState = {
  liveParams: {},
  historyParams: loadHistoryFromStorage(),   // ← restore instantly on load
  toastQueue: [],
  derivedTotalPasteurized: 0,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LIVE_PARAMS': {
      const newLive = action.payload || {};
      const newHistory = { ...state.historyParams };

      const allTags = new Set([...Object.keys(newHistory), ...Object.keys(newLive)]);

      allTags.forEach((tag) => {
        let val = newLive[tag];
        if (val !== null && typeof val === 'object' && val.value !== undefined) {
          val = val.value; // extract numeric value from live backend API object
        }
        // If data is missing/null in this poll, push null so charts show a gap
        // Fix 2: 0.0 is a valid PLC reading (stopped pump, empty tank, etc.) — keep it as a real value.
        const numVal = (val !== undefined && val !== null && !isNaN(parseFloat(val)))
          ? parseFloat(val)
          : null;
        const existing = newHistory[tag];
        if (existing) {
          newHistory[tag] = [...existing, numVal].slice(-120);
        } else {
          newHistory[tag] = Array(120).fill(null);
        }
      });

      // Save updated history to localStorage so charts survive page refresh
      saveHistoryToStorage(newHistory);

      const extractVal = (tag) => {
        const v = newLive[tag] !== undefined ? newLive[tag] : state.liveParams[tag];
        return v !== null && typeof v === 'object' ? v.value : v;
      };

      let newDerived = state.derivedTotalPasteurized || 0;
      const cycleStep = extractVal('%DB1.DBW2466') || 0;
      if (cycleStep === 0) {
         newDerived = 0;
      } else {
         const pastFlow = parseFloat(extractVal('AI9')) || 0;
         newDerived += (pastFlow * POLL_INTERVAL_SECONDS) / 3600;
      }

      return {
        ...state,
        liveParams: { ...state.liveParams, ...newLive },
        historyParams: newHistory,
        derivedTotalPasteurized: newDerived,
      };
    }
    case 'PRELOAD_HISTORY': {
      // histData = { "AI1": [76.4, 76.3, ...120 floats], ... }
      // Only set tags that don't already have live history accumulating
      const preloaded = { ...state.historyParams };
      Object.entries(action.payload).forEach(([tag, arr]) => {
        if (!preloaded[tag]) {
          preloaded[tag] = arr;
        }
      });
      saveHistoryToStorage(preloaded);
      return { ...state, historyParams: preloaded };
    }
    case 'ADD_TOAST':
      return { ...state, toastQueue: [...state.toastQueue, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toastQueue: state.toastQueue.filter((t) => t.id !== action.payload) };
    default:
      return state;
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setLiveData = (data) => {
    if (data && data.raw) {
      dispatch({ type: 'SET_LIVE_PARAMS', payload: data.raw });
    }
  };

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, 5000);
  };

  const removeToast = (id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  useEffect(() => {
    const API = import.meta.env.VITE_IIH_BASE_URL || (import.meta.env.VITE_IIH_BASE_URL || 'http://localhost:5000');
    const tagsParam = Object.values(TAG_ADDRESSES).join(',');

    // Fix 1: Retry-with-backoff for the bulk history pre-fetch.
    // If the backend isn't ready at load time, retry up to MAX_RETRIES times
    // with RETRY_DELAY_MS between each attempt before giving up.
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 4000;

    async function fetchHistoryWithRetry(attempt = 0) {
      try {
        const res = await fetch(`${API}/api/v1/tags/history/bulk?tags=${tagsParam}&minutes=120`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const histData = await res.json();
        if (histData && Object.keys(histData).length > 0) {
          // Fix 2: Pass raw values directly — 0.0 is a valid PLC reading.
          dispatch({ type: 'PRELOAD_HISTORY', payload: histData });
        }
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          console.warn(
            `[AppContext] History pre-fetch failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${RETRY_DELAY_MS / 1000}s…`,
            err.message
          );
          setTimeout(() => fetchHistoryWithRetry(attempt + 1), RETRY_DELAY_MS);
        } else {
          console.warn('[AppContext] History pre-fetch gave up after', MAX_RETRIES + 1, 'attempts. Charts will populate from live polls.');
        }
      }
    }

    // 1. Pre-load 120-minute history from InfluxDB so charts survive refresh
    fetchHistoryWithRetry();

    // 2. Fetch current live values immediately then every 60 s
    pollTagData().then(setLiveData);
    const stopPolling = startTagPolling(setLiveData);

    return () => {
      if (stopPolling) stopPolling();
    };
  }, []);

  // Convenience: get history array for a PLC tag address
  const getHistory = (address) => {
    return state.historyParams[address] || [];
  };

  return (
    <AppContext.Provider value={{ ...state, dispatch, addToast, removeToast, getHistory }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
