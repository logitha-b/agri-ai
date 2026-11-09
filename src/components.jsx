import { useLanguage } from './context/LanguageContext'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  Activity, ArrowRight, Bell, BrainCircuit, Bug, ChartNoAxesCombined, Check, ChevronDown,
  CircleHelp, Droplets, FileText, Fish, FlaskConical, Gauge, HeartPulse, Leaf, MapPin, Menu,
  Search, Send, Settings, Shield, ShieldCheck, Sparkles, Sprout, TrendingUp, Waves, Wheat, X, CloudSun, Globe,
} from 'lucide-react'
import { navEngines } from './data/mockData'

const icons = { ShieldCheck, Wheat, HeartPulse, Activity, Waves, Leaf, TrendingUp, Shield, Bug, Fish, BrainCircuit, ChartNoAxesCombined, Sparkles }
export const engineCards = navEngines.map(([title, path, icon]) => ({ title, path, icon: icons[icon] }))

export const ROUTE_TO_KEY = {
  '/dashboard': 'dashboard',
  '/profile': 'farmerProfile',
  '/schemes': 'schemes',
  '/production': 'production',
  '/crop-health': 'cropHealth',
  '/disease': 'disease',
  '/water-risk': 'waterRisk',
  '/crop-recommendation': 'cropRecommendation',
  '/market': 'market',
  '/loss-insurance': 'cropLoss',
  '/lac': 'lac',
  '/pearl': 'pearl',
  '/cash-flow': 'cashFlow',
  '/assistant': 'aiAssistant',
  '/reports': 'reports',
  '/settings': 'settings',
}

const GROUP_KEYS = {
  'OVERVIEW': 'navOverview',
  'FARMER': 'navFarmer',
  'INTELLIGENCE ENGINES': 'navEngines',
  'WORKSPACE': 'navWorkspace',
}

const groups = [
  { label: 'FARMER', items: [['Farmer Profile', '/profile', Sprout]] },
  { label: 'INTELLIGENCE ENGINES', items: navEngines.map(([title, path, icon]) => [title, path, icons[icon]]) },
  { label: 'WORKSPACE', items: [['Settings', '/settings', Settings]] },
]

export function Sidebar({ open, onClose, farmer }) {
  const { t, language, setLanguage, languages = [] } = useLanguage()
  return <>
    {open && <button className="scrim" aria-label="Close menu" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <Link to="/" className="brand" onClick={onClose}>
        <span className="brand-icon"><Leaf size={21}/></span>
        <span><b>{t('brandName', 'AGRI-ECONOMIC')}</b><small>{t('platformSub', 'INTELLIGENCE PLATFORM')}</small></span>
      </Link>
      <div className="sidebar-kicker"><i/> {t('fieldIntel', 'FIELD INTELLIGENCE')} <small>v1.0</small></div>
      <nav className="sidebar-nav">
        {groups.map(group => (
          <div className="nav-group" key={group.label}>
            <div className="nav-title">{t(GROUP_KEYS[group.label] || group.label, group.label) || t(group.label, group.label)}</div>
            {group.items.map(([title, path, Icon]) => {
              const localizedTitle = t(ROUTE_TO_KEY[path] || title, title) || t(title, title)
              const isAssistant = path === '/assistant' || title === 'AI Assistant' || title === 'AI Voice Agent' || String(title).toLowerCase().includes('assistant')
              return (
                <NavLink
                  to={path}
                  key={path}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} />
                  <span>{localizedTitle}</span>
                  {isAssistant && <small>{t('core', 'CORE')}</small>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-lang-selector notranslate" translate="no" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 8, marginBottom: 8 }}>
          <Globe size={15} style={{ color: '#80b896', flexShrink: 0 }} />
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="notranslate"
            translate="no"
            style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: 13, width: '100%', cursor: 'pointer', outline: 'none' }}
            aria-label="Select platform language"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code} className="notranslate" translate="no" style={{ background: '#1c3829', color: '#fff' }}>
                {l.native} ({l.name})
              </option>
            ))}
          </select>
        </div>
        <div className="season">
          <CloudSun size={18} />
          <span><b>{t('kharifSeason', 'Kharif season')}</b><small>{t('seasonWeek', 'Season 2026 · Week 8')}</small></span>
          <ChevronDown size={15} />
        </div>
        <div className="sidebar-user">
          <span className="avatar">{farmer?.name?.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase() || 'RK'}</span>
          <span><b>{farmer?.name || 'R. Kumar'}</b><small>{t('farmerAccount', 'Farmer account')}</small></span>
          <i />
        </div>
      </div>
    </aside>
  </>
}

export function Topbar({ onMenu, onProfile, onBell, farmer }) {
  const { language, setLanguage, t, languages } = useLanguage()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const results = engineCards.filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
  return <header className="topbar">
    <button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={20}/></button>
    <div className="breadcrumb">{t('workspace', 'Workspace')} <span>/</span> <b>{t('intelligence', 'Intelligence')}</b></div>
    <div className="topbar-actions">
      <div className="search-box">
        <Search size={16}/>
        <input
          placeholder={t('searchPlaceholder', 'Search intelligence…')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          aria-label="Search intelligence"
        />
        <kbd>⌘ K</kbd>
        {searchOpen && query && (
          <div className="search-results">
            {results.length ? results.map(item => (
              <Link key={item.path} to={item.path} onClick={() => { setQuery(''); setSearchOpen(false) }}>
                {t(ROUTE_TO_KEY[item.path], item.title)}
                <ArrowRight size={14} />
              </Link>
            )) : <span>No matching engines</span>}
          </div>
        )}
        {searchOpen && query && <button className="search-close" aria-label="Close search" onClick={() => setSearchOpen(false)} />}
      </div>
      <div className="location"><MapPin size={15} />{farmer?.district || 'Thiruvallur'}, {farmer?.state || 'Tamil Nadu'}</div>
      <div className="language-selector-wrap notranslate" translate="no" title="Select platform language">
        <Globe size={15} style={{ color: '#236341', flexShrink: 0 }} />
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="topbar-language-select notranslate"
          translate="no"
          aria-label="Select language"
        >
          {languages.map(l => (
            <option key={l.code} value={l.code} className="notranslate" translate="no">
              {l.native} ({l.name})
            </option>
          ))}
        </select>
      </div>
      <button className="icon-button bell" aria-label="Notifications" onClick={onBell}><Bell size={19} /><i /></button>
      <button className="profile-button" onClick={onProfile}>
        <span className="avatar">{farmer?.name?.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase() || 'RK'}</span>
        <ChevronDown size={14} />
      </button>
    </div>
  </header>
}

export function NotificationPanel({ onClose }) {
  const { t } = useLanguage()
  const notes = [
    ['Rainfall anomaly detected','Rainfall is 12% above seasonal average.','12 min ago',CloudSun],
    ['Crop health observation','Paddy Field A NDVI improved this week.','2 hours ago',HeartPulse],
    ['Market price update','Chennai paddy rate increased by ₹1.50/kg.','Today, 9:30 AM',TrendingUp],
    ['PMFBY deadline approaching','Review documents before 15 October 2026.','Yesterday',ShieldCheck],
  ]
  return <div className="notifications"><div className="notification-heading"><div><b>{t('notifications', 'Notifications')}</b><small>{t('4 updates for your farm', '4 updates for your farm')}</small></div><button className="icon-button" onClick={onClose} aria-label="Close notifications"><X size={17}/></button></div>{notes.map(([title,copy,time,Icon],i)=><div className="notification-row" key={title}><span className={`notification-glyph tone-${i}`}><Icon size={17}/></span><div><b>{title}</b><p>{copy}</p><small>{time}</small></div></div>)}<button className="quiet-button" onClick={onClose}>{t('Mark all as read', 'Mark all as read')} <Check size={15}/></button></div>
}

export function PageHeader({ eyebrow='FARM INTELLIGENCE', title, description, action, children }) {
  const { t } = useLanguage()
  return <div className="page-header"><div><div className="eyebrow">{t(eyebrow, eyebrow)}</div><h1>{t(title, title)}</h1><p>{t(description, description)}</p></div><div className="header-actions">{children}{action}</div></div>
}

export function Button({ children, kind='primary', ...props }) {
  const { t } = useLanguage()
  const content = typeof children === 'string' ? t(children, children) : children
  return <button className={`button ${kind}`} {...props}>{content}</button>
}

export function Card({ title, subtitle, action, children, className='' }) {
  const { t } = useLanguage()
  const trTitle = typeof title === 'string' ? t(title, title) : title
  const trSub = typeof subtitle === 'string' ? t(subtitle, subtitle) : subtitle
  return <section className={`card ${className}`}><header className="card-header"><div>{title&&<h2>{trTitle}</h2>}{subtitle&&<p>{trSub}</p>}</div>{action}</header>{children}</section>
}

export function StatCard({ label, value, change, note, icon: Icon=Activity, tone='green' }) {
  const { t } = useLanguage()
  return <article className="stat-card"><div className="stat-label">{t(label, label)}<span className={`stat-glyph ${tone}`}><Icon size={18}/></span></div><strong className="stat-value">{value}</strong><div className="stat-foot">{change&&<b className={change.startsWith('-')?'down':''}>↗ {change}</b>}<span>{t(note, note)}</span></div></article>
}

export function Field({ label, children }) {
  const { t } = useLanguage()
  return <label className="field"><span>{t(label, label)}</span>{children}</label>
}

export function Select({ options, ...props }) {
  const { t } = useLanguage()
  const safeList = Array.isArray(options) ? options.filter(opt => opt !== undefined && opt !== null) : []
  return <select {...props}>
    {safeList.map((option, idx) => {
      if (typeof option === 'string' || typeof option === 'number') {
        return <option key={`${option}-${idx}`} value={option}>{t(String(option), String(option))}</option>
      }
      if (option && typeof option === 'object') {
        const val = option.value !== undefined ? option.value : (option.label !== undefined ? option.label : '')
        const lbl = option.label !== undefined ? option.label : val
        return <option key={option.key || `${val}-${idx}`} value={val}>{t(String(lbl), String(lbl))}</option>
      }
      return null
    })}
  </select>
}

export function RiskBadge({ value='Low' }) {
  const { t } = useLanguage()
  const tone=/high|severe/i.test(value)?'high':/moderate|attention|medium/i.test(value)?'moderate':'low'
  return <span className={`risk-badge ${tone}`}><i/>{t(value, value)}</span>
}

export function InputCard({ title, subtitle, onSubmit, submitLabel='Update analysis', children, columns=2, action }) {
  const { t } = useLanguage()
  return <form className="card input-card" onSubmit={e=>{e.preventDefault();onSubmit?.(e)}}><header className="card-header" style={action ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 } : undefined}><div><h2>{t(title, title)}</h2>{subtitle&&<p>{t(subtitle, subtitle)}</p>}</div>{action}</header><div className={`input-grid columns-${columns}`}>{children}</div>{onSubmit&&<Button type="submit">{t(submitLabel, submitLabel)}<ArrowRight size={16}/></Button>}</form>
}

export function Insight({ title='AI field insight', badge='SAMPLE', children }) {
  const { t } = useLanguage()
  const label=title==='AGMARKNET report insight'?'SOURCE REPORT':badge
  return <div className="insight"><span><BrainCircuit size={19}/></span><div><b>{t(title, title)}</b><p>{typeof children === 'string' ? t(children, children) : children}</p></div><small>{t(label, label)}</small></div>
}

export function Notice({ children='Educational prototype using illustrative sample data. Not official guidance, a diagnosis, or a guaranteed forecast.' }) {
  const { t } = useLanguage()
  const content = typeof children === 'string' ? t(children, children) : children
  return <div className="notice"><ShieldCheck size={16}/>{content}</div>
}

export function Progress({ label, value, color='green' }) {
  return <div className="progress-item"><div><span>{label}</span><b>{value}%</b></div><div className="progress-track"><i className={color} style={{width:`${Math.min(100,Math.abs(value))}%`}}/></div></div>
}

export function Table({ columns, rows }) {
  return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.id||row.market||row.name||i}>{columns.map(c=><td key={c.key}>{c.render?c.render(row[c.key],row):row[c.key]}</td>)}</tr>)}</tbody></table></div>
}

export function UploadBox({ label='Drop an image here or browse', onFile, image }) {
  const { t } = useLanguage()
  const [preview,setPreview]=useState('')
  const [dragging,setDragging]=useState(false)
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
  const take = file => { if(file&&file.type.startsWith('image/')) { setPreview(URL.createObjectURL(file)); onFile?.(file) } }
  return <label className={`upload-box ${dragging?'dragging':''} ${preview||image?'has-image':''}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);take(e.dataTransfer.files[0])}}>
    {preview||image?<img src={preview||image} alt={t('Selected crop image', 'Selected crop image')}/>:<><span className="upload-glyph"><ArrowRight size={18}/></span><b>{t(label, label)}</b><small>{t('JPG or PNG · up to 10 MB', 'JPG or PNG · up to 10 MB')}</small></>}
    <input type="file" accept="image/*" onChange={e=>take(e.target.files?.[0])}/>
  </label>
}

export function FarmMap({ label='FIELD OVERVIEW' }) {
  return <div className="farm-map"><svg viewBox="0 0 500 260" preserveAspectRatio="none" aria-label="Illustrative farm field map"><path d="M30 30L170 58 157 135 35 150Z" fill="#80a56d"/><path d="M180 60L322 34 346 114 165 137Z" fill="#a5bc7e"/><path d="M355 35L474 53 462 143 352 120Z" fill="#70945e"/><path d="M53 165L155 145 185 240 65 245Z" fill="#a2b77b"/><path d="M208 152L345 126 370 228 196 241Z" fill="#6e9d60"/><path d="M380 151L460 153 492 245 382 232Z" fill="#88aa6e"/><path d="M0 175C90 130 120 225 210 170S355 130 500 178" fill="none" stroke="#dce8d7" strokeWidth="24"/><circle cx="270" cy="184" r="7" fill="#fff" stroke="#286b4b" strokeWidth="3"/></svg><span className="map-label">{label}</span><span className="map-pin"><MapPin size={15}/>13.14° N · 79.91° E</span></div>
}

export function Assistant({ onClose, farmer }) {
  const [messages,setMessages]=useState([{from:'assistant',text:'Vanakkam! Ask me about your crop, water, market, or farm cash flow. I use this demo’s sample data.'}])
  const [text,setText]=useState('')
  const submit=e=>{e.preventDefault();if(!text.trim())return;const q=text.trim();let response='The real-data crop-yield engine is not available until verified agricultural records are loaded and evaluated. Open Crop Production for current data status; no yield forecast is generated.';if(/market|price|sell/i.test(q))response='Market & Profit uses the supplied AGMARKNET market-price snapshot dated 13 October 2026. Open the engine to filter reported modal prices by commodity, state, and district; prices are shown per quintal, and the report is not a live quote.';else if(/water|rain|flood/i.test(q))response='Sample conditions show adequate water availability, 68% reservoir storage, and low flood risk. Continue monitoring local alerts.';else if(/lac|host/i.test(q))response='The sample lac score is 82/100. Flemingia semialata is shown as highly suitable; confirm locally before investing.';setMessages(v=>[...v,{from:'user',text:q},{from:'assistant',text:response}]);setText('')}
  return <aside className="assistant-panel"><header><span><BrainCircuit size={18}/></span><div><b>Agri Intelligence Assistant</b><small>Sample-data assistant</small></div><button className="icon-button" onClick={onClose} aria-label="Close assistant"><X size={18}/></button></header><div className="assistant-context">{farmer?.name||'R. Kumar'} · {farmer?.crop||'Paddy'} · {farmer?.landArea||'2.5'} acres · {farmer?.district||'Thiruvallur'}</div><div className="assistant-messages">{messages.map((m,i)=><div key={i} className={`message ${m.from}`}>{m.text}</div>)}</div><div className="quick-asks">{['How is my crop?','Market prices','Lac suitability'].map(q=><button key={q} onClick={()=>setText(q)}>{q}</button>)}</div><form className="assistant-form" onSubmit={submit}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Ask about your farm…" aria-label="Message assistant"/><button aria-label="Send"><Send size={17}/></button></form><small className="assistant-disclaimer">Answers are illustrative and use mock data.</small></aside>
}
