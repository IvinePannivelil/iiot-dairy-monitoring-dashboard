import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  getLiveTimeLabels,
  chartDefaults,
  cipSupplyTempHist,
  cipReturnTempHist,
  pastHoldOutHistory,
  cipCondHistory,
  receptionFlowHistory,
  cipFlowHistory
} from '../../data';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TankTrendsChart({ mode = 'temp' }) {
  const getChartData = () => {
    const liveLabels = getLiveTimeLabels();
    switch (mode) {
      case 'temp':
        return {
          labels: liveLabels,
          datasets: [
            {
              label: 'CIP Supply Temp (°C)',
              data: cipSupplyTempHist,
              borderColor: '#ef4444', // brand-red
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
            },
            {
              label: 'CIP Return Temp (°C)',
              data: cipReturnTempHist,
              borderColor: '#f59e0b', // brand-amber
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 2,
              tension: 0.4,
            },
            {
              label: 'Pasteurizer Hold Out (°C)',
              data: pastHoldOutHistory,
              borderColor: '#00d4aa', // brand-cyan
              backgroundColor: 'rgba(0, 212, 170, 0.1)',
              borderWidth: 2,
              tension: 0.4,
            },
          ]
        };
      case 'cond':
        return {
          labels: liveLabels,
          datasets: [
            {
              label: 'CIP Conductivity (mS/cm)',
              data: cipCondHistory,
              borderColor: '#1C76BB', // brand-blue
              backgroundColor: 'rgba(28, 118, 187, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
            }
          ]
        };
      case 'flow':
        return {
          labels: liveLabels,
          datasets: [
            {
              label: 'Reception Flow (LPH)',
              data: receptionFlowHistory,
              borderColor: '#00d4aa', // brand-cyan
              backgroundColor: 'rgba(0, 212, 170, 0.1)',
              borderWidth: 2,
              tension: 0.4,
            },
            {
              label: 'CIP Flow (LPH)',
              data: cipFlowHistory,
              borderColor: '#1C76BB', // brand-blue
              backgroundColor: 'rgba(28, 118, 187, 0.1)',
              borderWidth: 2,
              tension: 0.4,
            }
          ]
        };
      default:
        return { labels: liveLabels, datasets: [] };
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Line data={getChartData()} options={{ ...chartDefaults, maintainAspectRatio: false }} />
    </div>
  );
}
