import { Activity, CheckCircle2, TrendingUp, Cpu, Factory } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  chartDefaults, miniTankOverview, getLiveTimeLabels
} from '../data'
import TankLevelWidget from '../components/TankLevelWidget'
import { useAppContext } from '../context/AppContext'
import './DashboardHome.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function DashboardHome() {
  const navigate = useNavigate()
  const { liveParams, historyParams } = useAppContext()

  const getLive = (addr, fallback = 0) => liveParams[addr] !== undefined ? +liveParams[addr] : fallback
  const getHistory = (addr) => historyParams[addr] || Array(120).fill(null)

  const liveLabels = getLiveTimeLabels()

  const chartData = {
    labels: liveLabels,
    datasets: [
      {
        label: 'Reception Vol (LPH)', data: getHistory('FM1'),
        borderColor: '#1C76BB', backgroundColor: 'rgba(28,118,187,.1)',
        fill: true, tension: 0.4, pointRadius: 0
      },
      {
        label: 'Pasteuriser Flow (LPH)', data: getHistory('AI1'),
        borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,.07)',
        fill: true, tension: 0.4, pointRadius: 0
      }
    ]
  }

  const miniNavMap = { reception: '/reception', pasteurizer: '/pasteurizer', cip: '/cip' }

  const isReceptionRunning = getLive('FM1') > 500
  const isPasteurizerRunning = getLive('AI4') > 40
  const isCIPRunning = getLive('CF1') > 100

  // Detect PLC comms independently of flow thresholds:
  // A tag being present in liveParams means the backend got data from InfluxDB.
  const hasReceptionData = liveParams['FM1'] !== undefined || liveParams['TT1'] !== undefined
  const hasPastData      = liveParams['AI4'] !== undefined || liveParams['AI1'] !== undefined
  const hasCIPData       = liveParams['CT5'] !== undefined || liveParams['CF1'] !== undefined
  const hasAnyData       = hasReceptionData || hasPastData || hasCIPData

  // Plant is "offline" only when NO PLC has sent any data.
  // Individual systems being idle (flow = 0) is NOT the same as offline.
  const isPlantOffline   = !hasAnyData
  const numConnected     = [hasReceptionData, hasPastData, hasCIPData].filter(Boolean).length
  const healthLabel      = isPlantOffline
    ? 'Plant Offline'
    : numConnected === 3 ? 'All Systems Connected'
    : `${numConnected} / 3 Systems Connected`
  const healthSub        = isPlantOffline
    ? 'No live data stream detected from PLCs.'
    : numConnected < 3
    ? 'Some PLCs are not connected — check Node-RED endpoints.'
    : 'No critical alarms across Reception, Pasteuriser, and CIP systems.'

  // --- Dynamic KPI Calculations ---
  // 1. Plant Efficiency (OEE based on rated capacity of 5000 LPH)
  const currentPastFlow = getLive('AI1');
  let plantEfficiency = 0.0;
  if (isPasteurizerRunning) {
    plantEfficiency = Math.min(100, (currentPastFlow / 5000) * 100).toFixed(1);
  }

  // 2. Active Equipments (Reception, Pasteurizer, CIP)
  const numActive = [isReceptionRunning, isPasteurizerRunning, isCIPRunning].filter(Boolean).length;
  const activeEquipStatus = numActive > 0 ? 'Running' : 'Idle';

  // 3. CIP Status
  const totalReceived = getLive('TOT_RECEPTION');
  let cipStatusText = '';
  let cipStatusSub = '';
  if (isCIPRunning) {
    // If running, estimate time to complete (mocking a 45 min cycle using current minutes for dynamic effect)
    const minsPassed = new Date().getMinutes() % 45;
    cipStatusText = `${45 - minsPassed}`;
    cipStatusSub = 'mins remaining';
  } else {
    // If not running, calculate time to next CIP based on 50,000 L production limit
    const volSinceCIP = totalReceived % 50000;
    const volUntilCIP = 50000 - volSinceCIP;
    const liveFlow = getLive('AI9');
    const hrsUntilCIP = liveFlow > 0 ? volUntilCIP / liveFlow : null;
    cipStatusText = hrsUntilCIP !== null ? `~${Math.round(hrsUntilCIP)}` : '—';
    cipStatusSub = 'hrs to next CIP';
  }

  const dynamicSummaries = [
    {
      id: 'reception', name: 'Milk Reception', 
      status: isReceptionRunning ? 'Running' : 'Idle',
      kpis: [
        { label: 'Reception Flow', value: `${(liveParams['FM1'] != null ? Number(liveParams['FM1']).toLocaleString() : '—')} LPH` },
        { label: 'Total Received', value: `${(liveParams['TOT_RECEPTION'] != null ? Number(liveParams['TOT_RECEPTION']).toLocaleString() : '—')} L` },
      ],
    },
    {
      id: 'pasteurizer', name: '5 KLPH Pasteuriser', 
      status: isPasteurizerRunning ? 'Running' : 'Idle',
      kpis: [
        { label: 'Holding Temp', value: `${(liveParams['AI4'] != null ? Number(liveParams['AI4']).toFixed(1) : '—')} °C` },
        { label: 'Flow Rate', value: `${(liveParams['AI1'] != null ? Number(liveParams['AI1']).toLocaleString() : '—')} LPH` },
        { label: 'Product', value: isPasteurizerRunning ? 'Milk' : 'None' },
      ],
    },
    {
      id: 'cip', name: 'CIP System', 
      status: isCIPRunning ? 'Active' : 'Idle',
      kpis: [
        { label: 'Supply Flow', value: `${(liveParams['CF1'] != null ? Number(liveParams['CF1']).toLocaleString() : '—')} LPH` },
        { label: 'Conductivity', value: `${(liveParams['CC1'] != null ? Number(liveParams['CC1']).toFixed(2) : '—')} mS/cm` },
        { label: 'Supply Temp', value: `${(liveParams['CT5'] != null ? Number(liveParams['CT5']).toFixed(1) : '—')} °C` },
      ],
    },
  ]

  return (
    <main className="page-container overview-page">
      <div className="section-head">
        <h1 className="section-title">Plant Overview</h1>
      </div>

      <div className={`system-health glass-panel ${isPlantOffline ? 'health-offline' : ''}`}>
        <div className="sh-head">
          <CheckCircle2 size={18} color={isPlantOffline ? "#ef4444" : numConnected < 3 ? "#f59e0b" : "#00d4aa"} />
          <h3>{healthLabel}</h3>
        </div>
        <p>{healthSub}</p>
      </div>

      <div className="tank-strip glass-panel">
        <span className="label-eng" style={{ marginRight: '4px', alignSelf: 'center' }}>Tank Overview</span>
        <div className="ts-tanks">
          {miniTankOverview.map(t => {
            let liveTemp = t.tempValue;
            let isHigh = t.high;
            let isLow = t.low;

            if (t.id === 'HW') {
              liveTemp = getLive('CT2', 0);
              isHigh = getLive('HW_HIGH') === 1;
              isLow = getLive('HW_LOW') === 1;
            }
            if (t.id === 'LYE') {
              liveTemp = getLive('CT3', 0);
              isHigh = getLive('LYE_HIGH') === 1;
              isLow = getLive('LYE_LOW') === 1;
            }
            if (t.id === 'ACID') {
              liveTemp = getLive('CT4', 0);
              isHigh = getLive('ACID_HIGH') === 1;
              isLow = getLive('ACID_LOW') === 1;
            }
            if (t.id === 'BT') {
              isHigh = getLive('BT_HIGH') === 1;
              isLow = getLive('BT_LOW') === 1;
            }
            if (t.id === 'PMST') {
              isHigh = getLive('PMST_HIGH') === 1;
              isLow = getLive('PMST_LOW') === 1;
            }

            return (
              <TankLevelWidget 
                key={t.id} 
                name={t.name} 
                high={isHigh} 
                low={isLow} 
                tempValue={liveTemp} 
                compact={true} 
                onClick={() => navigate(miniNavMap[t.system] || '/')} 
              />
            )
          })}
        </div>
      </div>

      <div className="plant-kpi-row">
        <div className="p-kpi glass-panel">
          <div className="p-icon"><Factory size={20} color="#1C76BB" /></div>
          <div className="p-val">
            <span>Total Milk Received</span>
            <strong className="numeric">{(liveParams['TOT_RECEPTION'] != null ? Number(liveParams['TOT_RECEPTION']).toLocaleString() : '—')} <small>L</small></strong>
          </div>
        </div>
        <div className="p-kpi glass-panel">
          <div className="p-icon"><Activity size={20} color="#00d4aa" /></div>
          <div className="p-val">
            <span>Plant Efficiency</span>
            <strong className="numeric">{plantEfficiency} <small>%</small></strong>
          </div>
        </div>
        <div className="p-kpi glass-panel">
          <div className="p-icon"><TrendingUp size={20} color="#f59e0b" /></div>
          <div className="p-val">
            <span>Active Equipments</span>
            <strong className="numeric">{numActive} / 3 <small>{activeEquipStatus}</small></strong>
          </div>
        </div>
        <div className="p-kpi glass-panel">
          <div className="p-icon"><Cpu size={20} color="#5BC5F2" /></div>
          <div className="p-val">
            <span>CIP Status</span>
            <strong className="numeric">{cipStatusText} <small>{cipStatusSub}</small></strong>
          </div>
        </div>
      </div>

      <div className="overview-complex">
        <div className="oc-main glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
             <h3>Live Plant Operations Volume</h3>
          </div>
          <div className="c-wrap large-chart">
            <Line data={chartData} options={{ ...chartDefaults, animation: { duration: 0 } }} />
          </div>
        </div>

        <div className="oc-side">
          {dynamicSummaries.map(sys => (
            <Link to={`/${sys.id}`} key={sys.id} className="system-card glass-panel dec-none">
              <div className="sc-head">
                <h2>{sys.name}</h2>
                <span className={`status-badge ${sys.status.includes('Running') || sys.status.includes('Active') || sys.status.includes('Circulation') ? 'running' : 'stopped'}`}>
                  <span className="pulse-dot small" /> {sys.status}
                </span>
              </div>
              <div className="sc-kpis">
                {sys.kpis.map((k, i) => (
                  <div className="kpi-mini" key={i}>
                    <span className="kpi-l">{k.label}</span>
                    <span className="kpi-v numeric">{k.value}</span>
                  </div>
                ))}
              </div>
              <div className="sc-footer">
                <Activity size={14} className="accent-icon" />
                <span>View Live Telemetry →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
