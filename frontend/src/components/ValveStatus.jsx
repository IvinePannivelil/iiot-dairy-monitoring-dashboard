import { cipValves, pastValves } from '../data';

export default function ValveStatus({ valves }) {
  // Use passed prop or default to combining both sets from data.js
  const displayValves = valves || [...cipValves, ...pastValves];

  return (
    <div className="valve-grid">
      {displayValves.map((valve) => (
        <div 
          key={valve.id} 
          className="valve-cell" 
          title={`${valve.label} (${valve.address || valve.plcAddress})`}
        >
          <span className={`led-dot ${valve.on ? 'open' : 'closed'}`} />
          <span className="valve-tag">{valve.tag || valve.id}</span>
        </div>
      ))}
    </div>
  );
}
