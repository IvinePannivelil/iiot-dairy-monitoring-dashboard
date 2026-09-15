import { useState, useEffect } from 'react'
import { FileDown, Printer, CheckCircle2, AlertCircle, XCircle, ClipboardList, Droplets, Thermometer, Inbox, Calendar, Clock } from 'lucide-react'
import './Reports.css'

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'Pasteurizer', label: 'Pasteurizer' },
  { key: 'CIP',         label: 'CIP' },
  { key: 'Reception',   label: 'Reception' },
]

const TIME_RANGES = [
  { key: '1h', label: '1 Hour' },
  { key: '12h', label: '12 Hours' },
  { key: '24h', label: '24 Hours' },
  { key: 'custom', label: 'Date Range' },
]

const STATUS_ICON = {
  Passed:  <CheckCircle2 size={15} />,
  Warning: <AlertCircle  size={15} />,
  Failed:  <XCircle      size={15} />,
}

export default function Reports() {
  const [activeFilter, setFilter] = useState('all')
  const [timeRange, setTimeRange] = useState('24h')
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      let url = `${import.meta.env.VITE_IIH_BASE_URL || "http://localhost:5000"}/api/v1/reports?system_type=${activeFilter}`
      
      if (timeRange === 'custom') {
        if (startDate) url += `&start_date=${encodeURIComponent(new Date(startDate).toISOString())}`
        if (endDate) url += `&end_date=${encodeURIComponent(new Date(endDate).toISOString())}`
      } else {
        const now = new Date()
        let msOffset = 24 * 60 * 60 * 1000 // 24h default
        if (timeRange === '1h') msOffset = 1 * 60 * 60 * 1000
        if (timeRange === '12h') msOffset = 12 * 60 * 60 * 1000
        
        url += `&start_date=${encodeURIComponent(new Date(now.getTime() - msOffset).toISOString())}`
        url += `&end_date=${encodeURIComponent(now.toISOString())}`
      }

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      } else {
        console.error("Failed to fetch reports:", res.status)
        setReports([])
      }
    } catch (e) {
      console.error("Failed to fetch reports", e)
    } finally {
      setIsLoading(false)
    }
  }

  // Refetch when filters change
  useEffect(() => {
    fetchReports()
  }, [activeFilter, timeRange, startDate, endDate])

  const counts = {
    total:   reports.length,
    passed:  reports.filter(r => r.status === 'Passed').length,
    warning: reports.filter(r => r.status === 'Warning').length,
    failed:  reports.filter(r => r.status === 'Failed').length,
  }

  const formatReportDate = (isoString) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  
  const formatDateOnly = (isoString) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const handleExportCSV = () => {
    const headers = ['Batch ID', 'System', 'Product', 'Date', 'Start Time', 'End Time', 'Duration', 'Volume', 'Status', 'Details', 'T1 Label', 'T1', 'T2 Label', 'T2', 'Cond']
    const rows = reports.map(r =>
      [r.id, r.type, r.product, `"${formatDateOnly(r.startTime)}"`, `"${formatReportDate(r.startTime)}"`, `"${formatReportDate(r.endTime)}"`, `"${r.duration}"`, `"${r.volume}"`, r.status, `"${r.statusReason || ''}"`, `"${r.t1Label || ''}"`, `"${r.avgTemp1 || ''}"`, `"${r.t2Label || ''}"`, `"${r.avgTemp2 || ''}"`, `"${r.maxCond || ''}"`]
    )
    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `Dairy_Reports_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Delay revocation to ensure Chrome registers the filename properly
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <main className="page-container reports-page">
      <div className="reports-header no-print">
        <h1 className="section-title">Batch Reports History</h1>
      </div>

      {/* ── Controls ──────────────────────────────────────── */}
      <div className="report-controls glass-panel no-print">
        <div className="report-filter-group">
          <div className="filter-label"><Clock size={14} /> Timeframe:</div>
          {TIME_RANGES.map(tr => (
            <button
              key={tr.key}
              className={`report-filter-btn ${timeRange === tr.key ? 'active' : ''}`}
              onClick={() => setTimeRange(tr.key)}
            >
              {tr.label}
            </button>
          ))}
        </div>

        {timeRange === 'custom' && (
          <div className="date-range-picker">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="glass-button" style={{ height: '32px', padding: '0 12px' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>to</span>
            <input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   className="glass-button" style={{ height: '32px', padding: '0 12px' }} />
          </div>
        )}

        <div className="divider" />

        <div className="report-filter-group">
          <div className="filter-label"><ClipboardList size={14} /> System:</div>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`report-filter-btn ${activeFilter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="action-buttons">
          <button className="export-btn" onClick={handleExportPDF} title="Download as PDF">
            <Printer size={13} /> PDF
          </button>
          <button className="export-btn" onClick={handleExportCSV} title="Download as CSV">
            <FileDown size={13} /> CSV
          </button>
        </div>
      </div>

      <div className="print-header only-print">
        <h1>DAIRY PLANT — BATCH REPORTS</h1>
        <p>Generated: {new Date().toLocaleString()}</p>
        <p>Filter: {activeFilter.toUpperCase()} | Range: {timeRange}</p>
      </div>

      {/* ── Summary Bar ───────────────────────────────────── */}
      <div className="report-summary-bar">
        <div className="rsb-card glass-panel">
          <div className="rsb-icon"><ClipboardList size={18} color="#5BC5F2" /></div>
          <div className="rsb-info">
            <span className="rsb-label">Total Batches</span>
            <span className="rsb-val numeric" style={{ color: '#5BC5F2' }}>{counts.total}</span>
          </div>
        </div>
        <div className="rsb-card glass-panel">
          <div className="rsb-icon"><CheckCircle2 size={18} color="#6CBE45" /></div>
          <div className="rsb-info">
            <span className="rsb-label">Passed</span>
            <span className="rsb-val numeric" style={{ color: '#6CBE45' }}>{counts.passed}</span>
          </div>
        </div>
        <div className="rsb-card glass-panel">
          <div className="rsb-icon"><AlertCircle size={18} color="#f59e0b" /></div>
          <div className="rsb-info">
            <span className="rsb-label">Warnings</span>
            <span className="rsb-val numeric" style={{ color: '#f59e0b' }}>{counts.warning}</span>
          </div>
        </div>
        <div className="rsb-card glass-panel">
          <div className="rsb-icon"><XCircle size={18} color="#ef4444" /></div>
          <div className="rsb-info">
            <span className="rsb-label">Failed</span>
            <span className="rsb-val numeric" style={{ color: '#ef4444' }}>{counts.failed}</span>
          </div>
        </div>
      </div>

      {/* ── Report Cards ──────────────────────────────────── */}
      {isLoading ? (
        <div className="report-empty">
          <div className="loader" style={{ margin: '0 auto 20px auto', width: '30px', height: '30px', border: '3px solid var(--text-secondary)', borderTopColor: 'var(--brand-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <h3>Generating Reports...</h3>
          <p>Querying historical database for the selected timeframe.</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="report-empty">
          <Inbox size={36} strokeWidth={1.2} />
          <h3>No records for this timeframe</h3>
          <p>Try extending the date range or selecting a different system.</p>
        </div>
      ) : (
        <div className="reports-grid">
          {reports.map((r, idx) => {
            const statusKey = r.status.toLowerCase()
            // Use type + full ISO timestamp as key — guaranteed unique per record
            const cardKey = `${r.type}-${r.timestamp}-${idx}`
            return (
              <div key={cardKey} className={`report-card glass-panel ${statusKey}`}>
                <div className="rc-head">
                  <div>
                    <h4 className="rc-title">{r.type} — {r.product}</h4>
                    <span className="rc-batch">Batch #{r.id}</span>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 4 }}>
                      {formatDateOnly(r.startTime)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`rc-status ${statusKey}`} title={r.statusReason || ''}>
                      {STATUS_ICON[r.status]} {r.status.toUpperCase()}
                    </span>
                    {r.statusReason && <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 4 }}>{r.statusReason}</div>}
                  </div>
                </div>
                <div className="rc-data">
                  <div className="rc-row">
                    <span><Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Timeline</span>
                    <strong className="numeric">{formatReportDate(r.startTime)} – {formatReportDate(r.endTime)} <span style={{ fontSize: '0.7em', color: 'var(--text-dim)', marginLeft: 4 }}>({r.duration})</span></strong>
                  </div>
                  {r.type !== 'CIP' && (
                    <div className="rc-row">
                      <span><Droplets size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Total Volume</span>
                      <strong className="numeric" style={{ color: '#5BC5F2' }}>{r.volume}</strong>
                    </div>
                  )}
                  {r.t1Label && (
                    <div className="rc-row">
                      <span><Thermometer size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{r.t1Label}</span>
                      <strong className="numeric">{r.avgTemp1}</strong>
                    </div>
                  )}
                  {r.t2Label && (
                    <div className="rc-row">
                      <span><Thermometer size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{r.t2Label}</span>
                      <strong className="numeric">{r.avgTemp2}</strong>
                    </div>
                  )}
                  {r.maxCond && (
                    <div className="rc-row">
                      <span><AlertCircle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Max Cond.</span>
                      <strong className="numeric">{r.maxCond}</strong>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
