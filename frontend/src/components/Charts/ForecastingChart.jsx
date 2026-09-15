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
} from 'chart.js';
import { getTimestampLabels, chartDefaults } from '../../data';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
);

// Format ms → HH:MM
function fmtHHMM(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// Projection offsets in minutes: [0, 15, 30, 45, 60, 75, 90]
const PROJ_OFFSETS_MIN = [0, 15, 30, 45, 60, 75, 90];

export default function ForecastingChart({
  historicalSrc = [],
  threshold = 70,
  offsets = [0, -2.8, -5.5, -7.5, -8.2, -8.8, -9.0],
  seriesLabel = 'Sensor Temp',
  unit = '°C',
  isAboveBad = false
}) {
  const HIST_LEN = 120;
  const now = Date.now();

  // Historical labels: 120 real HH:MM timestamps
  const histLabels = getTimestampLabels(HIST_LEN, 60_000);

  // Forecast labels: real future HH:MM times (skip index 0 = "now", already in histLabels)
  const projLabels = PROJ_OFFSETS_MIN.slice(1).map(min =>
    fmtHHMM(now + min * 60_000)
  );

  const extendedLabels = [...histLabels, ...projLabels];

  const historicalData = [...historicalSrc, ...Array(projLabels.length).fill(null)];

  const lastIndex = historicalSrc.length - 1;
  const lastVal = historicalSrc[lastIndex] || 0;

  const forecastVals = offsets.map(offset => lastVal + offset);
  // forecastData: null for all history except last point, then the 7 forecast values
  const forecastData = [
    ...Array(lastIndex).fill(null),
    ...forecastVals,                         // 7 points starting at lastIndex (= "now")
    ...Array(projLabels.length - (PROJ_OFFSETS_MIN.length - 1)).fill(null),
  ];
  const thresholdData = Array(extendedLabels.length).fill(threshold);

  const data = {
    labels: extendedLabels,
    datasets: [
      {
        label: `Historical ${seriesLabel} (${unit})`,
        data: historicalData,
        borderColor: '#1C76BB',
        backgroundColor: 'rgba(28, 118, 187, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: `AI Forecast (${unit})`,
        data: forecastData,
        borderColor: isAboveBad ? '#ef4444' : '#f59e0b',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: isAboveBad ? '#ef4444' : '#f59e0b',
      },
      {
        label: `Threshold (${threshold}${unit})`,
        data: thresholdData,
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [2, 4],
        pointRadius: 0,
        tension: 0,
      }
    ]
  };

  const opts = {
    ...chartDefaults,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: {
          title: (items) => {
            const idx   = items[0]?.dataIndex;
            const label = extendedLabels[idx] || '';
            // Work out relative offset for forecast points
            const histEnd = HIST_LEN - 1;
            if (idx <= histEnd) {
              const minsAgo = histEnd - idx;
              return minsAgo === 0 ? `⏱ ${label}  (Now)` : `⏱ ${label}  (${minsAgo}m ago)`;
            } else {
              const projIdx   = idx - HIST_LEN;
              const minsAhead = PROJ_OFFSETS_MIN[projIdx + 1] || '?';
              return `⏱ ${label}  (+${minsAhead}m forecast)`;
            }
          },
        },
      },
    },
  };

  return (
    <div style={{ height: '100%', width: '100%', minHeight: '260px' }}>
      <Line data={data} options={opts} />
    </div>
  );
}
