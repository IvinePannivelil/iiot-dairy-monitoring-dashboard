import { useState, useRef, useEffect } from 'react'
import { Send, X, Trash2, Zap } from 'lucide-react'
import gooseLogo from '../assets/goose-logo.png'
import { useAppContext } from '../context/AppContext'
import { pastCycleLabels, cipPhases } from '../data'
import { useLocation } from 'react-router-dom'
import './GooseAssistant.css'

// ── Live value helper ───────────────────────────────────────────────
const fmt = (v, unit = '', decimals = 1) =>
  v != null && !isNaN(v) ? `${parseFloat(v).toFixed(decimals)} ${unit}`.trim() : 'N/A'

// ── Intent → response builder using real live data ─────────────────
async function buildReply(input, live) {
  const q = input.toLowerCase()

  const get = (tag) => {
    const raw = live[tag]
    if (raw == null) return null
    if (typeof raw === 'object' && raw.value !== undefined) return parseFloat(raw.value)
    return parseFloat(raw)
  }

  // ── RECEPTION ────────────────────────────────────────────────────
  if (q.includes('reception') || q.includes('unload') || q.includes('rcm') || q.includes('rmst')) {
    const flow    = get('FM1')
    const tt1     = get('TT1')
    const tt10    = get('TT2')
    const tt11    = get('TT6')
    const totRecep= get('TOT_RECEPTION')
    const vfd1    = get('VFD1_HZ')

    return [
      `🥛 Reception System — Live Snapshot`,
      `• Unloading Flow: ${fmt(flow, 'LPH', 0)}`,
      `• Raw Milk Inlet Temp (TT1): ${fmt(tt1, '°C')}`,
      `• RCM Tank Outlet Temp: ${fmt(tt10, '°C')}`,
      `• RMST Tank Outlet Temp: ${fmt(tt11, '°C')}`,
      `• Total Received: ${fmt(totRecep, 'L', 0)}`,
      `• VFD 1 Speed: ${fmt(vfd1, 'Hz')}`,
    ].join('\n')
  }

  // ── PASTEURIZER ───────────────────────────────────────────────────
  if (q.includes('pasteuriz') || q.includes('holding') || q.includes('past')) {
    const holdOut = get('AI4')
    const holdIn  = get('AI3')
    const inlet   = get('AI1')
    const outlet  = get('AI5')
    const mainHW  = get('AI6')
    const flow    = get('AI9')

    const tempOk  = holdOut != null && holdOut >= 72 && holdOut <= 85

    return [
      `🔥 Pasteurizer — Live Snapshot`,
      `• Holding Outlet Temp: ${fmt(holdOut, '°C')} ${tempOk ? '✅ IN RANGE' : '⚠️ OUT OF RANGE'}`,
      `• Holding Inlet Temp: ${fmt(holdIn, '°C')}`,
      `• Product Inlet: ${fmt(inlet, '°C')}`,
      `• Product Outlet: ${fmt(outlet, '°C')}`,
      `• Main Hot Water: ${fmt(mainHW, '°C')}`,
      `• Flow Rate: ${fmt(flow, 'LPH', 0)}`,
    ].join('\n')
  }

  // ── CIP ───────────────────────────────────────────────────────────
  if (q.includes('cip') || q.includes('clean') || q.includes('lye') || q.includes('acid')) {
    const supplyT = get('CT5')
    const returnT = get('CT6')
    const flow    = get('CF1')
    const cond    = get('CC1')
    const hwTank  = get('CT2')
    const lyeTank = get('CT3')
    const acidTank= get('CT4')

    return [
      `🧪 CIP System — Live Snapshot`,
      `• Supply Line Temp: ${fmt(supplyT, '°C')}`,
      `• Return Line Temp: ${fmt(returnT, '°C')}`,
      `• Supply Flow: ${fmt(flow, 'LPH', 0)}`,
      `• Conductivity: ${fmt(cond, 'mS/cm', 2)}`,
      `• Hot Water Tank: ${fmt(hwTank, '°C')}`,
      `• Lye Tank: ${fmt(lyeTank, '°C')}`,
      `• Acid Tank: ${fmt(acidTank, '°C')}`,
    ].join('\n')
  }

  // ── TEMPERATURE queries ───────────────────────────────────────────
  if (q.includes('temp') || q.includes('°c') || q.includes('heat')) {
    const r_tt1 = get('TT1'), r_tt2 = get('TT2'), r_tt3 = get('TT3')
    const p_ai3 = get('AI3'), p_ai4 = get('AI4'), p_ai6 = get('AI6')
    const c_ct2 = get('CT2'), c_ct5 = get('CT5'), c_ct6 = get('CT6')
    
    return [
      `🌡️ Live Temperatures by System`,
      ``,
      `🥛 RECEPTION`,
      `• Raw Milk Inlet (TT1): ${fmt(r_tt1, '°C')}`,
      `• Separator Inlet (TT2): ${fmt(r_tt2, '°C')}`,
      `• Separator Outlet (TT3): ${fmt(r_tt3, '°C')}`,
      ``,
      `🔥 PASTEURIZER`,
      `• Holding Inlet: ${fmt(p_ai3, '°C')}`,
      `• Holding Outlet: ${fmt(p_ai4, '°C')}`,
      `• Main Hot Water: ${fmt(p_ai6, '°C')}`,
      ``,
      `🧪 CIP`,
      `• Hot Water Tank (CT2): ${fmt(c_ct2, '°C')}`,
      `• Supply Line (CT5): ${fmt(c_ct5, '°C')}`,
      `• Return Line (CT6): ${fmt(c_ct6, '°C')}`,
    ].join('\n')
  }

  // ── FLOW queries ─────────────────────────────────────────────────
  if (q.includes('flow')) {
    const recepFlow = get('FM1')
    const pastFlow  = get('AI9')
    const cipFlow   = get('CF1')
    return [
      `💧 Flow Rates — Live`,
      `• Reception Unload Flow: ${fmt(recepFlow, 'LPH', 0)}`,
      `• Pasteurizer Flow: ${fmt(pastFlow, 'LPH', 0)}`,
      `• CIP Supply Flow: ${fmt(cipFlow, 'LPH', 0)}`,
    ].join('\n')
  }

  // ── ALARMS / STATUS ───────────────────────────────────────────────
  if (q.includes('alarm') || q.includes('status') || q.includes('overview') || q.includes('all')) {
    try {
      const apiBase = import.meta.env.VITE_IIH_BASE_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/v1/alarms`);
      const alarms = await res.json();
      const active = alarms.filter(a => a.severity === 'critical' || a.severity === 'warning');
      
      if (active.length === 0) {
        return `✅ Plant Overview — All Clear\n\nNo critical or warning alarms are currently active in the history log.`
      }
      
      const recent = active.slice(0, 5);
      return `🚨 Plant Overview — ${active.length} active alarms in log\n\n` + 
             recent.map(a => `• [${a.severity.toUpperCase()}] ${a.source}: ${a.description}`).join('\n') + 
             (active.length > 5 ? `\n...and ${active.length - 5} more. Check Alarms tab.` : '');
    } catch (e) {
      return `⚠️ Unable to reach alarm database. Please check the Alarms tab manually.`;
    }
  }

  // ── CONDUCTIVITY ─────────────────────────────────────────────────
  if (q.includes('conduct')) {
    const cond = get('CC1')
    return `CIP Conductivity (CC1): ${fmt(cond, 'mS/cm', 2)}`
  }

  // ── DEFAULT ───────────────────────────────────────────────────────
  return `I can help with live data from all 3 systems. Try asking:\n• "Reception Status"\n• "Pasteurizer Holding Temp"\n• "CIP Status"\n• "Active Alarms"\n• "Flow Rates"\n• "Temperatures"`
}

// ── Quick chip definitions ──────────────────────────────────────────
const QUICK_CHIPS = [
  { label: '🥛 Reception',   query: 'Reception Status' },
  { label: '🔥 Pasteurizer', query: 'Pasteurizer Status' },
  { label: '🧪 CIP',         query: 'CIP Status' },
  { label: '💧 Flow Rates',  query: 'Flow Rates' },
  { label: '🌡️ Temps',       query: 'Temperatures' },
  { label: '🚨 Alarms',      query: 'Active Alarms' },
]

// ── Component ───────────────────────────────────────────────────────
export default function GooseAssistant() {
  const { liveParams } = useAppContext()
  const location = useLocation()
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 Goose Assistant online.\n\nI have live access to Reception, Pasteurizer, and CIP sensor data. Ask me anything or use the quick buttons below!' },
  ])
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const bottomRef             = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = async (text) => {
    const userMsg = (text || input).trim()
    if (!userMsg) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setTyping(true)

    const reply = await buildReply(userMsg, liveParams)
    setMessages(m => [...m, { role: 'bot', text: reply }])
    setTyping(false)
  }

  const clearChat = () => {
    setMessages([{ role: 'bot', text: '🔄 Chat cleared. Ask me about Reception, Pasteurizer, or CIP!' }])
  }

  if (location.pathname === '/reports') return null

  return (
    <>
      <button className="goose-fab glass-button" onClick={() => setOpen(o => !o)} title="Goose Assistant">
        {open ? <X size={22} /> : <img src={gooseLogo} alt="Goose Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />}
      </button>

      {open && (
        <div className="goose-window glass-panel">
          {/* Header */}
          <div className="goose-header">
            <img src={gooseLogo} alt="Goose" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            <span>Goose Assistant</span>
            <span className="goose-live-badge"><Zap size={9} /> LIVE</span>
            <button className="goose-clear-btn" onClick={clearChat} title="Clear chat"><Trash2 size={13} /></button>
          </div>

          {/* Messages */}
          <div className="goose-messages">
            {messages.map((m, i) => (
              <div key={i} className={`goose-msg ${m.role}`}>
                {m.text.split('\n').map((line, j) => (
                  <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>
                ))}
              </div>
            ))}
            {typing && (
              <div className="goose-msg bot goose-typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips */}
          <div className="goose-chips">
            {QUICK_CHIPS.map(c => (
              <button key={c.label} className="chip" onClick={() => send(c.query)}>{c.label}</button>
            ))}
          </div>

          {/* Input */}
          <form className="goose-input" onSubmit={e => { e.preventDefault(); send() }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about Reception, Pasteurizer, or CIP…"
              autoComplete="off"
            />
            <button type="submit" className="send-btn"><Send size={16} /></button>
          </form>
        </div>
      )}
    </>
  )
}
