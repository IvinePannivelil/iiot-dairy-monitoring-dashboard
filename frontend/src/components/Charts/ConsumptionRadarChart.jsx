import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { noAxisOpts, getColorBorder, getColorDim } from '../../data';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function ConsumptionRadarChart() {
  const data = {
    labels: ['Pre-Rinse', 'Lye Wash', 'Intermediate Rinse', 'Acid Wash', 'Final Rinse'],
    datasets: [
      {
        label: 'Phase Efficiency',
        data: [98, 92, 88, 96, 99],
        backgroundColor: 'rgba(0, 212, 170, 0.2)', // --brand-cyan base
        borderColor: '#00d4aa',
        pointBackgroundColor: '#00d4aa',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#00d4aa',
        borderWidth: 2,
      },
    ],
  };

  // Merge in radar specific scale options 
  const radarOpts = {
    ...noAxisOpts,
    scales: {
      r: {
        angleLines: { color: getColorBorder },
        grid: { color: getColorBorder },
        pointLabels: { 
          color: getColorDim, 
          font: { family: 'IBM Plex Sans Condensed', size: 11 } 
        },
        ticks: { 
          display: false, 
          min: 0, 
          max: 100, 
          stepSize: 20 
        },
      }
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', minHeight: '250px' }}>
      <Radar data={data} options={radarOpts} />
    </div>
  );
}
