import { useState, useEffect, useCallback } from 'react';
import { BellRing, CheckCircle2, Download, AlertTriangle, Info, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import './Alarms.css';

export default function Alarms() {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [severityFilter, setSeverityFilter] = useState('all');
  const { addToast } = useToast();

  const fetchAlarms = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_IIH_BASE_URL || 'http://localhost:5000'}/api/v1/alarms`);
      if (res.ok) {
        setAlarms(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch alarms', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlarms();
    const iv = setInterval(() => fetchAlarms(true), 15000);
    return () => clearInterval(iv);
  }, [fetchAlarms]);

  const handleDelete = async (alarm) => {
    setDeletingIds(prev => new Set([...prev, alarm.id]));
    try {
      const res = await fetch(`${import.meta.env.VITE_IIH_BASE_URL || 'http://localhost:5000'}/api/v1/alarms/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: alarm.id,
          alarm_id: alarm.alarm_id,
          raw_time: alarm._raw_time,
        }),
      });
      if (res.ok) {
        setAlarms(prev => prev.filter(a => a.id !== alarm.id));
        addToast('Alarm entry removed', 'success');
      } else {
        addToast('Failed to remove alarm', 'error');
      }
    } catch (e) {
      addToast('Connection error', 'error');
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(alarm.id); return n; });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) { addToast('No alarms selected', 'info'); return; }
    const toDelete = alarms.filter(a => selectedIds.has(a.id));
    
    // Set opacity of selected rows to 0.4 while deleting
    toDelete.forEach(a => setDeletingIds(prev => new Set([...prev, a.id])));
    
    try {
      const res = await fetch(`${import.meta.env.VITE_IIH_BASE_URL || 'http://localhost:5000'}/api/v1/alarms/delete_batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alarms: toDelete.map(a => ({
            id: a.id,
            alarm_id: a.alarm_id,
            raw_time: a._raw_time,
          }))
        }),
      });
      
      if (res.ok) {
        setAlarms(prev => prev.filter(a => !selectedIds.has(a.id)));
        addToast(`${toDelete.length} alarm(s) deleted`, 'success');
      } else {
        addToast('Failed to delete selected alarms', 'error');
      }
    } catch (e) {
      addToast('Connection error', 'error');
    } finally {
      toDelete.forEach(a => setDeletingIds(prev => { const n = new Set(prev); n.delete(a.id); return n; }));
      setSelectedIds(new Set());
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered_alarms.map(a => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };



  const getSeverityIcon = (sev) => {
    switch (sev) {
      case 'critical': return <XCircle size={14} className="sev-icon" />;
      case 'warning':  return <AlertTriangle size={14} className="sev-icon" />;
      case 'info':     return <Info size={14} className="sev-icon" />;
      default:         return null;
    }
  };

  const filtered_alarms = severityFilter === 'all'
    ? alarms
    : alarms.filter(a => a.severity === severityFilter);

  const isAllSelected = filtered_alarms.length > 0 && selectedIds.size === filtered_alarms.length;

  const counts = {
    critical: alarms.filter(a => a.severity === 'critical').length,
    warning:  alarms.filter(a => a.severity === 'warning').length,
    info:     alarms.filter(a => a.severity === 'info').length,
  };

  return (
    <div className="page-container alarms-page">
      <div className="alarms-header">
        <div className="header-title-block">
          <BellRing className="header-icon" size={28} />
          <div>
            <h1 className="section-title">Alarm & Event Log</h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Full history — entries remain until manually deleted
            </p>
          </div>
        </div>
        <div className="action-bar">
          <button className="glass-button" onClick={() => fetchAlarms()} disabled={loading} title="Refresh">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>


          <button
            className="glass-button"
            onClick={handleDeleteSelected}
            style={{ borderColor: 'rgba(239,68,68,.4)', color: '#ef4444' }}
            title={selectedIds.size > 0 ? "Delete selected alarms" : "Select alarms to delete"}
            disabled={selectedIds.size === 0}
          >
            <Trash2 size={15} /> Delete Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'all',      label: 'All',      count: alarms.length,    color: 'rgba(91,197,242,.6)'  },
          { key: 'critical', label: 'Critical', count: counts.critical,  color: 'rgba(239,68,68,.7)'   },
          { key: 'warning',  label: 'Warning',  count: counts.warning,   color: 'rgba(245,158,11,.7)'  },
          { key: 'info',     label: 'Info',     count: counts.info,      color: 'rgba(0,212,170,.6)'   },
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setSeverityFilter(key)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'var(--font-label)',
              fontWeight: 700, cursor: 'pointer', border: `1px solid ${color}`,
              background: severityFilter === key ? color.replace('.6)', '.2)').replace('.7)', '.18)') : 'transparent',
              color: severityFilter === key ? '#f1f5f9' : 'var(--text-secondary)',
              transition: 'all .2s',
            }}
          >
            {label} <span style={{ opacity: .7 }}>({count})</span>
          </button>
        ))}
      </div>

      <div className="glass-panel table-panel">
        <div className="table-responsive">
          <table className="alarms-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th>Timestamp</th>
                <th>Severity</th>
                <th>Source</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {filtered_alarms.map((alarm) => (
                <tr key={alarm.id} style={{ opacity: deletingIds.has(alarm.id) ? 0.4 : 1, transition: 'opacity .3s', background: selectedIds.has(alarm.id) ? 'rgba(91,197,242,0.05)' : '' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(alarm.id)} 
                      onChange={() => handleSelectRow(alarm.id)} 
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td className="val-mono" style={{ whiteSpace: 'nowrap' }}>{new Date(alarm._raw_time).toLocaleString()}</td>
                  <td>
                    <span className={`severity-badge badge-${alarm.severity}`}>
                      {getSeverityIcon(alarm.severity)}
                      {alarm.severity.toUpperCase()}
                    </span>
                  </td>
                  <td>{alarm.source}</td>
                  <td>{alarm.category}</td>
                  <td>{alarm.description}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="glass-button icon-btn"
                      title="Delete this entry"
                      disabled={deletingIds.has(alarm.id)}
                      onClick={() => handleDelete(alarm)}
                      style={{ padding: '4px 8px', borderColor: 'rgba(239,68,68,.3)', color: '#ef4444' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered_alarms.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    {severityFilter === 'all' ? 'No alarm history recorded yet.' : `No ${severityFilter} alarms in log.`}
                  </td>
                </tr>
              )}
              {loading && alarms.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">Loading alarm history…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
