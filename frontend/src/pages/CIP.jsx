import { useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Activity, Thermometer, Wand2, Zap, Database, Settings2 } from 'lucide-react'
import {
  cipAnalogs, cipTanks, cipValves, cipVFD, cipTankLevelTags,
  cipTotalSteps, cipPhases,
  cipTempChartOpts, chartDefaults, getColorDim, getLiveTimeLabels
} from '../data'
import TankLevelWidget from '../components/TankLevelWidget'
import { useAppContext } from '../context/AppContext'
import './CIP.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function CIP() {
  const { liveParams, historyParams } = useAppContext()

  const getLive = (addr, fallback = 0) => liveParams[addr] !== undefined ? +liveParams[addr] : fallback
  const getHistory = (addr) => historyParams[addr] || Array(120).fill(null)

  const liveLabels = getLiveTimeLabels()

  const tempChartData = {
    labels: liveLabels,
    datasets: [
      { label: 'Hot Water Tank (CT2)', data: getHistory('CT2'), borderColor: '#f97316', tension: 0.4, pointRadius: 0 },
      { label: 'Lye Tank (CT3)', data: getHistory('CT3'), borderColor: '#8b5cf6', tension: 0.4, pointRadius: 0 },
      { label: 'Acid Tank (CT4)', data: getHistory('CT4'), borderColor: '#ec4899', tension: 0.4, pointRadius: 0 },
      { label: 'Supply Temp (CT5)', data: getHistory('CT5'), borderColor: '#ef4444', tension: 0.4, pointRadius: 0 },
      { label: 'Return Temp (CT6)', data: getHistory('CT6'), borderColor: '#1C76BB', tension: 0.4, pointRadius: 0 },
    ]
  }

  const condChartData = {
    labels: liveLabels,
    datasets: [
      {
        label: 'Conductivity (mS/cm)', data: getHistory('CC1'),
        borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.1)',
        fill: true, tension: 0.4, pointRadius: 0
      }
    ]
  }

  const condChartOpts = {
    ...chartDefaults,
    animation: { duration: 0 },
    scales: {
      ...chartDefaults.scales,
      y: { ...chartDefaults.scales.y, min: 0, max: 5, title: { display: true, text: 'mS/cm', color: getColorDim, font: { size: 10 } } },
    },
  }
  
  const getValveLive = (tag) => {
    const v = cipValves.find(v => v.tag === tag);
    return v ? getLive(v.address) === 1 : false;
  }

  // Pre-fetch level tags to map to tanks
  const hwHigh = cipTankLevelTags.find(t => t.id === 'HW_HIGH')
  const hwLow  = cipTankLevelTags.find(t => t.id === 'HW_LOW')
  const lyeHigh= cipTankLevelTags.find(t => t.id === 'LYE_HIGH')
  const lyeLow = cipTankLevelTags.find(t => t.id === 'LYE_LOW')
  const acidHigh= cipTankLevelTags.find(t => t.id === 'ACID_HIGH')
  const acidLow = cipTankLevelTags.find(t => t.id === 'ACID_LOW')

  return (
    <main className="page-container cip-page">
      <div className="section-head">
        <h1 className="section-title">SYSTEM 3 — CLEAN-IN-PLACE</h1>
      </div>

      <div className="reception-grid">
        
        {/* Row 1: Storage Tank Status */}
        <div className="glass-panel rec-tank-section">
          <div className="rts-header">
             <div className="rts-icon"><Database size={18} /></div>
             <h3 className="section-subtitle">CIP TANK FARM STATUS</h3>
          </div>

          <div className="rts-tanks">
             {/* Hot Water Tank */}
             <div className="tank-col">
               <TankLevelWidget 
                  name="HOT WATER" 
                  high={getLive(hwHigh?.address) === 1} 
                  low={getLive(hwLow?.address) === 1} 
                  tempValue={getLive('CT2')} 
                  outletOpen={getValveLive('BFV_3')}
                  inletOpen={getValveLive('BFV_11')}
               />

             </div>

             {/* Lye Tank */}
             <div className="tank-col">
               <TankLevelWidget 
                  name="LYE TANK" 
                  high={getLive(lyeHigh?.address) === 1} 
                  low={getLive(lyeLow?.address) === 1} 
                  tempValue={getLive('CT3')} 
                  outletOpen={getValveLive('BFV_4')}
                  inletOpen={getValveLive('BFV_12')}
               />

             </div>
             
             {/* Acid Tank */}
             <div className="tank-col">
               <TankLevelWidget 
                  name="ACID TANK" 
                  high={getLive(acidHigh?.address) === 1} 
                  low={getLive(acidLow?.address) === 1} 
                  tempValue={getLive('CT4')} 
                  outletOpen={getValveLive('BFV_5')}
                  inletOpen={getValveLive('BFV_13')}
               />

             </div>

             {/* Binary Tags List (Optional space filler for layout consistency) */}
             <div className="rts-binary-list" style={{ flex: 0.8 }}>
                {cipTankLevelTags.map(t => (
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
            <span className="tot-tag">SUPPLY_FLOW (CF1)</span>
            <span className="tot-val">{(liveParams['CF1'] != null ? Number(liveParams['CF1']).toLocaleString() : '—')}</span>
            <div className="tot-bottom">
              <span className="tot-unit">LPH</span>
              <span className="tot-label">Supply Flow</span>
            </div>
          </div>
          <div className="tot-card glass-panel">
            <span className="tot-tag">CONDUCTIVITY (CC1)</span>
            <span className="tot-val">{(liveParams['CC1'] != null ? Number(liveParams['CC1']).toFixed(2) : '—')}</span>
            <div className="tot-bottom">
              <span className="tot-unit">mS/cm</span>
              <span className="tot-label">Return Conductivity</span>
            </div>
          </div>
          <div className="tot-card glass-panel">
            <span className="tot-tag">SUPPLY_TEMP (CT5)</span>
            <span className="tot-val">{(liveParams['CT5'] != null ? Number(liveParams['CT5']).toFixed(1) : '—')}</span>
            <div className="tot-bottom">
              <span className="tot-unit">°C</span>
              <span className="tot-label">Supply Temp</span>
            </div>
          </div>
          <div className="tot-card glass-panel">
            <span className="tot-tag">RETURN_TEMP (CT6)</span>
            <span className="tot-val">{(liveParams['CT6'] != null ? Number(liveParams['CT6']).toFixed(1) : '—')}</span>
            <div className="tot-bottom">
              <span className="tot-unit">°C</span>
              <span className="tot-label">Return Temp</span>
            </div>
          </div>
        </div>

        {/* Row 3: Small Metric Cards */}
        <div className="metrics-grid">
          <div className="m-card glass-panel">
            <Thermometer size={16} color="#f97316" />
            <div className="m-info">
              <span>HOT WATER TANK (CT2)</span>
              <strong className="numeric">{(liveParams['CT2'] != null ? Number(liveParams['CT2']).toFixed(1) : '—')} <small>°C</small></strong>
            </div>
          </div>
          <div className="m-card glass-panel">
            <Thermometer size={16} color="#8b5cf6" />
            <div className="m-info">
              <span>LYE TANK (CT3)</span>
              <strong className="numeric">{(liveParams['CT3'] != null ? Number(liveParams['CT3']).toFixed(1) : '—')} <small>°C</small></strong>
            </div>
          </div>
          <div className="m-card glass-panel">
            <Thermometer size={16} color="#ec4899" />
            <div className="m-info">
              <span>ACID TANK (CT4)</span>
              <strong className="numeric">{(liveParams['CT4'] != null ? Number(liveParams['CT4']).toFixed(1) : '—')} <small>°C</small></strong>
            </div>
          </div>
          
          <div className="m-card glass-panel vfd-card">
            <Zap size={16} color={getLive(cipVFD.CIP_VFD_RUN.address) === 1 ? '#00d4aa' : '#8b9ab1'} />
            <div className="m-info">
              <span>CIP PUMP VFD SP</span>
              <strong className="numeric">{(liveParams[cipVFD.CIP_VFD_SP.address] != null ? Number(liveParams[cipVFD.CIP_VFD_SP.address]).toFixed(1) : '—')} <small>Hz</small></strong>
            </div>
            <div className="vfd-feedback">
              <span>STATUS <strong className={`numeric ${getLive(cipVFD.CIP_VFD_RUN.address) === 1 ? 'val-green' : ''}`}>{getLive(cipVFD.CIP_VFD_RUN.address) === 1 ? 'RUNNING' : 'STOPPED'}</strong></span>
              {getLive(cipVFD.CIP_VFD_TRIP.address) === 1 && <span className="eq-badge trip">TRIP</span>}
            </div>
          </div>
          
          {/* Fill the remaining 2 slots in the 6-col grid with key valves */}
          <div className="m-card glass-panel">
            <Settings2 size={16} color="#1C76BB" />
            <div className="m-info">
              <span>SUPPLY VALVE (BFV 6)</span>
              <strong className="numeric">{getValveLive('BFV_6') ? 'OPEN' : 'CLOSED'}</strong>
            </div>
          </div>
          <div className="m-card glass-panel">
            <Settings2 size={16} color="#1C76BB" />
            <div className="m-info">
              <span>RETURN VALVE (BFV 8)</span>
              <strong className="numeric">{getValveLive('BFV_8') ? 'OPEN' : 'CLOSED'}</strong>
            </div>
          </div>
        </div>

        {/* Row 4: Live Profile Charts (Side by Side) */}
        <div className="cip-charts-row">
          <div className="profile-chart-container glass-panel">
            <div className="pc-head">
              <div className="pch-left">
                <h3>CIP TEMPERATURES — TREND</h3>
              </div>
            </div>
            <div className="c-wrap" style={{ height: '300px' }}>
              <Line data={tempChartData} options={{...cipTempChartOpts, animation: { duration: 0 }}} />
            </div>
          </div>
          
          <div className="profile-chart-container glass-panel">
            <div className="pc-head">
              <div className="pch-left">
                <h3>RETURN CONDUCTIVITY TRACKER</h3>
              </div>
            </div>
            <div className="c-wrap" style={{ height: '300px' }}>
              <Line data={condChartData} options={condChartOpts} />
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
