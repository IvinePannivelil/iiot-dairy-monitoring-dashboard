import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Menu, ChevronDown, Bell, Sun, Moon,
  LayoutDashboard, Milk, FlaskConical, Droplets,
  BarChart3, FileText, BookOpen, Activity
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import './Header.css'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/reception', label: 'Reception', icon: Milk },
  { to: '/pasteurizer', label: 'Pasteurizer', icon: FlaskConical },
  { to: '/cip', label: 'CIP', icon: Droplets },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/alarms', label: 'Alarms', icon: Bell },
  { to: '/manual', label: 'Manual', icon: BookOpen },
]

export default function Header() {
  const { dispatch } = useAppContext()
  const [theme, setTheme] = useState(() => localStorage.getItem('dairy-theme') || 'dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const navRef = useRef(null)
  const notifRef = useRef(null)
  const location = useLocation()

  // Dismissed alert IDs — persisted to localStorage so they survive page refresh
  const [dismissedIds, setDismissedIds] = useState(
    () => new Set(JSON.parse(localStorage.getItem('dairy-dismissed-alerts') || '[]'))
  )

  const alertCount = alerts.length

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('dairy-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }



  // Apply saved theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAlerts = () => {
    const dismissed = new Set(JSON.parse(localStorage.getItem('dairy-dismissed-alerts') || '[]'))
    fetch(`${import.meta.env.VITE_IIH_BASE_URL || 'http://localhost:5000'}/api/v1/alarms`)
      .then(res => res.json())
      .then(data => setAlerts(data.filter(a => !dismissed.has(a.id))))
      .catch(err => console.error('Failed to fetch active alarms', err));
  };

  useEffect(() => {
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 10000);

    const close = (e) => { 
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      clearInterval(iv)
    }
  }, [])

  const handleClearAll = () => {
    // Save all current alert IDs to localStorage so they don't come back on refresh
    const newDismissed = new Set([...dismissedIds, ...alerts.map(a => a.id)])
    localStorage.setItem('dairy-dismissed-alerts', JSON.stringify([...newDismissed]))
    setDismissedIds(newDismissed)
    setAlerts([])
    setNotifOpen(false)
  };

  // Also allow dismissing a single alert from the panel
  const handleDismissOne = (alertId) => {
    const newDismissed = new Set([...dismissedIds, alertId])
    localStorage.setItem('dairy-dismissed-alerts', JSON.stringify([...newDismissed]))
    setDismissedIds(newDismissed)
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  };

  return (
    <header className="app-header glass-panel">
      <div className="header-left" ref={navRef}>
        <button className="glass-button nav-trigger" onClick={() => setMenuOpen(o => !o)}>
          <Menu size={16} />
          <span>Navigation</span>
          <ChevronDown size={14} className={`chevron ${menuOpen ? 'open' : ''}`} />
        </button>
        {menuOpen && (
          <div className="nav-dropdown glass-panel">
            {/* eslint-disable-next-line react/jsx-key, no-unused-vars */}
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={`nav-link ${location.pathname === to ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                <Icon size={15} /> {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="header-center">
        <div className="logo-mark">
          <span className="logo-l">D</span>
          <span className="logo-text">Dairy Plant</span>
        </div>
        <span className="logo-sub">IIoT Monitoring</span>
      </div>

      <div className="header-right" ref={notifRef}>
        <div style={{ position: 'relative' }}>
          <button className="glass-button icon-btn bell-btn" title="Notifications" onClick={() => {setNotifOpen(!notifOpen); setMenuOpen(false)}}>
            <Bell size={16} />
            {alertCount > 0 && <span className="bell-badge">{alertCount}</span>}
          </button>
          
          {notifOpen && (
            <div className="nav-dropdown notif-dropdown glass-panel">
              <div className="nd-header">
                <h4>System Alerts</h4>
                {alerts.length > 0 && (
                  <span className="clear-btn" onClick={handleClearAll} style={{ cursor: 'pointer' }}>Clear all</span>
                )}
              </div>
              <div className="nd-body">
                {alerts.length > 0 ? (
                  alerts.map(alert => (
                    <div key={alert.id} className={`nd-item ${alert.severity}`}>
                      <span className="ndi-dot"></span>
                      <div className="ndi-text">
                        <strong>{alert.description || alert.title}</strong>
                        <span>{(alert._raw_time ? new Date(alert._raw_time).toLocaleString() : alert.timestamp)} • {alert.source}</span>
                      </div>
                      <button
                        className="ndi-dismiss"
                        onClick={() => handleDismissOne(alert.id)}
                        title="Dismiss this alert"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-dim)', fontSize: '14px', lineHeight: 1,
                          padding: '2px 4px', borderRadius: 4, flexShrink: 0,
                          opacity: 0.6, transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.opacity = 1}
                        onMouseLeave={e => e.target.style.opacity = 0.6}
                      >×</button>
                    </div>
                  ))
                ) : (
                  <div className="nd-item" style={{justifyContent: 'center', opacity: 0.6}}>No new alerts</div>
                )}
              </div>
            </div>
          )}
        </div>
        

        <button className="glass-button icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>


      </div>
    </header>
  )
}
