import { useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Activity, Thermometer, Droplets, Gauge, BarChart3, Clock, Database } from 'lucide-react'
import {
  receptionTemps, receptionTotalizerCards, receptionTanks, receptionLevelTags,
  chartDefaults, receptionProcessSteps, receptionTotals, getLiveTimeLabels
} from '../data'
import TankLevelWidget from '../components/TankLevelWidget'
import { useAppContext } from '../context/AppContext'
import './Reception.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function Reception() {
  const { liveParams, historyParams } = useAppContext()
  const [activeTrends, setActiveTrends] = useState(['TT1'])

  const getLive = (addr, fallback = 0) => liveParams[addr] !== undefined ? +liveParams[addr] : fallback
  const getHistory = (addr) => historyParams[addr] || Array(120).fill(null)

  const liveLabels = getLiveTimeLabels()

  const chartData = {
    labels: liveLabels,
    datasets: [
      {
        label: 'Reception Flow (LPH)',
        data: getHistory('FM1'),
        borderColor: '#1C76BB', backgroundColor: 'rgba(28,118,187,.1)',
        fill: true, tension: 0.4, pointRadius: 0, yAxisID: 'y'
      },
      ...activeTrends.map((trend, idx) => {
        const colorPalette = ['#00d4aa', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];
        const color = colorPalette[idx % colorPalette.length];
        const sensorDef = receptionTemps.find(t => t.tag === trend);
        return {
          label: `${sensorDef ? sensorDef.label : 'Unknown Temp'} (${trend})`,
          data: getHistory(sensorDef?.address),
          borderColor: color, backgroundColor: color + '10',
          fill: false, tension: 0.4, pointRadius: 0, yAxisID: 'y1'
        }
      })
    ]
  }

  const chartOptions = {
    ...chartDefaults,
    spanGaps: false,
    animation: { duration: 0 },
    scales: {
      x: chartDefaults.scales.x,
      y: {
        type: 'linear', display: true, position: 'left',
        min: 0, max: 20000,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${(v/1000).toFixed(0)}k` },
        title: { display: true, text: 'Flow (LPH)', color: '#8b9ab1', font: { size: 10 } }
      },
      y1: {
        type: 'linear', display: true, position: 'right',
        min: 0, max: 80,
        grid: { drawOnChartArea: false },
        ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}°C` },
        title: { display: true, text: 'Temp (°C)', color: '#8b9ab1', font: { size: 10 } }
      }
    }
  }

  return (
    <main className="page-container reception-page">
      <div className="section-head">
        <h1 className="section-title">SYSTEM 1 — MILK RECEPTION</h1>
      </div>

      <div className="reception-grid">
        
        {/* Row 1: Storage Tank Status */}
        <div className="glass-panel rec-tank-section">
          <div className="rts-header">
             <div className="rts-icon"><Database size={18} /></div>
             <h3 className="section-subtitle">STORAGE TANK STATUS (RCM &amp; RMST)</h3>
             
             {/* Routing Pills */}
             <div className="rts-routing-pills">
                <div className={`routing-pill ${getLive(receptionTanks.unloadTankRCM.address) ? 'active' : ''}`}>
                  <div className="rp-dot"></div> RCM Unload Active
                </div>
                <div className={`routing-pill ${getLive(receptionTanks.unloadTankRMST.address) ? 'active' : ''}`}>
                  <div className="rp-dot"></div> RMST Unload Active
                </div>
                <div className={`routing-pill ${getLive(receptionTanks.destRcmTank.address) ? 'active' : ''}`}>
                  <div className="rp-dot"></div> RCM Sep. Dest
                </div>
                <div className={`routing-pill ${getLive(receptionTanks.destRmstTank.address) ? 'active' : ''}`}>
                  <div className="rp-dot"></div> RMST Sep. Dest
                </div>
             </div>
          </div>

          <div className="rts-tanks">
             <div className="tank-col">
               <TankLevelWidget name="RCM TANK" high={getLive('RCM_HIGH') === 1} low={getLive('RCM_LOW') === 1} tempValue={getLive('RCM_TEMP')} tempLabel="Tank Outlet Temp" />
             </div>
             <div className="tank-col">
               <TankLevelWidget name="RMST TANK" high={getLive('RMST_HIGH') === 1} low={getLive('RMST_LOW') === 1} tempValue={getLive('RMST_TEMP')} tempLabel="Tank Outlet Temp" />
             </div>
             
             {/* Binary Tags List */}
             <div className="rts-binary-list">
                {receptionLevelTags.map(t => (
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
            <span className="tot-tag">TOT_RECEPTION</span>
            <span className="tot-val">{liveParams['TOT_RECEPTION'] != null ? Number(liveParams['TOT_RECEPTION']).toLocaleString() : '—'}</span>
            <div className="tot-bottom">
              <span className="tot-unit">L</span>
              <span className="tot-label">Tot Reception</span>
            </div>
          </div>
          <div className="tot-card glass-panel">
            <span className="tot-tag">TOT_WATER_FLUSH</span>
            <span className="tot-val">{liveParams['TOT_WATER_FLUSH'] != null ? Number(liveParams['TOT_WATER_FLUSH']).toLocaleString() : '—'}</span>
            <div className="tot-bottom">
              <span className="tot-unit">L</span>
              <span className="tot-label">Water Flush Total</span>
            </div>
          </div>
          <div className="tot-card glass-panel">
            <span className="tot-tag">RMST_OUT_SP</span>
            <span className="tot-val">{liveParams['RMST_OUT_SP'] != null ? Number(liveParams['RMST_OUT_SP']).toLocaleString() : '—'}</span>
            <div className="tot-bottom">
              <span className="tot-unit">LPH</span>
              <span className="tot-label">RMST Out Flow SP</span>
            </div>
          </div>
          <div className="tot-card glass-panel">
            <span className="tot-tag">RECEP_FLOW_SP</span>
            <span className="tot-val">{liveParams['RECEP_FLOW_SP'] != null ? Number(liveParams['RECEP_FLOW_SP']).toLocaleString() : '—'}</span>
            <div className="tot-bottom">
              <span className="tot-unit">LPH</span>
              <span className="tot-label">Reception Flow SP</span>
            </div>
          </div>
        </div>

        {/* Row 3: 6 Small Metric Cards */}
        <div className="metrics-grid">
          <div className="m-card glass-panel">
            <Droplets size={16} color="#1C76BB" />
            <div className="m-info">
              <span>RECEPTION FLOW</span>
              <strong className="numeric">{(liveParams['FM1'] != null ? Number(liveParams['FM1']).toLocaleString() : '—')} <small>LPH</small></strong>
            </div>
          </div>
          <div className="m-card glass-panel">
            <Droplets size={16} color="#00d4aa" />
            <div className="m-info">
              <span>SEPARATION FLOW</span>
              <strong className="numeric">{(liveParams['FM2'] != null ? Number(liveParams['FM2']).toLocaleString() : '—')} <small>LPH</small></strong>
            </div>
          </div>
          <div className="m-card glass-panel vfd-card">
            <Activity size={16} color="#f59e0b" />
            <div className="m-info">
              <span>VFD 1 SPEED SETPOINT</span>
              <strong className="numeric">{(liveParams['VFD1_SP'] != null ? Number(liveParams['VFD1_SP']).toFixed(1) : '—')} <small>Hz</small></strong>
            </div>
            <div className="vfd-feedback">
              <span>ACTUAL <strong className="numeric val-green">{(liveParams['VFD1_HZ'] != null ? Number(liveParams['VFD1_HZ']).toFixed(1) : '—')} Hz</strong></span>
            </div>
          </div>
          <div className="m-card glass-panel vfd-card">
            <Activity size={16} color="#f59e0b" />
            <div className="m-info">
              <span>VFD 2 SPEED SETPOINT</span>
              <strong className="numeric">{(liveParams['VFD2_SP'] != null ? Number(liveParams['VFD2_SP']).toFixed(1) : '—')} <small>Hz</small></strong>
            </div>
            <div className="vfd-feedback">
              <span>ACTUAL <strong className="numeric val-green">{(liveParams['VFD2_HZ'] != null ? Number(liveParams['VFD2_HZ']).toFixed(1) : '—')} Hz</strong></span>
            </div>
          </div>
        </div>

        {/* Row 4: Live Profile Chart */}
        <div className="profile-chart-container glass-panel">
          <div className="pc-head">
            <div className="pch-left">
              <h3>UNLOADING PROFILE — FLOW VS TEMP</h3>
            </div>
            <div className="pch-right">
              {receptionTemps.map(t => {
                const isActive = activeTrends.includes(t.tag)
                return (
                  <button 
                    key={t.tag} 
                    className={`trend-btn ${isActive ? 'active' : ''}`} 
                    onClick={() => {
                      if (isActive) {
                        if (activeTrends.length > 1) setActiveTrends(prev => prev.filter(x => x !== t.tag))
                      } else {
                        setActiveTrends(prev => [...prev, t.tag])
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
               <span>RECEPTION TOTAL</span>
               <strong>{liveParams['TOT_RECEPTION'] != null ? Number(liveParams['TOT_RECEPTION']).toLocaleString() : '—'} L</strong>
             </div>
             <div className="cf-total">
               <span>WATER FLUSH</span>
               <strong>{liveParams['TOT_WATER_FLUSH'] != null ? Number(liveParams['TOT_WATER_FLUSH']).toLocaleString() : '—'} L</strong>
             </div>
             <div className="cf-total">
               <span>RECEP FLOW SP</span>
               <strong>{liveParams['RECEP_FLOW_SP'] != null ? Number(liveParams['RECEP_FLOW_SP']).toLocaleString() : '—'} LPH</strong>
             </div>
          </div>
        </div>

      </div>
    </main>
  )
}
