
export const TAG_ADDRESSES = {
  // ── PASTEURIZER Analog Inputs (DB_UNIT2,REAL204–REAL232) ──────────────────────
  PAST_AI1: 'AI1', PAST_AI2: 'AI2', PAST_AI3: 'AI3', PAST_AI4: 'AI4',
  PAST_AI5: 'AI5', PAST_AI6: 'AI6', PAST_AI7: 'AI7', PAST_AI8: 'AI8',
  PAST_AI9: 'AI9', // DB_UNIT2_AUX,REAL526 — flagged ERROR, verify with PLC engineer

  // ── PASTEURIZER Analog Outputs ────────────────────────────────────────────
  PAST_AO1: 'AO1', // DB_UNIT2_VFD,REAL70  — Supply Pump VFD
  PAST_AO2: 'AO2', // DB_UNIT2_VLV1,REAL20  — Main Heater Steam Valve
  PAST_AO3: 'AO3', // DB_UNIT2_VLV2,REAL20  — Pre Heater Steam Valve

  // ── PASTEURIZER Solenoid Valves (DB_UNIT2,X816.x – DB_UNIT2,X818.x) ───────────────
  PAST_SV1:  'SV1',  PAST_SV2:  'SV2',  PAST_SV3:  'SV3',  PAST_SV4:  'SV4',
  PAST_SV5:  'SV5',  PAST_SV6:  'SV6',  PAST_SV7:  'SV7',  PAST_SV8:  'SV8',
  PAST_SV9:  'SV9',  PAST_SV10: 'SV10', PAST_SV11: 'SV11', PAST_SV12: 'SV12',
  PAST_SV13: 'SV13', PAST_SV14: 'SV14', PAST_SV15: 'SV15', PAST_SV16: 'SV16',
  PAST_SV17: 'SV17', PAST_SV18: 'SV18', PAST_SV19: 'SV19', PAST_SV20: 'SV20',
  PAST_SV21: 'SV21',

  // ── PASTEURIZER Motors ────────────────────────────────────────────────────
  PAST_FEED_PUMP:  'FEED_PUMP',  // DB_UNIT2,X819.3
  PAST_HOMO_START: 'HOMO_START', // DB_UNIT2,X819.4
  PAST_HOMO_STOP:  'HOMO_STOP',  // DB_UNIT2,X819.5
  PAST_BOOST_PUMP: 'BOOST_PUMP', // DB_UNIT2,X793.5
  PAST_RM_PUMP:    'RM_PUMP',    // DB_UNIT2_PMP,X0.0
  PAST_PMST_PUMP:  'PMST_PUMP',  // DB_UNIT2,X819.4 (duplicate HOMO_START addr)
  PAST_PMST_AGIT:  'PMST_AGIT',  // DB_UNIT2,X819.5 (duplicate HOMO_STOP addr)

  // ── PASTEURIZER Level Switches ────────────────────────────────────────────
  PAST_BT_HIGH:   'BT_HIGH',   // DB_UNIT2_AUX,X464.1  — flagged ERROR
  PAST_BT_LOW:    'BT_LOW',    // DB_UNIT2_AUX,X2464.0 — flagged ERROR
  PAST_PMST_HIGH: 'PMST_HIGH', // DB_UNIT2,X793.0
  PAST_PMST_LOW:  'PMST_LOW',  // DB_UNIT2,X793.1

  // ── CIP Analog Inputs ─────────────────────────────────────────────────────
  CIP_CT2: 'CT2', // DB_UNIT2_AUX,REAL6
  CIP_CT3: 'CT3', // DB_UNIT3_LYE,REAL6
  CIP_CT4: 'CT4', // DB_UNIT3_ACID,REAL6
  CIP_CT5: 'CT5', // DB_UNIT3_SUP,REAL6
  CIP_CT6: 'CT6', // DB_UNIT3_RET,REAL6
  CIP_CF1: 'CF1', // DB_UNIT3_FLOW,REAL6
  CIP_CC1: 'CC1', // DB_UNIT3_COND,REAL6

  // ── CIP VFD ───────────────────────────────────────────────────────────────
  CIP_VFD_SP:   'CIP_VFD_SP',   // DB_UNIT3_VFD,REAL70
  CIP_VFD_RUN:  'CIP_VFD_RUN',  // DB_UNIT3,X1.5
  CIP_VFD_TRIP: 'CIP_VFD_TRIP', // DB_UNIT3,X1.6

  // ── CIP Valves & Pumps (DB_UNIT3,X24.x – DB_UNIT3,X26.x) ──────────────────────────
  CIP_BFV_3:    'BFV_3',   CIP_BFV_4:  'BFV_4',  CIP_BFV_5:  'BFV_5',
  CIP_BFV_6:    'BFV_6',   CIP_BFV_7:  'BFV_7',  CIP_BFV_8:  'BFV_8',
  CIP_BFV_9:    'BFV_9',   CIP_BFV_10: 'BFV_10', CIP_BFV_11: 'BFV_11',
  CIP_BFV_12:   'BFV_12',  CIP_BFV_13: 'BFV_13', CIP_BFV_14: 'BFV_14',
  CIP_BFV_15:   'BFV_15',  CIP_BFV_16: 'BFV_16', CIP_BFV_17: 'BFV_17',
  CIP_BFV_18:   'BFV_18',  CIP_BFV_19: 'BFV_19', CIP_BFV_20: 'BFV_20',
  CIP_SUP_PUMP: 'Sup_Pump', CIP_ADP: 'ADP', CIP_LDP: 'LDP',
  CIP_RET_P1:   'Ret_P1',  CIP_RET_P2: 'Ret_P2', CIP_RET_P3: 'Ret_P3',

  // ── CIP Level Switches (DB_UNIT3,X0.7 – DB_UNIT3,X1.4) ─────────────────────────────
  CIP_HW_HIGH:   'HW_HIGH',   CIP_HW_LOW:   'HW_LOW',
  CIP_LYE_HIGH:  'LYE_HIGH',  CIP_LYE_LOW:  'LYE_LOW',
  CIP_ACID_HIGH: 'ACID_HIGH', CIP_ACID_LOW: 'ACID_LOW',

  // ── RECEPTION Temperatures (DB_UNIT1,REAL406–620) ──────────────────────────────
  REC_TT1: 'TT1', REC_TT2: 'TT2', REC_TT3: 'TT3', REC_TT4: 'TT4',
  REC_TT5: 'TT5', REC_TT6: 'TT6', REC_TT7: 'TT7',

  // ── RECEPTION Flow Meters (DB_UNIT1_FLOW,REAL48/52) ────────────────────────────────
  REC_FM1: 'FM1', REC_FM2: 'FM2',

  // ── RECEPTION VFDs ────────────────────────────────────────────────────────
  REC_VFD1_SP: 'VFD1_SP', REC_VFD1_HZ: 'VFD1_HZ',
  REC_VFD2_SP: 'VFD2_SP', REC_VFD2_HZ: 'VFD2_HZ',

  // ── RECEPTION Tank Levels & Temps ─────────────────────────────────────────
  REC_RCM_HIGH: 'RCM_HIGH', REC_RCM_LOW: 'RCM_LOW', REC_RCM_TEMP: 'RCM_TEMP',
  REC_RMST_HIGH: 'RMST_HIGH', REC_RMST_LOW: 'RMST_LOW', REC_RMST_TEMP: 'RMST_TEMP',

  // ── RECEPTION Routing Booleans (DB_UNIT1,X0.4/X0.5/X12.0/X12.1) ─────────────
  REC_UNLOAD_RCM:  'unloadTankRCM',
  REC_UNLOAD_RMST: 'unloadTankRMST',
  REC_DEST_RCM:    'destRcmTank',
  REC_DEST_RMST:   'destRmstTank',

  // ── RECEPTION Setpoints & Totalisers ─────────────────────────────────────
  REC_RECEP_FLOW_SP: 'RECEP_FLOW_SP', // DB_UNIT1,REAL18
  REC_RMST_OUT_SP:   'RMST_OUT_SP',   // DB_UNIT1,REAL22
  REC_TOT_RECEPTION: 'TOT_RECEPTION', // DB_UNIT1,REAL594
  REC_TOT_WATER:     'TOT_WATER_FLUSH',// DB_UNIT1,REAL274

  // ── RECEPTION ALARM BITS (DB_UNIT1_ALM) ────────────────────────────────────────────
  REC_ALM_ESTOP:     'REC_ALM_ESTOP',     // DB_UNIT1_ALM,X4.0
  REC_ALM_AIR:       'REC_ALM_AIR',       // DB_UNIT1_ALM,X4.1
  REC_ALM_SPP:       'REC_ALM_SPP',       // DB_UNIT1_ALM,X4.2
  REC_ALM_RCM_HI:    'REC_ALM_RCM_HI',    // DB_UNIT1_ALM,X4.3
  REC_ALM_RMST_HI:   'REC_ALM_RMST_HI',   // DB_UNIT1_ALM,X4.4
  REC_ALM_SEP:       'REC_ALM_SEP',       // DB_UNIT1_ALM,X4.5
  REC_ALM_VENTURI:   'REC_ALM_VENTURI',   // DB_UNIT1_ALM,X4.6
  REC_ALM_RCM_AGIT:  'REC_ALM_RCM_AGIT',  // DB_UNIT1_ALM,X4.7
  REC_ALM_RMST_AGIT: 'REC_ALM_RMST_AGIT', // DB_UNIT1_ALM,X5.0
  REC_ALM_CHILL:     'REC_ALM_CHILL',     // DB_UNIT1_ALM,X5.1

  // ── CIP ALARM BITS (DB_UNIT3_ALM) ─────────────────────────────────────────────────
  CIP_ALM_ESTOP:    'CIP_ALM_ESTOP',    // DB_UNIT3_ALM,X0.0
  CIP_ALM_AIR:      'CIP_ALM_AIR',      // DB_UNIT3_ALM,X0.2
  CIP_ALM_SPL:      'CIP_ALM_SPL',      // DB_UNIT3_ALM,X0.3
  CIP_ALM_SUP_FB:   'CIP_ALM_SUP_FB',   // DB_UNIT3_ALM,X0.4
  CIP_ALM_RET_FS:   'CIP_ALM_RET_FS',   // DB_UNIT3_ALM,X0.6
  CIP_ALM_RT_LL:    'CIP_ALM_RT_LL',    // DB_UNIT3_ALM,X2.1
  CIP_ALM_HT_LL:    'CIP_ALM_HT_LL',    // DB_UNIT3_ALM,X2.2
  CIP_ALM_LT_LL:    'CIP_ALM_LT_LL',    // DB_UNIT3_ALM,X2.3
  CIP_ALM_AT_LL:    'CIP_ALM_AT_LL',    // DB_UNIT3_ALM,X2.4
  CIP_ALM_FLOW_LO:  'CIP_ALM_FLOW_LO',  // DB_UNIT3_ALM,X3.0

  // ── PASTEURIZER ALARM BITS (DB_UNIT2_ALM + DB_UNIT2_PMST) ──────────────────────────────────
  PAST_ALM_ESTOP:     'PAST_ALM_ESTOP',     // DB_UNIT2_ALM,X0.0
  PAST_ALM_AIR:       'PAST_ALM_AIR',       // DB_UNIT2_ALM,X0.2
  PAST_ALM_FEED_FB:   'PAST_ALM_FEED_FB',   // DB_UNIT2_ALM,X0.4
  PAST_ALM_FEED_TRIP: 'PAST_ALM_FEED_TRIP', // DB_UNIT2_ALM,X0.5
  PAST_ALM_PMST_FB:   'PAST_ALM_PMST_FB',   // DB_UNIT2_ALM,X1.0
  PAST_ALM_PMST_AGIT: 'PAST_ALM_PMST_AGIT', // DB_UNIT2_ALM,X1.1
  PAST_ALM_HOMO_FS:   'PAST_ALM_HOMO_FS',   // DB_UNIT2_ALM,X1.2
  PAST_ALM_FLOW:      'PAST_ALM_FLOW',      // DB_UNIT2_ALM,X1.3
  PAST_ALM_LOW_LONG:  'PAST_ALM_LOW_LONG',  // DB_UNIT2_ALM,X1.5
  PAST_ALM_BAL_HI:    'PAST_ALM_BAL_HI',    // DB_UNIT2_ALM,X2.0
  PAST_ALM_BAL_LO:    'PAST_ALM_BAL_LO',    // DB_UNIT2_ALM,X2.1
  PAST_ALM_HOT_LO:    'PAST_ALM_HOT_LO',    // DB_UNIT2_ALM,X3.0
  PAST_ALM_HOT_HI:    'PAST_ALM_HOT_HI',    // DB_UNIT2_ALM,X3.1
  PAST_ALM_OUT_LO:    'PAST_ALM_OUT_LO',    // DB_UNIT2_ALM,X3.2
  PAST_ALM_OUT_HI:    'PAST_ALM_OUT_HI',    // DB_UNIT2_ALM,X3.3
  PAST_ALM_PMST_HI:   'PAST_ALM_PMST_HI',   // DB_UNIT2_PMST,X0.1

  // ── VISUAL ALERT FLAGS (DB_UNIT2) — drives dashboard banners ──────────────────
  CRIT_ALERT: 'CRIT_ALERT', // DB_UNIT2,X2594.0 — red banner (new critical fault edge)
  WARN_ALERT: 'WARN_ALERT', // DB_UNIT2,X2594.1 — amber banner (any DB_UNIT2_ALM word non-zero)
  // ACCEPT_PB: 'ACCEPT_PB' — DB_UNIT2,X2600.2 is WRITE-ONLY; sent via /api/v1/ack endpoint
};

const API_BASE = import.meta.env.VITE_IIH_BASE_URL || `http://${window.location.hostname}:5000`;

/** Timestamp of the last successful tag poll (Date object or null). */
export let lastPollTime = null;

export async function pollTagData() {
  try {
    const tagsToFetch = Object.values(TAG_ADDRESSES);

    const res = await fetch(`${API_BASE}/api/v1/tags`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagsToFetch })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    lastPollTime = new Date();

    const rawData = {};
    for (const [tag, info] of Object.entries(data)) {
      if (info.value !== null && info.value !== undefined) {
        rawData[tag] = info.value;
        // Expose age so AppContext / components can show staleness indicator
        if (info.age_sec !== null && info.age_sec !== undefined) {
          rawData[`${tag}__age`] = info.age_sec;
        }
      }
    }

    return restructureData(rawData);

  } catch (err) {
    console.error('pollTagData failed:', err);
    return restructureData({});
  }
}

function restructureData(rawData) {
  // Returns structured data matching data.js shape logically mapping live response
  return {
    pastTemps: {},
    pastValves: {},
    cipAnalogs: {},
    cipValves: {},
    receptionTemps: {},
    levelTags: {},
    raw: rawData
  };
}

// 60-second polling interval as per user request
export const POLL_INTERVAL_SECONDS = 60;

export function startTagPolling(onDataCallback) {
  const intervalId = setInterval(async () => {
    const data = await pollTagData();
    if (data && typeof onDataCallback === 'function') {
      onDataCallback(data);
    }
  }, POLL_INTERVAL_SECONDS * 1000);
  
  return () => clearInterval(intervalId);
}

export async function pollPredictions() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/predictions`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.error('Failed to fetch predictions', err);
  }
  return {};
}
