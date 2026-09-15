import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useAppContext } from './context/AppContext'
import Header from './components/Header'
import DashboardHome from './pages/DashboardHome'
import Reception from './pages/Reception'
import Pasteurizer from './pages/Pasteurizer'
import CIP from './pages/CIP'
import Analytics from './pages/Analytics'
import Reports from './pages/Reports'
import Manual from './pages/Manual'

// New Pages from Tasks
import AlarmsPage from './pages/Alarms'

import ToastContainer from './components/ToastContainer'
import GooseAssistant from './components/GooseAssistant'
import PopupManager from './components/PopupManager'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function AppContent() {
  useKeyboardShortcuts();

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/reception" element={<Reception />} />
        <Route path="/pasteurizer" element={<Pasteurizer />} />
        <Route path="/cip" element={<CIP />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/manual" element={<Manual />} />
        
        {/* New App Routes */}
        <Route path="/alarms" element={<AlarmsPage />} />
      </Routes>
      <ToastContainer />
      <GooseAssistant />
      <PopupManager />
    </>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
