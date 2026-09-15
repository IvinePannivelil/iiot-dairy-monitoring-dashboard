import { cipTankLevelTags, receptionLevelTags, pastLevelTags } from '../data';

export default function DigitalInputsPanel({ inputs }) {
  const displayInputs = inputs || [
    ...(cipTankLevelTags || []),
    ...(receptionLevelTags || []),
    ...(pastLevelTags || [])
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {displayInputs.map((input, idx) => (
        <div 
          key={input.id || idx} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '8px 12px',
            background: 'var(--glass-bg)',
            borderRadius: '4px',
            border: '1px solid var(--glass-border)'
          }}
        >
          <span className={`led-dot ${input.value ? 'open' : 'closed'}`} />
          <span className="val-mono" style={{ minWidth: '90px' }}>{input.id}</span>
          <span style={{ flex: 1, fontSize: '0.9rem' }}>{input.label}</span>
          <span className="label-eng" style={{ opacity: 0.6 }}>{input.address || input.plcAddress}</span>
        </div>
      ))}
    </div>
  );
}
