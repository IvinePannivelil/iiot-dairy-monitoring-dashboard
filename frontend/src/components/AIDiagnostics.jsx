import { useState, useEffect } from 'react'
import { Cpu, AlertTriangle, CheckCircle2, Thermometer, Droplets } from 'lucide-react'
import SparklineTrendTile from './SparklineTrendTile'
import ForecastingChart from './Charts/ForecastingChart'
import { 
  pastTemps, receptionTemps, cipPhases,
  cipSupplyTempHist, pastHoldOutHistory, cipReturnTempHist, cipCondHistory,
  pastHoldInHistory, pastOutletHistory, pastMainHotHistory, pastChillHistory,
  cipHotWaterHist, cipLyeHist, cipAcidHist
} from '../data'
import { useAppContext } from '../context/AppContext'
import './AIDiagnostics.css'

// ── Critical sensor IDs (get Trend Tiles) ────────────────
const CRITICAL = new Set(['AI2', 'AI3', 'AI4', 'AI5', 'AI6', 'AI8', 'CT2', 'CT3', 'CT4', 'CT5', 'CT6', 'CC1'])

// ── Operating ranges for status checks ───────────────────
const RANGES = {
  AI1: { lo: 5,  hi: 20,  unit: '°C', threshold: 20,  aboveBad: true  },
  AI2: { lo: 55, hi: 78,  unit: '°C', threshold: 60,  aboveBad: false, threshLabel: 'Min Heating Temp (60°C)' },
  AI3: { lo: 68, hi: 80,  unit: '°C', threshold: 65,  aboveBad: false },
  AI4: { lo: 72, hi: 85,  unit: '°C', threshold: 83.5,aboveBad: true,  threshLabel: 'HH Limit (83.5°C)' },
  AI5: { lo: 4,  hi: 12,  unit: '°C', threshold: 15,  aboveBad: true  },
  AI6: { lo: 78, hi: 92,  unit: '°C', threshold: 92,  aboveBad: true  },
  AI7: { lo: 60, hi: 78,  unit: '°C', threshold: 78,  aboveBad: true  },
  AI8: { lo: 0,  hi: 5,   unit: '°C', threshold: 6,   aboveBad: true  },
  // CIP
  CT2: { lo: 75, hi: 85,  unit: '°C', threshold: 75,  aboveBad: false, threshLabel: 'Min Hot Water (75°C)' },
  CT3: { lo: 70, hi: 80,  unit: '°C', threshold: 70,  aboveBad: false, threshLabel: 'Min Lye Temp (70°C)' },
  CT4: { lo: 60, hi: 75,  unit: '°C', threshold: 60,  aboveBad: false, threshLabel: 'Min Acid Temp (60°C)' },
  CT5: { lo: 72, hi: 90,  unit: '°C', threshold: 72,  aboveBad: false, threshLabel: 'Min Supply Temp (72°C)' },
  CT6: { lo: 65, hi: 80,  unit: '°C', threshold: 65,  aboveBad: false, threshLabel: 'Min Return Temp (65°C)' },
  CC1: { lo: 0.3,hi: 2.5, unit: 'mS/cm' },
  CF1: { lo: 7000, hi: 10000, unit: 'LPH' },
  // Reception TT1–TT12
  TT1: { lo: 4,  hi: 12,  unit: '°C' }, TT2:  { lo: 45, hi: 60,  unit: '°C' },
  TT3: { lo: 42, hi: 55,  unit: '°C' }, TT4:  { lo: 40, hi: 52,  unit: '°C' },
  TT5: { lo: 38, hi: 50,  unit: '°C' }, TT6:  { lo: 40, hi: 55,  unit: '°C' },
  TT7: { lo: 38, hi: 52,  unit: '°C' },
  TT9: { lo: 2,  hi: 8,   unit: '°C' }, TT10: { lo: 2,  hi: 8,   unit: '°C' },
  TT11:{ lo: 2,  hi: 8,   unit: '°C' }, TT12: { lo: 60, hi: 75,  unit: '°C' },
}

const BASE_CIP_SENSORS = [
  { id: 'CT2', tag: 'CT2', address: 'CT2', label: 'Hot Water Tank Temp', unit: '°C' },
  { id: 'CT3', tag: 'CT3', address: 'CT3', label: 'Lye Tank Temp', unit: '°C' },
  { id: 'CT4', tag: 'CT4', address: 'CT4', label: 'Acid Tank Temp', unit: '°C' },
  { id: 'CT5', tag: 'CT5', address: 'CT5', label: 'CIP Supply Temp', unit: '°C' },
  { id: 'CT6', tag: 'CT6', address: 'CT6', label: 'CIP Return Temp', unit: '°C' },
  { id: 'CC1', tag: 'CC1', address: 'CC1', label: 'CIP Conductivity', unit: 'mS/cm' },
]

// ── Main Component ────────────────────────────────────────
export default function AIDiagnostics({ activeTab = 'all' }) {
  const { liveParams } = useAppContext()
  const [elevated, setElevated] = useState(new Set())
  const sysFilter = activeTab === 'rec' ? 'reception' : activeTab === 'past' ? 'pasteurizer' : activeTab === 'cip' ? 'cip' : 'all'

  const getLive = (addr) => liveParams[addr] !== undefined ? +liveParams[addr] : null
  
  // DYNAMIC RANGES (Rules 5 & 6)
  const getDynamicRanges = () => {
    const base = { ...RANGES }
    const cal2 = getLive('PAST_CAL_2') ?? 10
    const cal3 = getLive('PAST_CAL_3') ?? 5
    const cal6 = getLive('PAST_CAL_6') ?? 4
    const cal7 = getLive('PAST_CAL_7') ?? 5
    
    // NOTE: Base setpoints hardcoded to Recipe 1 (Milk) FSSAI standard values.
    // Hot Temp = 78°C, Out Temp = 6°C.
    // PLC is locked — dynamic setpoint reading is not possible.
    // If Recipe 2 or Recipe 3 is ever run, these values must be
    // manually updated here to match the active recipe setpoints.
    const hotBase = 78 // Default if recipe address not mapped
    const outBase = 6
    
    base.AI3 = { ...base.AI3, lo: hotBase - cal3, hi: hotBase + cal2 }
    base.AI4 = { ...base.AI4, lo: hotBase - cal3, hi: hotBase + cal2, threshold: hotBase + cal2 - 1.5 }
    base.AI5 = { ...base.AI5, lo: outBase - cal7, hi: outBase + cal6 }
    
    // NOTE: CIP alarm thresholds hardcoded to FSSAI safety limits.
    // ALM_SP array DB addresses are locked in PLC and cannot be read.
    // These limits are conservative and safe for production operation.
    // Update manually only if plant engineer officially changes CIP setpoints.
    if (getLive('CIP_ALM_SP_0') !== null) {
      base.CT2 = { ...base.CT2, lo: getLive('CIP_ALM_SP_0'), hi: getLive('CIP_ALM_SP_1') }
      base.CT3 = { ...base.CT3, lo: getLive('CIP_ALM_SP_2'), hi: getLive('CIP_ALM_SP_3') }
      base.CT4 = { ...base.CT4, lo: getLive('CIP_ALM_SP_4'), hi: getLive('CIP_ALM_SP_5') }
      base.CT5 = { ...base.CT5, lo: getLive('CIP_ALM_SP_6'), hi: getLive('CIP_ALM_SP_7') }
      base.CT6 = { ...base.CT6, lo: getLive('CIP_ALM_SP_8'), hi: getLive('CIP_ALM_SP_9') }
    }
    return base
  }
  const dynamicRanges = getDynamicRanges()

  const isInAlarm = (tag, value) => {
    const r = dynamicRanges[tag]
    if (!r || r.lo == null) return false
    return value < r.lo || value > r.hi
  }

  // Condensed Card logic and non-critical sensor elevation removed per user request.

  const mapLive = (arr) => arr.map(s => {
    const val = getLive(s.address)
    return { ...s, value: val !== null ? val : null }
  }).filter(s => s.value !== null)

  const livePastTemps = mapLive(pastTemps)
  const liveRecTemps = mapLive(receptionTemps)
  const liveCipSensors = mapLive(BASE_CIP_SENSORS)

  const historyLookup = {
    AI3: pastHoldInHistory,
    AI4: pastHoldOutHistory,
    AI5: pastOutletHistory,
    AI6: pastMainHotHistory,
    AI8: pastChillHistory,
    CT2: cipHotWaterHist,
    CT3: cipLyeHist,
    CT4: cipAcidHist,
    CT5: cipSupplyTempHist,
    CT6: cipReturnTempHist,
    CC1: cipCondHistory,
  }

  // Elevation logic removed.

  // Current CIP phase name for CT5/CT6 badge — live from %DB1.DBW2466
  const cipStepLive    = liveParams['%DB1.DBW2466'] !== undefined ? +liveParams['%DB1.DBW2466'] : 0
  const activeCipPhase = cipStepLive >= 30
    ? cipPhases.find(p => cipStepLive >= p.start && cipStepLive <= p.end)
    : null

  // Suppression logic removed — all valid sensors are now actively rendered without dimming

  // Only process critical sensors for AI tiles
  const pastCritical = livePastTemps.filter(s => CRITICAL.has(s.tag))
  const cipCritical  = liveCipSensors

  // Count total anomalies for header badge (only count if it's a number and it's a visible critical sensor)
  const anomalyCount = [...pastCritical, ...cipCritical].filter(s => typeof s.value === 'number' && isInAlarm(s.tag, s.value)).length

  const showPast = sysFilter === 'all' || sysFilter === 'pasteurizer'
  const showRec  = sysFilter === 'all' || sysFilter === 'reception'
  const showCip  = sysFilter === 'all' || sysFilter === 'cip'

  return (
    <div className="aid-root">

      {/* ── Header ── */}
      <div className="diagnostics-header">
        <div className="header-title-block">
          <Cpu className="header-icon" size={22} />
          <h2 className="section-title">AI Diagnostics — Anomaly &amp; Forecasting Engine</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {anomalyCount > 0
            ? <div className="pred-badge badge-warning"><AlertTriangle size={13} /> {anomalyCount} Alarm{anomalyCount > 1 ? 's' : ''} Active</div>
            : <div className="pred-badge badge-ok"><CheckCircle2 size={13} /> All Systems Normal</div>
          }
        </div>
      </div>



      {/* ══ ROW 1: TREND TILES (Critical Sensors) ══════════════ */}
      {(showPast || showCip) && (
        <div className="aid-section glass-panel">
          <div className="aid-section-head">
            <Thermometer size={15} color="#f59e0b" />
            <h3>AI Trend Tiles — Critical Sensors</h3>
            <span className="label-eng" style={{ fontSize: 10, marginLeft: 8 }}>Dashed line = AI Projection · Red border = Threshold breach imminent</span>
          </div>

          <div className="sparkline-tiles-row">
            {/* Pasteurizer Critical */}
            {showPast && pastCritical.map(s => {
              const r = dynamicRanges[s.tag] || {}
              const label = r.threshLabel ? `${r.threshLabel} (UI Advisory)` : 'Threshold (UI Advisory)'
              return (
                <SparklineTrendTile
                  key={s.tag}
                  sensor={s}
                  address={s.address}
                  threshold={r.threshold}
                  threshLabel={label}
                  aboveBad={r.aboveBad}
                  suppressed={false}
                />
              )
            })}

            {/* CIP Critical with phase overlay */}
            {showCip && cipCritical.map(s => {
              const r = dynamicRanges[s.tag] || {}
              const label = r.threshLabel ? `${r.threshLabel} (UI Advisory)` : 'Threshold (UI Advisory)'
              return (
                <SparklineTrendTile
                  key={s.tag}
                  sensor={s}
                  address={s.address}
                  threshold={r.threshold}
                  threshLabel={label}
                  aboveBad={r.aboveBad}
                  suppressed={false}
                />
              )
            })}

            {/* Auto-elevated non-critical sensors logic removed */}
          </div>
        </div>
      )}


      {/* ══ ROW 3: CIP ═══════════════════════════════════════ */}
    </div>
  )
}
