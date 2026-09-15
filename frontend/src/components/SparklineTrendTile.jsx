import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { AlertTriangle, TrendingUp, TrendingDown, BellOff } from 'lucide-react'
import { useAppContext } from '../context/AppContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const API = import.meta.env.VITE_IIH_BASE_URL || (import.meta.env.VITE_IIH_BASE_URL || 'http://localhost:5000')
// Module-level debounce map: prevents flooding the alarm log (5-min cooldown per sensor)
const _lastAlarmSent = {}

// ── Helpers ───────────────────────────────────────────────
function calcSlope(buf) {
  const n = buf.length
  if (n < 4) return 0
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  buf.forEach((y, x) => { sx += x; sy += y; sxy += x * y; sxx += x * x })
  const d = n * sxx - sx * sx
  return d === 0 ? 0 : (n * sxy - sx * sy) / d
}

// Format a ms timestamp → "HH:MM"
function toHHMM(ms) {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Relative label for tooltip  e.g. "10m ago", "Now", "+5m ahead"
function toRelLabel(ms, nowMs) {
  const diffMin = Math.round((ms - nowMs) / 60000)
  if (diffMin === 0) return 'Now'
  if (diffMin > 0)   return `+${diffMin}m ahead`
  return `${Math.abs(diffMin)}m ago`
}

export default function SparklineTrendTile({
  sensor, threshold, threshLabel = 'Threshold', aboveBad = true, cipPhaseName = null,
  address = null,  // PLC tag address e.g. "AI4" — used to seed from InfluxDB history
  suppressed = false // Used for Step-conditional alarms
}) {
  const { getHistory } = useAppContext()
  // history = [{v: number, t: ms timestamp}]
  const [history, setHistory] = useState([])
  const seededRef = useRef(false)

  // Seed history from InfluxDB pre-load — assume 1 point per minute going backwards
  useEffect(() => {
    if (!address || seededRef.current) return
    const preloaded = getHistory(address)
    if (preloaded && preloaded.some(v => v !== 0)) {
      seededRef.current = true
      const now = Date.now()
      const pts = preloaded.map((v, i) => ({
        v,
        t: now - (preloaded.length - 1 - i) * 60_000   // 1 min apart, ending at "now"
      }))
      setHistory(pts.slice(-120))
    }
  }, [address, getHistory])

  // Append live sensor value with current timestamp
  useEffect(() => {
    const val = (sensor && typeof sensor === 'object') ? sensor.value : sensor
    if (val !== null && val !== undefined && val !== '--') {
      setHistory(prev => [...prev, { v: val, t: Date.now() }].slice(-120))
    }
  }, [sensor])

  const currentVal = (sensor && typeof sensor === 'object') ? sensor.value : sensor
  const quality    = (sensor && typeof sensor === 'object') ? sensor.quality : 'good'

  // Evaluate breach & projection (bypass if suppressed)
  let valBad = false, alarmState = false
  if (!suppressed) {
    valBad = aboveBad ? (currentVal > threshold) : (currentVal < threshold)
    alarmState = valBad
  }

  if (currentVal === undefined || currentVal === null || currentVal === '--' || quality === 'bad') {
    return (
      <div className="sparkline-tile tile-ok" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
        {suppressed ? (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.05)', borderRadius: '12px', zIndex: 0 }} />
        ) : alarmState ? (
          <div className="alarm-pulse-overlay" />
        ) : null}
        <div style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
          <BellOff size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>Searching for Sensor...</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{address || 'Unknown Tag'}</div>
        </div>
      </div>
    )
  }

  // ── Build buffers ─────────────────────────────────────────
  const pts    = history.length >= 2 ? history : Array(12).fill({ v: currentVal, t: Date.now() })
  const buf    = pts.map(p => p.v)
  const N      = buf.length
  const m      = calcSlope(buf)
  const projLen = 10

  // Timestamps: last real point is "now", each projection step is +1 min
  const lastT      = pts[N - 1].t
  const histTimes  = pts.map(p => p.t)
  const projTimes  = Array.from({ length: projLen }, (_, i) => lastT + (i + 1) * 60_000)
  const allTimes   = [...histTimes, ...projTimes]    // N + projLen entries

  const next       = buf[N - 1]
  const projection = Array.from({ length: projLen }, (_, i) => +(next + m * (i + 1)).toFixed(2))
  
  // Update alarm state for forecasting
  let willBreach = false
  if (!suppressed) {
      willBreach = aboveBad
        ? projection.some(v => v >= threshold)
        : projection.some(v => v <= threshold)
  }
  const isCritical = !suppressed && (alarmState || willBreach)

  // ── AI → Alarm bridge ─────────────────────────────────────
  // (Removed API POST — UI will only show visual alerts without generating actual system alarms)

  // ── Chart datasets ────────────────────────────────────────
  const histDs = [...buf, ...Array(projLen).fill(null)]
  const projDs = [...Array(N - 1).fill(null), next, ...projection]
  const thrDs  = Array(N + projLen).fill(threshold)

  const lineColor = isCritical ? '#ef4444' : '#00d4aa'
  const projColor = isCritical ? '#ef4444' : '#f59e0b'

  // X-axis labels: actual HH:MM for every point (history + projected future)
  const xLabels = allTimes.map(t => toHHMM(t))

  // Relative labels for tooltip title (same length as xLabels)
  const relLabels = allTimes.map(t => toRelLabel(t, lastT))

  const chartData = {
    labels: xLabels,
    datasets: [
      { label: sensor.label,    data: histDs, borderColor: lineColor,  backgroundColor: lineColor + '10', fill: true, borderWidth: 2, tension: 0.4, pointRadius: 0 },
      { label: 'AI Projection', data: projDs, borderColor: projColor,  borderDash: [5, 4], backgroundColor: 'transparent', borderWidth: 2, tension: 0.2, pointRadius: [...Array(N).fill(0), 4, ...Array(projLen - 1).fill(2)], pointBackgroundColor: projColor },
      { label: threshLabel,     data: thrDs,  borderColor: 'rgba(239,68,68,0.4)', borderDash: [3, 3], borderWidth: 1.5, pointRadius: 0, backgroundColor: 'transparent' },
    ]
  }

  const allVals = [...buf, ...projection, threshold]
  const yPad    = 1.5
  const unit    = sensor.tag === 'CC1' ? 'mS/cm' : '°C'

  const chartOpt = {
    animation: { duration: 0 },
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0a0d17',
        titleColor: '#f1f5f9',
        bodyColor: '#8b9ab1',
        borderColor: 'rgba(0,212,170,.2)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          // Title: "15:04  ·  +5m ahead"  or  "15:00  ·  Now"
          title: (items) => {
            const idx = items[0].dataIndex
            const clockTime = xLabels[idx]
            const rel       = relLabels[idx]
            return `${clockTime}  ·  ${rel}`
          },
          // Body: show value + unit, skip null datasets
          label: (item) => {
            if (item.raw === null || item.raw === undefined) return null
            const name = item.dataset.label
            return `  ${name}: ${Number(item.raw).toFixed(2)} ${unit}`
          },
        }
      }
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: '#8b9ab1',
          font: { family: 'JetBrains Mono', size: 9 },
          maxTicksLimit: 7,
          maxRotation: 0,
          autoSkip: true,
        },
        grid: { display: false }
      },
      y: {
        min: Math.min(...allVals) - yPad,
        max: Math.max(...allVals) + yPad,
        ticks: { color: '#8b9ab1', font: { family: 'JetBrains Mono', size: 9 }, callback: v => `${v.toFixed(0)}°` },
        grid: { color: 'rgba(255,255,255,0.06)' }
      }
    }
  }

  return (
    <div className={`sparkline-tile ${suppressed ? 'tile-suppressed' : isCritical ? 'tile-critical' : 'tile-ok'}`} style={suppressed ? { opacity: 0.5, borderStyle: 'dashed' } : {}}>
      <div className="slt-header">
        <span className="asc-tag val-mono">{sensor.tag}</span>
        <span className="slt-name">
          {sensor.label}
          {suppressed && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)', padding: '2px 4px', borderRadius: 4 }}>SYSTEM IDLE</span>}
        </span>
        <div className="slt-live">
          <span className="slt-val val-mono">{next.toFixed(1)}</span>
          <span className="slt-unit">{unit}</span>
          {m >  0.01 && <TrendingUp   size={12} color="#ef4444" />}
          {m < -0.01 && <TrendingDown  size={12} color="#1C76BB" />}
        </div>
      </div>

      {cipPhaseName && (
        <div className="slt-phase-pill">
          <span className="slt-phase-name">{cipPhaseName}</span>
        </div>
      )}

      {isCritical && (
        <div className="slt-alert-bar">
          <AlertTriangle size={12} /> Threshold breach projected (10m)
        </div>
      )}

      <div className="slt-chart-wrap">
        <Line data={chartData} options={chartOpt} />
      </div>

      <div className="slt-footer">
        <span className="label-eng">LIMIT</span>
        <span className="val-mono" style={{ color: 'rgba(239,68,68,.8)', fontSize: '10px' }}>{threshold}{sensor.tag === 'CC1' ? '' : '°C'}</span>
        <span className="label-eng" style={{ marginLeft: 8 }}>TREND</span>
        <span className="val-mono" style={{ color: '#f59e0b', fontSize: '10px' }}>
          {m >= 0 ? '+' : ''}{(m * 60).toFixed(2)}{sensor.tag === 'CC1' ? '/hr' : '°C/hr'}
        </span>
      </div>
    </div>
  )
}
