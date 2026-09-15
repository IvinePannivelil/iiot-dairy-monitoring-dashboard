import { useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend,
} from 'chart.js'
import { Line, Bar, Pie, Radar } from 'react-chartjs-2'
import { Layers, Download } from 'lucide-react'
import {
  cipCondHistory,
  pastHoldOutHistory, pastInletHistory, pastOutletHistory, pastMainHotHistory, pastFlowHistory,
  receptionFlowHistory, getLiveTimeLabels,
  chartDefaults, noAxisOpts,
  getColorBorder, getColorDim
} from '../data'
import AIDiagnostics from '../components/AIDiagnostics'
import { useAppContext } from '../context/AppContext'
import './Analytics.css'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend
)

const areaLine = (label, data, color) => ({
  label, data, borderColor: color, backgroundColor: color + '18',
  fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5,
})

export default function Analytics() {
  const { liveParams, historyParams } = useAppContext()
  const getHistory = (addr) => historyParams[addr] || Array(120).fill(null)
  const getLive = (addr, fallback = 0) => liveParams[addr] !== undefined && liveParams[addr] !== null ? Number(liveParams[addr]) : fallback

  const [sysTab, setSysTab] = useState('all') // all, rec, past, cip
  const [timeFilter, setTimeFilter] = useState('daily') // daily, weekly, monthly

  /* ── 1. Multi-System Correlation (All) ─────────────────── */
  const liveLabels = getLiveTimeLabels()
  const multiSystemData = {
    labels: liveLabels,
    datasets: [
      ...(sysTab === 'all' || sysTab === 'rec' ? [{ ...areaLine('Reception Flow (LPH/100)', getHistory('FM1').map(v => v/100), '#1C76BB') }] : []),
      ...(sysTab === 'all' || sysTab === 'past' ? [{ ...areaLine('Pasteurizer Temp (°C)', getHistory('AI4'), '#ef4444'), yAxisID: 'y1' }] : []),
      ...(sysTab === 'all' || sysTab === 'cip' ? [{ ...areaLine('CIP Conductivity (mS/cm×10)', getHistory('CC1').map(v => v*10), '#f59e0b'), yAxisID: 'y2' }] : []),
    ],
  }
  const multiSystemOpts = {
    ...chartDefaults,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: chartDefaults.scales.x,
      y:  { ...chartDefaults.scales.y, position: 'left' },
      y1: { ...chartDefaults.scales.y, position: 'right', grid: { drawOnChartArea: false } },
      y2: { ...chartDefaults.scales.y, position: 'right', grid: { display: false }, display: sysTab === 'all' || sysTab === 'cip' },
    },
  }

  /* ── 2. Pasteurizer Performance Profile ─────────────────────── */
  const pastProfileData = {
    labels: liveLabels,
    datasets: [
      { ...areaLine('Product In (°C)', getHistory('AI1'), '#5BC5F2'), yAxisID: 'yCold' },
      { ...areaLine('Product Out (°C)', getHistory('AI5'), '#3b82f6'), yAxisID: 'yCold' },
      { ...areaLine('Holding Out (°C)', getHistory('AI4'), '#ef4444'), yAxisID: 'yHot' },
      { ...areaLine('Hot Water (°C)', getHistory('AI6'), '#f97316'), yAxisID: 'yHot' },
      { ...areaLine('Flow Rate (LPH/100)', getHistory('AI9').map(f => f/100), '#8b5cf6'), yAxisID: 'yFlow' }
    ]
  }
  const pastProfileOpts = {
    ...chartDefaults,
    scales: {
      x: chartDefaults.scales.x,
      yCold: { ...chartDefaults.scales.y, position: 'left', title: { display: true, text: 'Cold Temps (°C)' } },
      yHot: { ...chartDefaults.scales.y, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Hot Temps (°C)' } },
      yFlow: { ...chartDefaults.scales.y, position: 'right', grid: { display: false }, title: { display: true, text: 'Flow (LPH)' }, display: false },
    }
  }

  /* ── 3. CIP Live Parameters (Bar) ─────────────────────────── */
  const cipBarData = {
    labels: ['Hot Water', 'Lye Temp', 'Acid Temp', 'Flow (×1k)', 'Cond (×10)'],
    datasets: [{
      label: 'Live Value',
      data: [
        getLive('CT2', 0), 
        getLive('CT3', 0), 
        getLive('CT4', 0), 
        getLive('CF1', 0) / 1000, 
        getLive('CC1', 0) * 10
      ],
      backgroundColor: ['#ef444499', '#1C76BB99', '#6CBE4599', '#f59e0b99', '#5BC5F299'],
      borderColor: ['#ef4444', '#1C76BB', '#6CBE45', '#f59e0b', '#5BC5F2'],
      borderWidth: 1.5, borderRadius: 8,
    }],
  }

  /* ── 4. Reception Yield (Pie) ──────────────────────── */
  const pieCfg = {
    labels: ['Milk Received (L)', 'Water Flushed (L)'],
    datasets: [{
      data: [getLive('TOT_RECEPTION', 0), getLive('TOT_WATER_FLUSH', 0)],
      backgroundColor: ['#1C76BB', '#5BC5F2'],
      borderWidth: 0,
    }],
  }

  /* ── 5. System Health Radar ────────────────────────── */
  const countAlarms = (prefix) => Object.keys(liveParams).filter(k => k.startsWith(prefix) && liveParams[k] === 1).length;
  
  const recHealth = Math.max(0, 100 - (countAlarms('REC_ALM_') * 10));
  const pastHealth = Math.max(0, 100 - (countAlarms('PAST_ALM_') * 10));
  const cipHealth = Math.max(0, 100 - (countAlarms('CIP_ALM_') * 10));
  
  const radarCfg = {
    labels: ['Reception', 'Pasteurizer', 'CIP', 'Valves', 'Pumps'],
    datasets: [{
      label: 'Health %', data: [recHealth, pastHealth, cipHealth, 100, 100],
      backgroundColor: 'rgba(108,190,69,.15)', borderColor: '#6CBE45',
      pointBackgroundColor: '#6CBE45', borderWidth: 2,
    }],
  }
  const radarOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { ...noAxisOpts.plugins },
    scales: {
      r: {
        angleLines: { color: getColorBorder }, grid: { color: getColorBorder },
        pointLabels: { color: getColorDim, font: { family: 'Inter', size: 11 } },
        ticks: { display: false }, suggestedMin: 0, suggestedMax: 100,
      },
    },
  }

  return (
    <main className="page-container analytics-page">
      <div className="analytics-header">
        <h1 className="section-title">Plant Analytics</h1>
        
        {/* System tabs */}
        <div className="sys-tabs glass-panel">
          <Layers size={14} color="var(--brand-cyan)" />
          <button className={`sys-tab ${sysTab === 'all' ? 'active' : ''}`} onClick={() => setSysTab('all')}>All Systems</button>
          <button className={`sys-tab ${sysTab === 'rec' ? 'active' : ''}`} onClick={() => setSysTab('rec')}>Reception</button>
          <button className={`sys-tab ${sysTab === 'past' ? 'active' : ''}`} onClick={() => setSysTab('past')}>Pasteurizer</button>
          <button className={`sys-tab ${sysTab === 'cip' ? 'active' : ''}`} onClick={() => setSysTab('cip')}>CIP</button>
        </div>
      </div>

        <div className="analytics-grid">
          <div className="a-card glass-panel span-2">
            <h4>Cross-System Correlation (Last 24h)</h4>
            <div className="a-chart tall"><Line data={multiSystemData} options={multiSystemOpts} /></div>
          </div>

          <div className="a-card glass-panel">
            <h4>System Health Radar</h4>
            <div className="a-chart"><Radar data={radarCfg} options={radarOpts} /></div>
          </div>

          {(sysTab === 'all' || sysTab === 'cip') && (
            <div className="a-card glass-panel span-2">
              <h4>CIP Live Parameters</h4>
              <div className="a-chart"><Bar data={cipBarData} options={chartDefaults} /></div>
            </div>
          )}

          {(sysTab === 'all' || sysTab === 'rec') && (
            <div className="a-card glass-panel">
              <h4>Reception Routing Volume</h4>
              <div className="a-chart"><Pie data={pieCfg} options={noAxisOpts} /></div>
            </div>
          )}

          {(sysTab === 'all' || sysTab === 'past') && (
            <div className="a-card glass-panel span-3">
              <h4>Pasteurizer Performance Profile</h4>
              <div className="a-chart tall"><Line data={pastProfileData} options={pastProfileOpts} /></div>
            </div>
          )}
        </div>

      <div style={{ marginTop: '24px' }}>
        <AIDiagnostics activeTab={sysTab} />
      </div>

    </main>
  )
}
