import { BookOpen, Droplets, FlaskConical, Milk } from 'lucide-react'
import './Manual.css'

const SECTIONS = [
  {
    title: '1. Reception SOP', icon: Milk, color: 'var(--brand-blue)',
    steps: [
      'Connect milk tanker to Unloading Bay 1 or 2.',
      'Select destination tank (RCM or RMST) on the HMI.',
      'Verify Unload Temp SP is set to 8.0 °C.',
      'Press UNLOAD START. Monitor TT1 for incoming temperature.',
      'If separating, ensure Separator Bypass Valve is closed and set flow to 11,500 LPH.',
    ],
  },
  {
    title: '2. Pasteurizer Operation', icon: FlaskConical, color: 'var(--brand-red)',
    steps: [
      'Select Recipe on HMI: Milk (1) or Curd (2).',
      'Verify cycle state is 0 (Idle). Press AUTO START.',
      'System will proceed through Water Fill (2) -> Pre-Heat (3) -> Stabilise (5).',
      'Wait for Holding Temp to reach SP (e.g. 76.5 °C for Milk).',
      'FDV will switch to forward flow. System enters state 18 (Pasteurization).',
    ],
  },
  {
    title: '3. CIP Sequence', icon: Droplets, color: 'var(--brand-cyan)',
    steps: [
      'Ensure production paths are drained and isolated.',
      'Verify CIP tank levels (Hot Water, Lye, Acid).',
      'Start sequence. System executes 83 steps automatically.',
      'Lye phase runs steps 31-45 (target 75°C, conduct > 2.0 mS).',
      'Acid phase runs steps 56-70 (target 65°C, conduct > 1.5 mS).',
    ],
  },
]

export default function Manual() {
  return (
    <main className="page-container manual-page">
      <h1 className="section-title">Plant Operations Manual</h1>
      <div className="manual-sections">
        {SECTIONS.map((sec) => (
          <div className="manual-card glass-panel" key={sec.title}>
            <div className="manual-card-header">
              <sec.icon size={18} style={{ color: sec.color }} />
              <h2>{sec.title}</h2>
            </div>
            <ol className="manual-steps">
              {sec.steps.map((s, i) => (
                <li key={i}>
                  <span className="step-num">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </main>
  )
}
