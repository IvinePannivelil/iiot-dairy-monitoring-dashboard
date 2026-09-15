import './TankLevelWidget.css'

/**
 * TankLevelWidget — 3-state SVG tank level indicator
 *
 * State logic (binary float switches):
 *   HIGH=1, LOW=1  →  FULL    (green, 85% fill)
 *   HIGH=0, LOW=1  →  NORMAL  (amber, 50% fill)
 *   HIGH=0, LOW=0  →  LOW     (red, 15% fill, pulsing glow)
 *   HIGH=1, LOW=0  →  FAULT   (grey, 50% fill, ⚠ badge)
 *
 * Props:
 *   name        string   — Tank display name
 *   high        bool     — HIGH level switch state
 *   low         bool     — LOW level switch state
 *   tempValue   number?  — Optional temperature to show in badge
 *   tempUnit    string   — Default '°C'
 *   outletOpen  bool?    — Optional outlet valve state
 *   inletOpen   bool?    — Optional inlet valve state
 *   compact     bool     — Renders a smaller mini version
 *   onClick     fn?      — Click handler for navigation
 */
export default function TankLevelWidget({
  name,
  high = false,
  low = false,
  tempValue = null,
  tempUnit = '°C',
  tempLabel = null,
  outletOpen = null,
  inletOpen = null,
  compact = false,
  onClick = null,
}) {
  // Derive 3-state based on exclusive zone logic
  let state, fillPct, fillColor, stateLabel, glowColor
  if (high && !low) {
    state = 'FULL';   fillPct = 85; fillColor = '#00d4aa'; stateLabel = 'FULL';   glowColor = 'rgba(0,212,170,.3)'
  } else if (!high && low) {
    state = 'NORMAL'; fillPct = 50; fillColor = '#f59e0b'; stateLabel = 'NORMAL'; glowColor = 'rgba(245,158,11,.2)'
  } else if (!high && !low) {
    state = 'LOW';    fillPct = 15; fillColor = '#ef4444'; stateLabel = 'LOW';    glowColor = 'rgba(239,68,68,.35)'
  } else {
    // high=1, low=1 — impossible based on PLC exclusive logic
    state = 'FAULT';  fillPct = 50; fillColor = '#4b5563'; stateLabel = 'FAULT';  glowColor = 'rgba(75,85,99,.2)'
  }

  // Visual sensor dot physical state (is the sensor physically covered by fluid?)
  const isHighSubmerged = high;
  const isLowSubmerged = high || low;

  // SVG layout constants
  const W    = compact ? 60  : 90
  const H    = compact ? 130 : 200
  const rx   = compact ? 10  : 16      // corner radius
  const bodyTop  = compact ? 10 : 16   // top of tank body
  const bodyH    = compact ? 105 : 165  // full inner height of tank
  const bodyL    = compact ? 6 : 10    // left margin of tank body
  const bodyW    = W - bodyL * 2

  // Fill rect — snap to 3 fixed heights
  const fillH   = (fillPct / 100) * bodyH
  const fillY   = bodyTop + bodyH - fillH

  // H marker position (top 15% of tank = high switch)
  const highY   = bodyTop + bodyH * 0.12
  // L marker position (bottom 30% of tank = low switch)
  const lowY    = bodyTop + bodyH * 0.70

  const isLow   = state === 'LOW'
  const isFault = state === 'FAULT'

  return (
    <div
      className={`tank-widget ${isLow ? 'tank-low-pulse' : ''} ${compact ? 'tank-compact' : ''}`}
      style={{ '--fill-color': fillColor }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Tank name */}
      <div className="tw-name label-eng">{name}</div>

      {/* SVG Tank */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="tw-svg"
      >
        {/* Outer shell */}
        <rect
          x={bodyL} y={bodyTop}
          width={bodyW} height={bodyH}
          rx={rx} ry={rx}
          fill="var(--badge-bg)"
          stroke="var(--glass-border)"
          strokeWidth="1.5"
        />

        {/* Fill — clipped to tank body */}
        <clipPath id={`clip-${name.replace(/\s/g,'-')}`}>
          <rect x={bodyL} y={bodyTop} width={bodyW} height={bodyH} rx={rx} ry={rx} />
        </clipPath>
        <rect
          x={bodyL} y={fillY}
          width={bodyW} height={fillH}
          fill={fillColor}
          fillOpacity={isLow ? 0.75 : 0.5}
          className="tw-fill"
          clipPath={`url(#clip-${name.replace(/\s/g,'-')})`}
        />
        {/* Gloss sheen */}
        <rect
          x={bodyL + bodyW * 0.55} y={bodyTop + 6}
          width={bodyW * 0.12} height={bodyH * 0.55}
          rx={4} ry={4}
          fill="var(--badge-bg)"
          clipPath={`url(#clip-${name.replace(/\s/g,'-')})`}
        />

        {/* HIGH switch dashed line */}
        <line
          x1={bodyL + 4} y1={highY}
          x2={bodyL + bodyW - 4} y2={highY}
          stroke="var(--divider)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        {!compact && (
          <text x={bodyL + 4} y={highY - 3} fontSize="8" fill="var(--text-secondary)" fontFamily="'JetBrains Mono',monospace">H</text>
        )}

        {/* LOW switch dashed line */}
        <line
          x1={bodyL + 4} y1={lowY}
          x2={bodyL + bodyW - 4} y2={lowY}
          stroke="var(--divider)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        {!compact && (
          <text x={bodyL + 4} y={lowY - 3} fontSize="8" fill="var(--text-secondary)" fontFamily="'JetBrains Mono',monospace">L</text>
        )}

        {/* HIGH switch indicator dot */}
        <circle
          cx={bodyL + bodyW - 6} cy={highY}
          r={compact ? 3 : 4}
          fill={isHighSubmerged ? '#00d4aa' : 'var(--badge-bg)'}
          stroke={isHighSubmerged ? '#00d4aa' : 'var(--glass-border)'}
          strokeWidth="1"
        />

        {/* LOW switch indicator dot */}
        <circle
          cx={bodyL + bodyW - 6} cy={lowY}
          r={compact ? 3 : 4}
          fill={isLowSubmerged ? '#00d4aa' : 'rgba(239,68,68,0.6)'}
          stroke={isLowSubmerged ? '#00d4aa' : '#ef4444'}
          strokeWidth="1"
        />

        {/* Fault badge */}
        {isFault && !compact && (
          <text
            x={W / 2} y={bodyTop + bodyH / 2 + 5}
            textAnchor="middle" fontSize="16"
            fill="#f59e0b"
          >⚠</text>
        )}

        {/* Outlet pipe stub at bottom (if provided) */}
        {outletOpen !== null && (
          <rect
            x={W / 2 - 5} y={bodyTop + bodyH - 1}
            width={10} height={compact ? 8 : 12}
            fill={outletOpen ? '#00d4aa' : '#1a2030'}
            stroke={outletOpen ? '#00d4aa' : 'var(--glass-border)'}
            strokeWidth="1"
          />
        )}

        {/* Inlet pipe stub at top (if provided) */}
        {inletOpen !== null && (
          <rect
            x={W / 2 - 5} y={bodyTop - (compact ? 8 : 12)}
            width={10} height={compact ? 8 : 12}
            fill={inletOpen ? '#00d4aa' : '#1a2030'}
            stroke={inletOpen ? '#00d4aa' : 'var(--glass-border)'}
            strokeWidth="1"
          />
        )}

        {/* Temperature badge */}
        {tempValue !== null && !compact && (
          <>
            <rect x={W - 38} y={highY + 12} width={36} height={20} rx={4} fill="rgba(0,0,0,0.7)" />
            <text
              x={W - 20} y={highY + 25}
              textAnchor="middle" fontSize="11"
              fill="#f59e0b"
              fontFamily="'JetBrains Mono',monospace"
            >{tempValue.toFixed(0)}{tempUnit}</text>
            {tempLabel && (
              <text
                x={W - 20} y={highY + 36}
                textAnchor="middle" fontSize="6.5"
                fill="var(--text-secondary)"
                fontFamily="'JetBrains Mono',monospace"
              >{tempLabel}</text>
            )}
          </>
        )}
      </svg>

      {/* State label */}
      <div
        className="tw-state label-eng"
        style={{ color: fillColor }}
      >{stateLabel}</div>

      {/* State colour dot for compact */}
      {compact && (
        <div className="tw-compact-dot" style={{ background: fillColor, boxShadow: `0 0 6px ${fillColor}` }} />
      )}
    </div>
  )
}
