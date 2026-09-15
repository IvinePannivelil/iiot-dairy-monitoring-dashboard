import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { noAxisOpts } from '../../data';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ConsumptionPieChart() {
  const data = {
    labels: ['Water (L)', 'Steam (kg)', 'Lye (L)', 'Acid (L)'],
    datasets: [
      {
        data: [4200, 1500, 240, 180],
        backgroundColor: [
          '#1C76BB', // --brand-blue
          '#00d4aa', // --brand-cyan
          '#f59e0b', // --brand-orange
          '#ef4444', // --brand-red
        ],
        borderColor: 'var(--glass-border)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', minHeight: '250px' }}>
      <Pie data={data} options={noAxisOpts} />
    </div>
  );
}
