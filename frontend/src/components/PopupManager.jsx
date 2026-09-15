import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { AlertTriangle, AlertOctagon, Info, CheckCircle2 } from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:5000`;

export default function PopupManager() {
  const { liveParams } = useAppContext();
  const [dismissed, setDismissed] = useState({});
  const [acking, setAcking] = useState(false);

  // Process-step popups driven by PLC bits
  const popups = [
    { key: 'POP_UNLOAD',   msg: 'Milk Unloading Active. Confirm parameters.',       type: 'info',    ackTag: 'unloadPopupAck' },
    { key: 'POP_TEMP',     msg: 'Milk Temperature out of range!',                   type: 'warning', autoClear: true },
    { key: 'POP_UNLOAD_DN',msg: 'Milk Unloading Complete. Acknowledge.',             type: 'success', ackTag: 'unloadDoneAck' },
    { key: 'POP_SEP_DN',   msg: 'Separation Complete. Acknowledge.',                 type: 'success', ackTag: 'SeparationDoneAck' },
    { key: 'POP_STD_CMP',  msg: 'Standardization Complete. Acknowledge.',            type: 'success', ackTag: 'StdCompleteAck' },
    { key: 'POP_UFLOW',    msg: 'Underflow Alarm! Check supply.',                    type: 'warning', autoClear: true },
    { key: 'POP_TANK_HI',  msg: 'Tank High Level Warning!',                         type: 'warning', ackTag: 'unloadPopupAck' },
    { key: 'POP_RC_TEMP',  msg: 'RC Temperature Reached.',                           type: 'success', autoClear: true },
    { key: 'POP_CHILL_DN', msg: 'Chilling Process Done.',                            type: 'success', ackTag: 'chillAck' },
    { key: 'POP_ACK_FLOW', msg: 'Acknowledge Flow Plate and Hose Connection.',       type: 'info',    ackTag: 'operatorAck' },
  ];

  // Auto-clear dismissed if PLC bit drops back to 0
  useEffect(() => {
    setDismissed(prev => {
      let updated = { ...prev };
      let changed = false;
      popups.forEach(p => {
        if (liveParams[p.key] !== 1 && updated[p.key]) { delete updated[p.key]; changed = true; }
      });
      return changed ? updated : prev;
    });
  }, [liveParams]);

  // Send A.Accept_pb (DB1,X2600.2) to PLC — clears DB32 words via FILL_BLK
  const sendAck = useCallback(async () => {
    setAcking(true);
    try {
      await fetch(`${API_BASE}/api/v1/alarms/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'ACCEPT_PB', title: 'Operator Acknowledged' }),
      });
    } catch (e) {
      console.error('Ack write failed:', e);
    } finally {
      setTimeout(() => setAcking(false), 1500);
    }
  }, []);

  const critActive = liveParams['CRIT_ALERT'] === 1;
  const warnActive = liveParams['WARN_ALERT'] === 1;
  const activePopups = popups.filter(p => liveParams[p.key] === 1 && !dismissed[p.key]);

  if (!critActive && !warnActive && activePopups.length === 0) return null;

  return (
    <div className="popup-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, gap: '1rem'
    }}>

      {/* ── PLC CRITICAL ALERT BANNER (DB1,X2594.0) ── */}
      {critActive && (
        <div style={{
          padding: '20px 28px', borderRadius: '12px', minWidth: '440px',
          background: 'rgba(220,38,38,0.15)', border: '1.5px solid #ef4444',
          boxShadow: '0 0 32px rgba(239,68,68,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <AlertOctagon color="#ef4444" size={26} />
            <h3 style={{ margin: 0, color: '#fca5a5', fontSize: '1.1rem' }}>🔴 CRITICAL FAULT DETECTED</h3>
          </div>
          <p style={{ margin: '0 0 16px', color: '#fecaca', fontSize: '0.95rem' }}>
            The PLC has raised a critical alarm (DB1,X2594.0). Check the Alarms tab for details.
          </p>
          <button onClick={sendAck} disabled={acking} style={{
            background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px',
            padding: '8px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem'
          }}>
            {acking ? 'Sending ACK…' : 'ACKNOWLEDGE (Send A.Accept_pb)'}
          </button>
        </div>
      )}

      {/* ── PLC WARNING BANNER (DB1,X2594.1) ── */}
      {warnActive && !critActive && (
        <div style={{
          padding: '20px 28px', borderRadius: '12px', minWidth: '440px',
          background: 'rgba(245,158,11,0.12)', border: '1.5px solid #f59e0b',
          boxShadow: '0 0 24px rgba(245,158,11,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <AlertTriangle color="#f59e0b" size={26} />
            <h3 style={{ margin: 0, color: '#fcd34d', fontSize: '1.1rem' }}>⚠️ SYSTEM WARNING ACTIVE</h3>
          </div>
          <p style={{ margin: '0 0 16px', color: '#fde68a', fontSize: '0.95rem' }}>
            One or more warning conditions are active (DB1,X2594.1). Check the Alarms tab.
          </p>
          <button onClick={sendAck} disabled={acking} style={{
            background: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px',
            padding: '8px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem'
          }}>
            {acking ? 'Sending ACK…' : 'ACKNOWLEDGE'}
          </button>
        </div>
      )}

      {/* ── Process-step popups ── */}
      {activePopups.map(p => (
        <div key={p.key} className={`popup-modal glass-panel popup-${p.type}`} style={{
          padding: '24px', borderRadius: '12px', minWidth: '400px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {p.type === 'warning' && <AlertTriangle color="#f59e0b" size={24} />}
            {p.type === 'success' && <CheckCircle2 color="#10b981" size={24} />}
            {p.type === 'info'    && <Info color="#3b82f6" size={24} />}
            <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>System Notification</h3>
          </div>
          <p style={{ margin: '0 0 24px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>{p.msg}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {!p.autoClear ? (
              <button className="btn btn-primary"
                onClick={() => setDismissed(d => ({ ...d, [p.key]: true }))}
                style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                ACKNOWLEDGE ({p.ackTag})
              </button>
            ) : (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Will auto-clear when condition resolves…
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
