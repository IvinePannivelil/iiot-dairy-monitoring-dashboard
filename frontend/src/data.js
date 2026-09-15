/* ══════════════════════════════════════════════════════════
   Dairy Monitoring Dashboard – Data Layer  (3 Systems)
   DB_UNIT1 = Milk Reception | DB_UNIT2 = Pasteuriser | DB_UNIT3 = CIP
   ══════════════════════════════════════════════════════════ */

// Format a ms timestamp to HH:MM string
function fmtHHMM(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/**
 * Returns n real HH:MM clock labels, one per intervalMs, ending at "now".
 * Default: 120 labels, 1 per minute → 2-hour window.
 */
export function getTimestampLabels(n = 120, intervalMs = 60_000) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const ms = now - (n - 1 - i) * intervalMs;
    return fmtHHMM(ms);
  });
}

// Drop-in replacement for all existing getLiveTimeLabels() call sites
export function getLiveTimeLabels() {
  return getTimestampLabels(120, 60_000);
}

// Keep static labels for older components
export const labels = getLiveTimeLabels();

// Helper to get dynamic colors based on theme
export const getColorPrimary = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.8)' : 'rgba(241,245,249,.7)';
export const getColorDim = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(241,245,249,.35)';
export const getColorBorder = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,.04)';

/* ── Chart.js shared defaults ─────────────────────────── */
export const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  spanGaps: false,
  animation: {
    duration: 1000,
    easing: 'linear'
  },
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: { labels: { color: getColorPrimary, font: { family: 'IBM Plex Sans Condensed', size: 11 } } },
    tooltip: {
      backgroundColor: '#0a0d17', titleColor: '#f1f5f9', bodyColor: '#8b9ab1',
      borderColor: 'rgba(0,212,170,.15)', borderWidth: 1, padding: 10, cornerRadius: 8,
      titleFont: { family: 'IBM Plex Sans Condensed', weight: 600 }, bodyFont: { family: 'JetBrains Mono', size: 11 },
      callbacks: {
        // Show the real HH:MM timestamp as the tooltip title
        title: (items) => {
          const label = items[0]?.label;
          return label ? `\u23F1 ${label}` : '';
        },
      },
    },
  },
  scales: {
    x: { ticks: { color: getColorDim, font: { family: 'JetBrains Mono', size: 10 }, autoSkip: true, maxTicksLimit: 12, maxRotation: 0 }, grid: { display: false } },
    y: { ticks: { color: getColorDim, font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: getColorBorder } },
  },
}

// Temperature chart Y-axis options (0–100 °C)
export const tempChartOpts = {
  ...chartDefaults,
  scales: {
    x: chartDefaults.scales.x,
    y: { ...chartDefaults.scales.y, min: 0, max: 100, ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}°C` } },
  },
}

// Flow chart Y-axis options (0–15000 LPH)
export const flowChartOpts = {
  ...chartDefaults,
  scales: {
    x: chartDefaults.scales.x,
    y: { ...chartDefaults.scales.y, min: 0, suggestedMax: 15000, ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${(v/1000).toFixed(0)}k` } },
  },
}

// CIP temperature chart (40–90 °C)
export const cipTempChartOpts = {
  ...chartDefaults,
  scales: {
    x: chartDefaults.scales.x,
    y: { ...chartDefaults.scales.y, min: 40, max: 90, ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}°C` } },
  },
}

export const noAxisOpts = {
  responsive: true, maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: { position: 'bottom', labels: { color: getColorPrimary, font: { family: 'IBM Plex Sans Condensed', size: 11 }, padding: 16 } },
    tooltip: chartDefaults.plugins.tooltip,
  },
}

/* ══════════════════════════════════════════════════════════
   SYSTEM 1 – MILK RECEPTION  (DB_UNIT1)
   ══════════════════════════════════════════════════════════ */

// Temperature Sensors TT1–TT7 (DB_UNIT1,REAL406–620 per updated address table)
// TT8 (Chiller Inlet) does NOT exist — excluded.
// RCM_TEMP = TT4 alias (DB_UNIT1,REAL472), RMST_TEMP = TT5 alias (DB_UNIT1,REAL494)
export const receptionTemps = [
  { id: 'TT1',  tag: 'TT1',  label: 'Raw Milk Inlet Temp', value: 8.2,  unit: '°C', address: 'TT1', type: 'AI', system: 'reception', plcAddr: 'DB_UNIT1,REAL406' },
  { id: 'TT2',  tag: 'TT2',  label: 'Separator Inlet',     value: 52.4, unit: '°C', address: 'TT2',  type: 'AI', system: 'reception', plcAddr: 'DB_UNIT1,REAL428' },
  { id: 'TT3',  tag: 'TT3',  label: 'Separator Outlet',    value: 48.1, unit: '°C', address: 'TT3',  type: 'AI', system: 'reception', plcAddr: 'DB_UNIT1,REAL450' },
  { id: 'TT4',  tag: 'TT4',  label: 'Cream Outlet',        value: 45.6, unit: '°C', address: 'TT4',  type: 'AI', system: 'reception', plcAddr: 'DB_UNIT1,REAL472' },
  { id: 'TT5',  tag: 'TT5',  label: 'Skim Outlet',         value: 44.2, unit: '°C', address: 'TT5',  type: 'AI', system: 'reception', plcAddr: 'DB_UNIT1,REAL494' },
  { id: 'TT6',  tag: 'TT6',  label: 'STD Inlet',           value: 46.8, unit: '°C', address: 'TT6',  type: 'AI', system: 'reception', plcAddr: 'DB_UNIT1,REAL516' },
  { id: 'TT7',  tag: 'TT7',  label: 'STD Outlet',          value: null, unit: '°C', address: 'TT7',  type: 'AI', system: 'reception', plcAddr: 'DB_UNIT1,REAL620' },
]

// Flow meters — FM1 @ DB_UNIT1_FLOW,REAL48 | FM2 @ DB_UNIT1_FLOW,REAL52
export const receptionFlowMeters = {
  FM1: { id: 'FM1', label: 'Reception Flow',  value: 12450, max: 15000, unit: 'LPH', address: 'FM1', type: 'AI', system: 'reception', plcAddr: 'DB_UNIT1_FLOW,REAL48' },
  FM2: { id: 'FM2', label: 'Separation Flow', value: 11800, max: 15000, unit: 'LPH', address: 'FM2', type: 'AI', system: 'reception', plcAddr: 'DB_UNIT1_FLOW,REAL52' },
}

// VFD tags — SP @ DB_UNIT1,REAL140 / DB_UNIT1,REAL362 | Hz feedback @ DB_UNIT3_ACID,REAL66 / DB_UNIT3_ACID,REAL70
export const receptionVFD = {
  VFD1_SP:  { id: 'VFD1_SP',  label: 'VFD 1 Speed Setpoint', value: 38.5, unit: 'Hz', address: 'VFD1_SP',  type: 'AO', system: 'reception', plcAddr: 'DB_UNIT1,REAL140',  description: 'Operator setpoint 0–50 Hz' },
  VFD2_SP:  { id: 'VFD2_SP',  label: 'VFD 2 Speed Setpoint', value: 42.0, unit: 'Hz', address: 'VFD2_SP',  type: 'AO', system: 'reception', plcAddr: 'DB_UNIT1,REAL362',  description: 'Operator setpoint 0–50 Hz' },
  VFD1_HZ:  { id: 'VFD1_HZ',  label: 'VFD 1 Actual Hz',      value: 37.1, unit: 'Hz', address: 'VFD1_HZ',  type: 'AI', system: 'reception', plcAddr: 'DB_UNIT3_ACID,REAL66', description: 'Live readback from drive' },
  VFD2_HZ:  { id: 'VFD2_HZ',  label: 'VFD 2 Actual Hz',      value: 41.3, unit: 'Hz', address: 'VFD2_HZ',  type: 'AI', system: 'reception', plcAddr: 'DB_UNIT3_ACID,REAL70', description: 'Live readback from drive' },
}

// Key setpoints from DB_UNIT1
export const receptionSetpoints = [
  { param: 'Total Reception',        value: '50,000', unit: 'L',   offset: '2.0'  },
  { param: 'Unload Water Flush',     value: '200',    unit: 'L',   offset: '7.0'  },
  { param: 'Steam Control',          value: '65',     unit: '%',   offset: '14.0' },
  { param: 'Reception Flow SP',      value: '12,000', unit: 'LPH', offset: '18.0' },
  { param: 'RMST Out Flow',          value: '10,000', unit: 'LPH', offset: '22.0' },
  { param: 'VFD 1 Scaled',          value: '38.5',   unit: 'Hz',  offset: '30.0' },
  { param: 'VFD 2 Scaled',          value: '42.0',   unit: 'Hz',  offset: '34.0' },
  { param: 'Separator Total',        value: '50,000', unit: 'L',   offset: '40.0' },
  { param: 'Separation Flow SP',     value: '10,000', unit: 'LPH', offset: '48.0' },
  { param: 'Unload Temp SP',         value: '7.0',    unit: '°C',  offset: '98.0' },
  { param: 'Chilling SP',            value: '4.0',    unit: '°C',  offset: '384.0'},
  { param: 'RC Temp Limit',          value: '10.0',   unit: '°C',  offset: '368.0'},
  { param: 'Min Unload Flow',        value: '4,500',  unit: 'LPH', offset: '128.0'},
  { param: 'Water Flush SP',         value: '200',    unit: 'L',   offset: '270.0'},
]

// Process pipeline — active state driven by live PLC bits (unload/1/2)
// 'active' field here is just a fallback default; pages override with liveParams
export const receptionProcessSteps = [
  { id: 'unload',   label: 'Unloading',          address: 'unload' },
  { id: 'separate', label: 'Separation',          address: 'separate' },
  { id: 'std',      label: 'Fat Standardization', address: 'std' },
  { id: 'chill',    label: 'Chilling',            address: null },
]

// Totals
export const receptionTotals = {
  receptionTotal: 32450, unloadWaterTot: 145, rcTot: 820, wtrFlushTot: 98,
  remainingTime: 1240, runningStatus: true,
}

// Tank routing booleans — DB_UNIT1,X0.4 / X0.5 / X12.0 / X12.1
export const receptionTanks = {
  unloadTankRCM:  { id: 'unloadTankRCM',  value: true,  address: 'unloadTankRCM',  label: 'RCM tank selected for unloading',   type: 'DI', system: 'reception', plcAddr: 'DB_UNIT1,X0.4'  },
  unloadTankRMST: { id: 'unloadTankRMST', value: false, address: 'unloadTankRMST', label: 'RMST tank selected for unloading',  type: 'DI', system: 'reception', plcAddr: 'DB_UNIT1,X0.5'  },
  destRcmTank:    { id: 'destRcmTank',    value: true,  address: 'destRcmTank',    label: 'RCM as separation destination',     type: 'DI', system: 'reception', plcAddr: 'DB_UNIT1,X12.0' },
  destRmstTank:   { id: 'destRmstTank',   value: false, address: 'destRmstTank',   label: 'RMST as separation destination',    type: 'DI', system: 'reception', plcAddr: 'DB_UNIT1,X12.1' },
  tankHighPopup:  { id: 'tankHighPopup',  value: false, address: 'tankHighPopup',  label: 'Tank high level alarm popup active', type: 'DI', system: 'reception' },
}

// RCM & RMST binary level switches — DB_UNIT2,X0.6 / X0.7 / X1.0 / X1.1
export const receptionLevelTags = [
  { id: 'RCM_HIGH',  label: 'RCM High Level',  address: 'RCM_HIGH',  plcAddress: 'DB_UNIT2,X0.6', type: 'DI', system: 'reception', tankGroup: 'RCM',  levelRole: 'HIGH', value: true  },
  { id: 'RCM_LOW',   label: 'RCM Low Level',   address: 'RCM_LOW',   plcAddress: 'DB_UNIT2,X0.7', type: 'DI', system: 'reception', tankGroup: 'RCM',  levelRole: 'LOW',  value: true  },
  { id: 'RMST_HIGH', label: 'RMST High Level', address: 'RMST_HIGH', plcAddress: 'DB_UNIT2,X1.0', type: 'DI', system: 'reception', tankGroup: 'RMST', levelRole: 'HIGH', value: false },
  { id: 'RMST_LOW',  label: 'RMST Low Level',  address: 'RMST_LOW',  plcAddress: 'DB_UNIT2,X1.1', type: 'DI', system: 'reception', tankGroup: 'RMST', levelRole: 'LOW',  value: true  },
]

// Derived RCM/RMST tank states for TankLevelWidget
// RCM_TEMP = TT4 alias (DB_UNIT1,REAL472 — Cream Outlet)
// RMST_TEMP = TT5 alias (DB_UNIT1,REAL494 — Skim Outlet)
export const rcmRmstTanks = [
  { name: 'RCM Tank',  tempTag: 'RCM_TEMP',  tempValue: 5.2,  high: true,  low: true  },
  { name: 'RMST Tank', tempTag: 'RMST_TEMP', tempValue: 5.0,  high: false, low: true  },
]

// Totalizer display cards
// NOTE: TOT_RECEPTION and TOT_RMST both map to DB_UNIT1,REAL594 — pending clarification.
// TOT_WATER_FLUSH @ DB_UNIT1,REAL274 | RECEP_FLOW_SP @ DB_UNIT1,REAL18 | RMST_OUT_SP @ DB_UNIT1,REAL22
export const receptionTotalizerCards = [
  { id: 'TOT_RECEPTION',   label: 'Tot Reception',     value: 32450, unit: 'L',   address: 'TOT_RECEPTION',   type: 'AI', plcAddr: 'DB_UNIT1,REAL594' },
  { id: 'TOT_WATER_FLUSH', label: 'Water Flush Total', value: 145,   unit: 'L',   address: 'TOT_WATER_FLUSH', type: 'AI', plcAddr: 'DB_UNIT1,REAL274' },
  { id: 'RMST_OUT_SP',     label: 'RMST Out Flow SP',  value: 10000, unit: 'LPH', address: 'RMST_OUT_SP',     type: 'AO', plcAddr: 'DB_UNIT1,REAL22'  },
  { id: 'RECEP_FLOW_SP',   label: 'Reception Flow SP', value: 12000, unit: 'LPH', address: 'RECEP_FLOW_SP',   type: 'AO', plcAddr: 'DB_UNIT1,REAL18'  },
]

// Time-series (120 minutes)
export const receptionFlowHistory = Array(120).fill(12450)
export const receptionTempHistory = Array(120).fill(8.2)
export const chillerOutHistory    = Array(120).fill(4.8)


/* ══════════════════════════════════════════════════════════
   SYSTEM 2 – PASTEURISER  (DB_UNIT2)
   ══════════════════════════════════════════════════════════ */

// Analog Inputs (AI1–AI9) — addresses from Pasteurizer PLC-to-Node-RED mapping sheet
// NOTE: AI9 (DB_UNIT2_AUX,REAL526) flagged ERROR in mapping — verify with PLC engineer before deploying
export const pastTemps = [
  { id: 'AI1', tag: 'AI1', label: 'Product Inlet',        value: 12.4,  unit: '°C',  address: 'AI1',  type: 'AI', system: 'pasteuriser', plcAddr: 'DB_UNIT2,REAL204' },
  { id: 'AI2', tag: 'AI2', label: 'Homogeniser Inlet',    value: 62.8,  unit: '°C',  address: 'AI2',  type: 'AI', system: 'pasteuriser', plcAddr: 'DB_UNIT2,REAL208' },
  { id: 'AI3', tag: 'AI3', label: 'Holding Inlet',        value: 74.2,  unit: '°C',  address: 'AI3',  type: 'AI', system: 'pasteuriser', plcAddr: 'DB_UNIT2,REAL212' },
  { id: 'AI4', tag: 'AI4', label: 'Holding Outlet',       value: 76.4,  unit: '°C',  address: 'AI4',  type: 'AI', system: 'pasteuriser', plcAddr: 'DB_UNIT2,REAL216' },
  { id: 'AI5', tag: 'AI5', label: 'Product Outlet',       value: 8.6,   unit: '°C',  address: 'AI5',  type: 'AI', system: 'pasteuriser', plcAddr: 'DB_UNIT2,REAL220' },
  { id: 'AI6', tag: 'AI6', label: 'Main Hot Water',       value: 82.1,  unit: '°C',  address: 'AI6',  type: 'AI', system: 'pasteuriser', plcAddr: 'DB_UNIT2,REAL224' },
  { id: 'AI7', tag: 'AI7', label: 'Pre Hot Water',        value: 68.5,  unit: '°C',  address: 'AI7',  type: 'AI', system: 'pasteuriser', plcAddr: 'DB_UNIT2,REAL228' },
  { id: 'AI8', tag: 'AI8', label: 'Chilled Water Inlet',  value: 1.8,   unit: '°C',  address: 'AI8',  type: 'AI', system: 'pasteuriser', plcAddr: 'DB_UNIT2,REAL232' },
  { id: 'AI9', tag: 'AI9', label: 'Past Flow',            value: 4850,  unit: 'LPH', address: 'AI9',  type: 'AI', system: 'pasteuriser', plcAddr: 'DB_UNIT2_AUX,REAL526', description: 'Pasteuriser flow — address flagged ERROR in mapping, verify with PLC engineer' },
]

// Analog Outputs — addresses from Pasteurizer mapping sheet
export const pastOutputs = [
  { id: 'AO1', tag: 'AO1', label: 'Supply Pump VFD',                 value: 72, unit: '%', address: 'AO1', type: 'AO', system: 'pasteuriser', plcAddr: 'DB_UNIT2_VFD,REAL70' },
  { id: 'AO2', tag: 'AO2', label: 'Main Heater Steam Control Valve', value: 58, unit: '%', address: 'AO2', type: 'AO', system: 'pasteuriser', plcAddr: 'DB_UNIT2_VLV1,REAL20', description: 'Hot water control valve, not direct steam' },
  { id: 'AO3', tag: 'AO3', label: 'Pre Heater Steam Control Valve',  value: 41, unit: '%', address: 'AO3', type: 'AO', system: 'pasteuriser', plcAddr: 'DB_UNIT2_VLV2,REAL20', description: 'Hot water control valve, not direct steam' },
]

// Digital Outputs (SV1–SV21) — DB_UNIT2,X addresses from Pasteurizer mapping sheet
export const pastValves = [
  { id: 'SV1',  tag: 'SV1',  label: 'Raw Milk Inlet',       on: true,  address: 'SV1',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X816.0' },
  { id: 'SV2',  tag: 'SV2',  label: 'Raw Milk Inlet Drain', on: false, address: 'SV2',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X816.1' },
  { id: 'SV3',  tag: 'SV3',  label: 'BT Out',               on: true,  address: 'SV3',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X816.2' },
  { id: 'SV4',  tag: 'SV4',  label: 'Spray Ball',           on: false, address: 'SV4',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X816.3' },
  { id: 'SV5',  tag: 'SV5',  label: 'Homogeniser Bypass',   on: false, address: 'SV5',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X816.5' },
  { id: 'SV6',  tag: 'SV6',  label: 'Homogeniser Inlet',    on: true,  address: 'SV6',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X816.6' },
  { id: 'SV7',  tag: 'SV7',  label: 'Holding 2 Bypass',     on: true,  address: 'SV7',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X816.7' },
  { id: 'SV8',  tag: 'SV8',  label: 'Holding 2 Inlet',      on: true,  address: 'SV8',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X816.8' },
  { id: 'SV9',  tag: 'SV9',  label: 'Holding 2 Outlet',     on: true,  address: 'SV9',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X817.0' },
  { id: 'SV10', tag: 'SV10', label: 'Holding 2 CIP Inlet',  on: false, address: 'SV10', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X817.1' },
  { id: 'SV11', tag: 'SV11', label: 'Holding 2 CIP Outlet', on: false, address: 'SV11', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X817.2' },
  { id: 'SV12', tag: 'SV12', label: 'Past Hot FDV',         on: true,  address: 'SV12', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X817.4' },
  { id: 'SV13', tag: 'SV13', label: 'Milk/Curd Valve',      on: true,  address: 'SV13', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X817.3' },
  { id: 'SV14', tag: 'SV14', label: 'Paneer Valve',         on: false, address: 'SV14', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X817.5' },
  { id: 'SV15', tag: 'SV15', label: 'Product Outlet',       on: true,  address: 'SV15', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X817.6' },
  { id: 'SV16', tag: 'SV16', label: 'Recirculation',        on: false, address: 'SV16', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X817.7' },
  { id: 'SV17', tag: 'SV17', label: 'Drain',                on: false, address: 'SV17', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X818.0' },
  { id: 'SV18', tag: 'SV18', label: 'Water Inlet',          on: false, address: 'SV18', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X818.1' },
  { id: 'SV19', tag: 'SV19', label: 'Chilled Water Inlet',  on: true,  address: 'SV19', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X818.2' },
  { id: 'SV20', tag: 'SV20', label: 'MSCV HW Inlet',        on: true,  address: 'SV20', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X818.3' },
  { id: 'SV21', tag: 'SV21', label: 'PSCV HW Inlet',        on: true,  address: 'SV21', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X818.4' },
]

// Motor outputs — DB addresses from Pasteurizer mapping sheet
export const pastMotors = [
  { id: 'FEED_PUMP',  tag: 'FEED_PUMP',  label: 'Feed Pump',         on: true,  trip: false, address: 'FEED_PUMP',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X819.3' },
  { id: 'HOMO_START', tag: 'HOMO_START', label: 'Homogeniser Start', on: true,  trip: false, address: 'HOMO_START', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X819.4' },
  { id: 'HOMO_STOP',  tag: 'HOMO_STOP',  label: 'Homogeniser Stop',  on: false, trip: false, address: 'HOMO_STOP',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X819.5' },
  { id: 'BOOST_PUMP', tag: 'BOOST_PUMP', label: 'Booster Pump',      on: true,  trip: false, address: 'BOOST_PUMP', type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X793.5' },
  { id: 'RM_PUMP',    tag: 'RM_PUMP',    label: 'Raw Milk Pump',     on: true,  trip: false, address: 'RM_PUMP',    type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2_PMP,X0.0'  },
  { id: 'PMST_PUMP',  tag: 'PMST_PUMP',  label: 'PMST Pump',         on: false, trip: false, address: 'PMST_PUMP',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X819.4' },
  { id: 'PMST_AGIT',  tag: 'PMST_AGIT',  label: 'PMST Agitator',    on: false, trip: false, address: 'PMST_AGIT',  type: 'DO', system: 'pasteuriser', plcAddr: 'DB_UNIT2,X819.5' },
]

// Balance Tank & PMST binary level switches — DB addresses from mapping sheet
// NOTE: BT_HIGH (DB_UNIT2_AUX,X464.1) and BT_LOW (DB_UNIT2_AUX,X2464.0) flagged ERROR — verify with PLC engineer
export const pastLevelTags = [
  { id: 'BT_HIGH',   label: 'Balance Tank High', address: 'BT_HIGH',   type: 'DI', system: 'pasteuriser', tankGroup: 'BT',   levelRole: 'HIGH', value: true,  plcAddr: 'DB_UNIT2_AUX,X464.1'  },
  { id: 'BT_LOW',    label: 'Balance Tank Low',  address: 'BT_LOW',    type: 'DI', system: 'pasteuriser', tankGroup: 'BT',   levelRole: 'LOW',  value: true,  plcAddr: 'DB_UNIT2_AUX,X2464.0' },
  { id: 'PMST_HIGH', label: 'PMST High Level',   address: 'PMST_HIGH', type: 'DI', system: 'pasteuriser', tankGroup: 'PMST', levelRole: 'HIGH', value: false, plcAddr: 'DB_UNIT2,X793.0'   },
  { id: 'PMST_LOW',  label: 'PMST Low Level',    address: 'PMST_LOW',  type: 'DI', system: 'pasteuriser', tankGroup: 'PMST', levelRole: 'LOW',  value: true,  plcAddr: 'DB_UNIT2,X793.1'   },
]

// Recipe — active recipe live from %DB_UNIT2.DBW2162 (1=Milk, 2=Curd)
export const pastRecipeTypes = [
  { id: 1, name: 'Milk', hotTemp: 76.5, outletTemp: 4.5,  sterTemp: 121, flowSP: 5000, sterTime: 30, stabHeat: 120, stabCool: 180 },
  { id: 2, name: 'Curd', hotTemp: 85.0, outletTemp: 42.0, sterTemp: 121, flowSP: 4000, sterTime: 30, stabHeat: 150, stabCool: 120 },
]

// Cycle step lookup — live from %DB_UNIT2.DBW2466 (INT, 0–51)
// Steps 0–18 = Production cycle, Steps 30–51 = CIP cycle
export const pastCycleLabels = {
  0:  'No Cycle Running',
  1:  'Waiting for Cycle Start',
  2:  'Balance Tank Filling',
  3:  'Initial Flushing',
  4:  'Waiting for Sterilization Temp',
  5:  'Sterilization Cycle Running',
  6:  'Stabilization Heating Running',
  7:  'Stabilization Cooling Running',
  8:  'Waiting for Drain Acknowledge',
  9:  'Starting Draining Cycle',
  10: 'Draining Initial Product',
  11: 'Waiting for Low Level',
  12: 'Balance Tank Emptying',
  13: 'Draining Cycle Running',
  14: 'Production Cycle Running',
  15: 'Waiting for Low Level',
  16: 'Balance Tank Emptying',
  17: 'End Product Forwarding',
  18: 'End Product Flushing',
  30: 'Waiting for CIP Cycle Start',
  31: 'Balance Tank Filling',
  32: 'Water Circulation Running',
  33: 'Waiting for Low Level',
  34: 'Water Flushing Running',
  35: 'Lye CIP Initializing',
  36: 'Waiting for Lye Dosing Ack',
  37: 'Waiting for Lye Temp',
  38: 'Lye Circulation Running',
  39: 'Waiting for Low Level',
  40: 'Lye Flushing Running',
  41: 'Acid CIP Initializing',
  42: 'Waiting for Acid Dosing Ack',
  43: 'Waiting for Acid Temp',
  44: 'Acid Circulation Running',
  45: 'Waiting for Low Level',
  46: 'Acid Flushing Running',
  47: 'Waiting for Hot Water Temp',
  48: 'Hot Water Circulation Running',
  49: 'Waiting for Low Level',
  50: 'Final Flushing Running',
  51: 'CIP Cycle Complete',
}

// Time-series (120 minutes)
export const pastHoldOutHistory = Array(120).fill(76.4)
export const pastHoldInHistory  = Array(120).fill(74.2)
export const pastMainHotHistory = Array(120).fill(82.1)
export const pastInletHistory   = Array(120).fill(12.4)
export const pastOutletHistory  = Array(120).fill(8.6)
export const pastFlowHistory    = Array(120).fill(4850)
export const pastChillHistory   = Array(120).fill(1.8)


/* ══════════════════════════════════════════════════════════
   SYSTEM 3 – CIP  (DB_UNIT3)
   ══════════════════════════════════════════════════════════ */

// 7 Analog Inputs — DB addresses from CIP PLC-to-Node-RED mapping sheet
export const cipAnalogs = [
  { id: 'CT2', tag: 'CT2', label: 'Hot Water Tank', value: 78.2, unit: '°C',    address: 'CT2', type: 'AI', system: 'cip', plcAddr: 'DB_UNIT2_AUX,REAL6' },
  { id: 'CT3', tag: 'CT3', label: 'Lye Tank',       value: 72.1, unit: '°C',    address: 'CT3', type: 'AI', system: 'cip', plcAddr: 'DB_UNIT3_LYE,REAL6' },
  { id: 'CT4', tag: 'CT4', label: 'Acid Tank',      value: 64.8, unit: '°C',    address: 'CT4', type: 'AI', system: 'cip', plcAddr: 'DB_UNIT3_ACID,REAL6' },
  { id: 'CT5', tag: 'CT5', label: 'Supply Line',    value: 74.6, unit: '°C',    address: 'CT5', type: 'AI', system: 'cip', plcAddr: 'DB_UNIT3_SUP,REAL6' },
  { id: 'CT6', tag: 'CT6', label: 'Return Line',    value: 68.3, unit: '°C',    address: 'CT6', type: 'AI', system: 'cip', plcAddr: 'DB_UNIT3_RET,REAL6' },
  { id: 'CF1', tag: 'CF1', label: 'Supply Flow',    value: 8500, unit: 'LPH',   address: 'CF1', type: 'AI', system: 'cip', plcAddr: 'DB_UNIT3_FLOW,REAL6' },
  { id: 'CC1', tag: 'CC1', label: 'Conductivity',   value: 0.42, unit: 'mS/cm', address: 'CC1', type: 'AI', system: 'cip', plcAddr: 'DB_UNIT3_COND,REAL6' },
]

// Tank binary level switches — DB_UNIT3,X addresses from CIP mapping sheet
export const cipTankLevelTags = [
  { id: 'HW_HIGH',   label: 'Hot Water High', address: 'HW_HIGH',   type: 'DI', system: 'cip', tankGroup: 'Hot Water', levelRole: 'HIGH', value: true,  plcAddr: 'DB_UNIT3,X0.7' },
  { id: 'HW_LOW',    label: 'Hot Water Low',  address: 'HW_LOW',    type: 'DI', system: 'cip', tankGroup: 'Hot Water', levelRole: 'LOW',  value: true,  plcAddr: 'DB_UNIT3,X1.0' },
  { id: 'LYE_HIGH',  label: 'Lye High',       address: 'LYE_HIGH',  type: 'DI', system: 'cip', tankGroup: 'Lye',       levelRole: 'HIGH', value: false, plcAddr: 'DB_UNIT3,X1.1' },
  { id: 'LYE_LOW',   label: 'Lye Low',        address: 'LYE_LOW',   type: 'DI', system: 'cip', tankGroup: 'Lye',       levelRole: 'LOW',  value: false, plcAddr: 'DB_UNIT3,X1.2' },
  { id: 'ACID_HIGH', label: 'Acid High',      address: 'ACID_HIGH', type: 'DI', system: 'cip', tankGroup: 'Acid',      levelRole: 'HIGH', value: false, plcAddr: 'DB_UNIT3,X1.3' },
  { id: 'ACID_LOW',  label: 'Acid Low',       address: 'ACID_LOW',  type: 'DI', system: 'cip', tankGroup: 'Acid',      levelRole: 'LOW',  value: true,  plcAddr: 'DB_UNIT3,X1.4' },
]

// Derived tank states for widget consumption (Recuperation removed — not in use)
export const cipTanks = [
  { name: 'Hot Water', high: true,  low: true,  tempTag: 'CT2', tempValue: 78.2, outletValveTag: 'BFV_3', inletValveTag: 'BFV_11' },
  { name: 'Lye',      high: false, low: false, tempTag: 'CT3', tempValue: 72.1, outletValveTag: 'BFV_4', inletValveTag: 'BFV_12' },
  { name: 'Acid',     high: false, low: true,  tempTag: 'CT4', tempValue: 64.8, outletValveTag: 'BFV_5', inletValveTag: 'BFV_13' },
]

// VFD — DB_UNIT3,X addresses from CIP mapping sheet. CIP_VFD_SP corrected from %QW7 → DB_UNIT3_VFD,REAL70
export const cipVFD = {
  CIP_VFD_RUN:  { id: 'CIP_VFD_RUN',  label: 'VFD Run Feedback',   value: true,  address: 'CIP_VFD_RUN',  type: 'DI', system: 'cip', plcAddr: 'DB_UNIT3,X1.5', description: 'Boolean status — drive is running' },
  CIP_VFD_TRIP: { id: 'CIP_VFD_TRIP', label: 'VFD Trip',           value: false, address: 'CIP_VFD_TRIP', type: 'DI', system: 'cip', plcAddr: 'DB_UNIT3,X1.6', description: 'Boolean fault indicator' },
  CIP_VFD_SP:   { id: 'CIP_VFD_SP',   label: 'VFD Speed Setpoint', value: 46.0,  address: 'CIP_VFD_SP',   type: 'AO', system: 'cip', unit: 'Hz', plcAddr: 'DB_UNIT3_VFD,REAL70', description: 'Speed command written to drive' },
}

// CIP valve & pump outputs — DB_UNIT3,X addresses from CIP mapping sheet
// NOTE: Ret_P1/P2/P3 all share DB_UNIT2,X444.5 — flagged NOT FOUND in mapping, verify with PLC engineer
export const cipValves = [
  { id: 'BFV_3',   tag: 'BFV_3',   label: 'Hot Water Tank Outlet Valve',        on: true,  address: 'BFV_3',   type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X24.2' },
  { id: 'BFV_4',   tag: 'BFV_4',   label: 'Lye Tank Outlet Valve',              on: false, address: 'BFV_4',   type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X24.3' },
  { id: 'BFV_5',   tag: 'BFV_5',   label: 'Acid Tank Outlet Valve',             on: false, address: 'BFV_5',   type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X24.4' },
  { id: 'BFV_6',   tag: 'BFV_6',   label: 'Supply Valve',                       on: true,  address: 'BFV_6',   type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X25.5' },
  { id: 'BFV_7',   tag: 'BFV_7',   label: 'Recirculation Valve',                on: true,  address: 'BFV_7',   type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X24.6' },
  { id: 'BFV_8',   tag: 'BFV_8',   label: 'Return Valve',                       on: true,  address: 'BFV_8',   type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X24.7' },
  { id: 'BFV_9',   tag: 'BFV_9',   label: 'Recuperation Tank Inlet Valve',      on: false, address: 'BFV_9',   type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X25.0' },
  { id: 'BFV_10',  tag: 'BFV_10',  label: 'Hot Water Tank Inlet Valve',         on: false, address: 'BFV_10',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X25.1' },
  { id: 'BFV_11',  tag: 'BFV_11',  label: 'Lye Tank Inlet Valve',               on: false, address: 'BFV_11',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X25.2' },
  { id: 'BFV_12',  tag: 'BFV_12',  label: 'Acid Tank Inlet Valve',              on: false, address: 'BFV_12',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X25.3' },
  { id: 'BFV_13',  tag: 'BFV_13',  label: 'Drain Valve',                        on: false, address: 'BFV_13',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X25.4' },
  { id: 'BFV_14',  tag: 'BFV_14',  label: 'Fresh Water Valve',                  on: false, address: 'BFV_14',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X25.5' },
  { id: 'BFV_15',  tag: 'BFV_15',  label: 'Recuperation Tank Water Inlet Valve',on: false, address: 'BFV_15',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X25.6' },
  { id: 'BFV_16',  tag: 'BFV_16',  label: 'Hot Water Tank Water Inlet Valve',   on: true,  address: 'BFV_16',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X25.7' },
  { id: 'BFV_17',  tag: 'BFV_17',  label: 'Lye Tank Water Inlet Valve',         on: false, address: 'BFV_17',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X26.0' },
  { id: 'BFV_18',  tag: 'BFV_18',  label: 'Acid Tank Water Inlet Valve',        on: false, address: 'BFV_18',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X26.1' },
  { id: 'BFV_19',  tag: 'BFV_19',  label: 'Hot Water PHE Inlet Valve',          on: true,  address: 'BFV_19',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X26.2' },
  { id: 'BFV_20',  tag: 'BFV_20',  label: 'Hot Water PHE Bypass Valve',         on: false, address: 'BFV_20',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X26.3' },
  { id: 'Sup_Pump',tag: 'Sup_Pump',label: 'Feed Pump',                          on: true,  address: 'Sup_Pump',type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X26.4' },
  { id: 'ADP',     tag: 'ADP',     label: 'Acid Dosing Pump',                   on: false, address: 'ADP',     type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X26.5' },
  { id: 'LDP',     tag: 'LDP',     label: 'Lye Dosing Pump',                    on: false, address: 'LDP',     type: 'DO', system: 'cip', plcAddr: 'DB_UNIT3,X26.6' },
  { id: 'Ret_P1',  tag: 'Ret_P1',  label: 'Return Pump-1',                      on: true,  address: 'Ret_P1',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT2,X444.5' },
  { id: 'Ret_P2',  tag: 'Ret_P2',  label: 'Return Pump-2',                      on: false, address: 'Ret_P2',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT2,X444.5' },
  { id: 'Ret_P3',  tag: 'Ret_P3',  label: 'Return Pump-3',                      on: false, address: 'Ret_P3',  type: 'DO', system: 'cip', plcAddr: 'DB_UNIT2,X444.5' },
]

// CIP Sequence — step from live %DB_UNIT2.DBW2466 (steps 30–51 = CIP active)
// cipTotalSteps used for progress bar denominator (step 51 = 100%)
export const cipTotalSteps = 51
export const cipPhases = [
  { name: 'Water Rinse',         start: 30, end: 34, color: '#5BC5F2' },
  { name: 'Lye Circulation',     start: 35, end: 40, color: '#00d4aa' },
  { name: 'Acid Circulation',    start: 41, end: 46, color: '#f59e0b' },
  { name: 'Hot Water Rinse',     start: 47, end: 49, color: '#f97316' },
  { name: 'Final Flushing',      start: 50, end: 50, color: '#1C76BB' },
  { name: 'CIP Complete',        start: 51, end: 51, color: '#00d4aa' },
]

// Time-series (120 minutes)
export const cipSupplyTempHist = Array(120).fill(74.6)
export const cipReturnTempHist = Array(120).fill(68.3)
export const cipCondHistory    = Array(120).fill(0.42)
export const cipFlowHistory    = Array(120).fill(8500)
export const cipHotWaterHist   = Array(120).fill(78.2)
export const cipLyeHist        = Array(120).fill(72.1)
export const cipAcidHist       = Array(120).fill(64.8)


/* ══════════════════════════════════════════════════════════
   OVERVIEW helpers
   ══════════════════════════════════════════════════════════ */
export const systemSummaries = [
  {
    id: 'reception', name: 'Milk Reception', status: 'Running',
    kpis: [
      { label: 'Reception Flow', value: '12,450 LPH' },
      { label: 'Chiller Outlet', value: '4.8 °C' },
      { label: 'Total Received', value: '32,450 L' },
    ],
  },
  {
    id: 'pasteurizer', name: '5 KLPH Pasteuriser', status: 'Running',
    kpis: [
      { label: 'Holding Temp', value: '76.4 °C' },
      { label: 'Flow Rate',    value: '4,850 LPH' },
      { label: 'Product',      value: 'Milk' },
    ],
  },
  {
    id: 'cip', name: 'CIP System', status: 'Lye Circulation',
    kpis: [
      { label: 'Step',         value: '35 / 83' },
      { label: 'Conductivity', value: '0.42 mS/cm' },
      { label: 'Supply Temp',  value: '74.6 °C' },
    ],
  },
]

// Mini tank overview data for DashboardHome strip
export const miniTankOverview = [
  { id: 'BT',    name: 'Balance Tank', system: 'pasteurizer', high: true,  low: true,  tempValue: null  },
  { id: 'PMST',  name: 'PMST',      system: 'pasteurizer', high: false, low: true,  tempValue: null },
  { id: 'HW',    name: 'Hot Water', system: 'cip',         high: true,  low: true,  tempValue: 78.2 },
  { id: 'LYE',   name: 'Lye',       system: 'cip',         high: false, low: false, tempValue: 72.1 },
  { id: 'ACID',  name: 'Acid',      system: 'cip',         high: false, low: true,  tempValue: 64.8 },
]
