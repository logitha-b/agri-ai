import React, { Component, useState, useEffect } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Globe } from 'lucide-react'
import { NotificationPanel, Sidebar, Topbar } from './components'
import { initialFarmer } from './data/mockData'
import { Dashboard, DiseasePage, EnginePage, LandingPage, ProfilePage, ReportsPage, SettingsPage } from './pages'
import GovernmentSchemesPage from './pages/GovernmentSchemes'
import CropProductionPage from './pages/CropProduction'
import CropHealthPage from './pages/CropHealth'
import WaterRiskPage from './pages/WaterRisk'
import CropLossInsurancePage from './pages/CropLossInsurance'
import CashFlowPage from './pages/CashFlow'
import LacCulturePage from './pages/LacCulture'
import PearlCulturePage from './pages/PearlCulture'
import VoiceAssistantPage from './pages/VoiceAssistant'
import { useLanguage, LanguageProvider } from './context/LanguageContext'
import { domTranslator } from './utils/domTranslator'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('Page error caught:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center', background: '#fff', borderRadius: 12, margin: 24 }}>
          <h2 style={{ color: '#236341', marginBottom: 12 }}>Page notice</h2>
          <p style={{ color: '#555', marginBottom: 16 }}>{this.state.error?.message || 'Please refresh to continue.'}</p>
          <button className="button primary" onClick={() => { this.setState({ hasError: false }); window.location.reload() }}>
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function Workspace() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const { language, langVersion } = useLanguage()
  const [farmer, setFarmer] = useState(initialFarmer)
  const [schemeAnalysis, setSchemeAnalysis] = useState(null)
  const [productionAnalysis, setProductionAnalysis] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const onAssistantPage = location.pathname === '/assistant'

  useEffect(() => {
    domTranslator.retranslate(language)
  }, [location.pathname, langVersion, language])

  return (
    <div className="app-shell notranslate" translate="no">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} farmer={farmer} />
      <div className="app-main">
        <Topbar onMenu={() => setMenuOpen(true)} onProfile={() => navigate('/profile')} onBell={() => setNotifications(v => !v)} farmer={farmer} />
        <main className="route-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/dashboard" element={<Navigate to="/assistant" replace />} />
              <Route path="/schemes" element={<GovernmentSchemesPage onAnalysis={setSchemeAnalysis} />} />
              <Route path="/production" element={<CropProductionPage onPrediction={setProductionAnalysis} />} />
              <Route path="/crop-health" element={<CropHealthPage />} />
              <Route path="/water-risk" element={<WaterRiskPage />} />
              <Route path="/loss-insurance" element={<CropLossInsurancePage />} />
              <Route path="/cash-flow" element={<CashFlowPage />} />
              <Route path="/lac" element={<LacCulturePage />} />
              <Route path="/pearl" element={<PearlCulturePage />} />
              <Route path="/assistant" element={<VoiceAssistantPage />} />
              <Route path="/profile" element={<ProfilePage farmer={farmer} onSaved={setFarmer} />} />
              <Route path="/reports" element={<Navigate to="/assistant" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/disease" element={<DiseasePage />} />
              {['/crop-recommendation', '/market'].map(path => (
                <Route key={path} path={path} element={<EnginePage path={path} />} />
              ))}
              <Route path="/explainability" element={<Navigate to="/assistant" replace />} />
              <Route path="*" element={<Navigate to="/assistant" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
      {notifications && (
        <>
          <button className="panel-backdrop" aria-label="Close notifications" onClick={() => setNotifications(false)} />
          <NotificationPanel onClose={() => setNotifications(false)} />
        </>
      )}
    </div>
  )
}

function FloatingAssistantFab({ onAssistantPage }) {
  const { t } = useLanguage()
  if (onAssistantPage) return null
  return (
    <Link
      to="/assistant"
      className="assistant-fab"
      aria-label={t('askAgriAI', 'Ask Agri AI Assistant')}
      title={t('askAgriAI', 'Ask Agri AI Farm Assistant')}
    >
      <MessageCircle size={19} />
      <span>{t('askAgriAI', 'Ask Agri AI')}</span>
    </Link>
  )
}

function BrowserTranslateBanner({ language }) {
  const [detected, setDetected] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const check = () => {
      if (typeof document === 'undefined') return
      const isTranslated =
        document.documentElement.classList.contains('translated-ltr') ||
        document.documentElement.classList.contains('translated-rtl') ||
        document.body?.classList.contains('translated-ltr') ||
        document.body?.classList.contains('translated-rtl') ||
        Boolean(document.querySelector('font[style*="vertical-align"]'))

      if (isTranslated) {
        setDetected(true)
      }
    }
    check()
    const timer = setInterval(check, 1000)
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      clearInterval(timer)
      observer.disconnect()
    }
  }, [])

  if (!detected || dismissed || language !== 'en') return null

  return (
    <div
      className="browser-translate-warning notranslate"
      translate="no"
      style={{
        background: '#fffbe6',
        borderBottom: '1px solid #ffe58f',
        padding: '10px 18px',
        color: '#ad6800',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: 99999,
        position: 'sticky',
        top: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Globe size={16} style={{ flexShrink: 0 }} />
        <span>
          <b>Google Chrome Auto-Translate is active:</b> Chrome is automatically translating English text to Hindi. To see English, click the <b>Google Translate icon in your Chrome address bar</b> and choose <i>"Never translate this site"</i> or <i>"English"</i>.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss translation banner"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', color: '#ad6800', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  )
}

function AppContent() {
  const location = useLocation()
  const { language } = useLanguage()
  const onAssistantPage = location.pathname === '/assistant'

  return (
    <div className="app-root-wrapper notranslate" translate="no">
      <BrowserTranslateBanner language={language} />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/*" element={<Workspace />} />
        </Routes>
        <FloatingAssistantFab onAssistantPage={onAssistantPage} />
      </ErrorBoundary>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}
