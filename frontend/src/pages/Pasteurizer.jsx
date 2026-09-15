import { useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Activity, Thermometer, Droplets, Gauge, BarChart3, Clock, Database, Settings2 } from 'lucide-react'
import {
  pastTemps, pastOutputs, pastLevelTags,
  pastRecipeTypes, pastCycleLabels,
  chartDefaults, getLiveTimeLabels
} from '../data'
import TankLevelWidget from '../components/TankLevelWidget'
import { useAppContext } from '../context/AppContext'
import './Pasteurizer.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function Pasteurizer() {
  const { liveParams, historyParams } = useAppContext()
  const [focusedSensors, setFocusedSensors] = useState(['AI4']) // Default to Holding Out Temp

  const getLive = (addr, fallback = 0) => liveParams[addr] !== undefined ? +liveParams[addr] : fallback
  const getHistory = (addr) => historyParams[addr] || Array(120).fill(null)

  const liveLabels = getLiveTimeLabels()

  const chartDatasets = focusedSensors.map((tag, idx) => {
    const sensorDef = pastTemps.find(t => t.tag === tag)
    if (!sensorDef) return null
    
    const hist = getHistory(sensorDef.address)
    const colorPalette = ['#ef4444', '#1C76BB', '#00d4aa', '#f59e0b', '#8b5cf6', '#ec4899']
    const color = colorPalette[idx % colorPalette.length]

    return { 
      label: `${sensorDef.label} (${tag})`, 
      data: hist, 
      borderColor: color, 
      backgroundColor: color + '10',
      fill: true,
      tension: 0.4, 
      pointRadius: 0 
    }
  }).filter(Boolean)

  const chartData = {
    labels: liveLabels,
    datasets: chartDatasets
  }

  const chartOptions = {
    ...chartDefaults,
    animation: { duration: 0 },
    scales: {
      ...chartDefaults.scales,
      y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  }

  return (
    <main className="page-container pasteurizer-page">
      <div className="section-head">
        <h1 className="section-title">SYSTEM 2 — PASTEURISER</h1>
      </div>

      <div className="reception-grid">
        
        {/* Row 1: Storage Tank Status */}
        <div className="glass-panel rec-tank-section">
          <div className="rts-header">
             <div className="rts-icon"><Database size={18} /></div>
             <h3 className="section-subtitle">STORAGE TANK STATUS (BT &amp; PMST)</h3>
          </div>

          <div className="rts-tanks">
             <div className="tank-col">
               <TankLevelWidget name="BALANCE TANK" high={getLive('BT_HIGH') === 1} low={getLive('BT_LOW') === 1} tempValue={getLive('AI1')} />
             </div>
             <div className="tank-col">
               <TankLevelWidget name="PMST TANK" high={getLive('PMST_HIGH') === 1} low={getLive('PMST_LOW') === 1} tempValue={getLive('AI5')} />
             </div>
             
             {/* Binary Tags List */}
             <div className="rts-binary-list">
                {pastLevelTags.map(t => (
                  <div key={t.id} className="bin-row">
                    <span>{t.id}</span>
                    <div className={`bin-dot ${getLive(t.address) === 1 ? 'active' : ''}`}></div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Row 2: 4 Large Metric Cards */}
        <div className="rec-totalizer-row">
          <div className="tot-card glass-panel">
            <span className="tot-tag">PAST_FLOW</span>
            <span className="tot-val">{(liveParams['AI9'] != null ? Number(liveParams['AI9']).toLocaleString() : '—')}</span>
            <div className="tot-bottom">
              <span className="tot-unit">LPH</span>
              <span className="tot-label">Pasteurizer Flow</span>
            </div>
          </div>
          <div className="tot-card glass-panel">
            <span className="tot-tag">HOLD_OUT_TEMP</span>
            <span className="tot-val">{(liveParams['AI4'] != null ? Number(liveParams['AI4']).toFixed(1) : '—')}</span>
            <div className="tot-bottom">
              <span className="tot-unit">°C</span>
              <span className="tot-label">Holding Out Temp</span>
            </div>
          </div>
          <div className="tot-card glass-panel">
            <span className="tot-tag">MAIN_HOT_WTR</span>
            <span className="tot-val">{(liveParams['AI6'] != null ? Number(liveParams['AI6']).toFixed(1) : '—')}</span>
            <div className="tot-bottom">
              <span className="tot-unit">°C</span>
              <span className="tot-label">Main Hot Water</span>
            </div>
          </div>
          <div className="tot-card glass-panel">
            <span className="tot-tag">SUPPLY_PUMP_VFD</span>
            <span className="tot-val">{(liveParams['AO1'] != null ? Number(liveParams['AO1']).toFixed(1) : '—')}</span>
            <div className="tot-bottom">
              <span className="tot-unit">%</span>
              <span className="tot-label">Supply Pump VFD</span>
            </div>
          </div>
        </div>

        {/* Row 3: 6 Small Metric Cards */}
        <div className="metrics-grid">
          <div className="m-card glass-panel">
            <Thermometer size={16} color="#1C76BB" />
            <div className="m-info">
              <span>PRODUCT INLET</span>
              <strong className="numeric">{(liveParams['AI1'] != null ? Number(liveParams['AI1']).toFixed(1) : '—')} <small>°C</small></strong>
            </div>
          </div>
          <div className="m-card glass-panel">
            <Thermometer size={16} color="#00d4aa" />
            <div className="m-info">
              <span>HOMOGENISER INLET</span>
              <strong className="numeric">{(liveParams['AI2'] != null ? Number(liveParams['AI2']).toFixed(1) : '—')} <small>°C</small></strong>
            </div>
          </div>
          <div className="m-card glass-panel">
            <Thermometer size={16} color="#f59e0b" />
            <div className="m-info">
              <span>HOLDING INLET</span>
              <strong className="numeric">{(liveParams['AI3'] != null ? Number(liveParams['AI3']).toFixed(1) : '—')} <small>°C</small></strong>
            </div>
          </div>
          <div className="m-card glass-panel">
            <Thermometer size={16} color="#ef4444" />
            <div className="m-info">
              <span>PRE HOT WATER</span>
              <strong className="numeric">{(liveParams['AI7'] != null ? Number(liveParams['AI7']).toFixed(1) : '—')} <small>°C</small></strong>
            </div>
          </div>
          <div className="m-card glass-panel">
            <Thermometer size={16} color="#5BC5F2" />
            <div className="m-info">
              <span>CHILLED WATER INLET</span>
              <strong className="numeric">{(liveParams['AI8'] != null ? Number(liveParams['AI8']).toFixed(1) : '—')} <small>°C</small></strong>
            </div>
          </div>
          <div className="m-card glass-panel vfd-card">
            <Settings2 size={16} color="#f59e0b" />
            <div className="m-info">
              <span>MAIN HEATER STEAM</span>
              <strong className="numeric">{(liveParams['AO2'] != null ? Number(liveParams['AO2']).toFixed(1) : '—')} <small>%</small></strong>
            </div>
            <div className="vfd-feedback">
              <span>CTRL VALVE <strong className="numeric val-green">AO2</strong></span>
            </div>
          </div>
        </div>

        {/* Row 4: Live Profile Chart */}
        <div className="profile-chart-container glass-panel">
          <div className="pc-head">
            <div className="pch-left">
              <h3>TEMPERATURE PROFILE — TREND</h3>
            </div>
            <div className="pch-right">
              {pastTemps.filter(t => t.tag !== 'AI9').map(t => {
                const isActive = focusedSensors.includes(t.tag)
                return (
                  <button 
                    key={t.tag} 
                    className={`trend-btn ${isActive ? 'active' : ''}`} 
                    onClick={() => {
                      if (isActive) {
                        if (focusedSensors.length > 1) setFocusedSensors(prev => prev.filter(x => x !== t.tag))
                      } else {
                        setFocusedSensors(prev => [...prev, t.tag])
                      }
                    }}
                  >
                    {t.tag}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="c-wrap" style={{ height: '350px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
          
          <div className="chart-footer-totals">
             <div className="cf-total">
               <span>PASTEURIZER FLOW</span>
               <strong>{(liveParams['AI9'] != null ? Number(liveParams['AI9']).toLocaleString() : '—')} LPH</strong>
             </div>
             <div className="cf-total">
               <span>HOLDING OUT</span>
               <strong>{(liveParams['AI4'] != null ? Number(liveParams['AI4']).toFixed(1) : '—')} °C</strong>
             </div>
             <div className="cf-total">
               <span>HOLDING IN</span>
               <strong>{(liveParams['AI3'] != null ? Number(liveParams['AI3']).toFixed(1) : '—')} °C</strong>
             </div>
          </div>
        </div>

      </div>
    </main>
  )
}
