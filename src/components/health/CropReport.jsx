import { AlertTriangle, CheckCircle2, Droplets, Leaf, ShieldCheck, Sprout, Wheat } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useMemo } from 'react'
import { localizeReport } from '../../services/contentLocalization'

function Section({ icon, eyebrow, title, badge, children }) {
  const { t } = useLanguage()
  return (
    <div className="ch2-report-section">
      <div className="ch2-report-section-head">
        <span className="ch2-report-icon">{icon}</span>
        <div>
          <span className="ch2-eyebrow">{t(eyebrow, eyebrow)}</span>
          <h3>{t(title, title)}</h3>
        </div>
        {badge && <span className={`ch2-conf-badge ch2-conf-${badge}`}>{t(badge, badge)} {t('confidence', 'confidence')}</span>}
      </div>
      {children}
    </div>
  )
}

function DataRow({ label, value, note }) {
  const { t } = useLanguage()
  return (
    <div className="ch2-report-row">
      <span>{t(label, label)}</span>
      <div><b>{t(value, value)}</b>{note && <small>{t(note, note)}</small>}</div>
    </div>
  )
}

function KindBadge({ kind }) {
  const { t } = useLanguage()
  const map = {
    calculated: ['ch2-kind-calc', t('CALCULATED', 'CALCULATED')],
    estimated:  ['ch2-kind-est',  t('ESTIMATED', 'ESTIMATED')],
    satellite:  ['ch2-kind-sat',  t('SATELLITE', 'SATELLITE')],
    measured:   ['ch2-kind-meas', t('MEASURED', 'MEASURED')],
    unavailable:['ch2-kind-na',   t('UNAVAILABLE', 'UNAVAILABLE')],
    modelled:   ['ch2-kind-mod',  t('MODELLED', 'MODELLED')],
  }
  const [cls, label] = map[kind] || ['ch2-kind-na', t(kind?.toUpperCase() || '—', kind?.toUpperCase() || '—')]
  return <span className={`ch2-kind-badge2 ${cls}`}>{label}</span>
}

// ── Supplier fallback (shown when Overpass API is unavailable) ─────────────
function SupplierFallback({ lat, lng, compact = false }) {
  const { t } = useLanguage()
  const hasCoords = lat != null && lng != null

  const links = [
    {
      icon: '🗺️',
      label: t('Google Maps — nearby agri shops', 'Google Maps — nearby agri shops'),
      url: hasCoords
        ? `https://www.google.com/maps/search/agricultural+shop/@${lat},${lng},14z`
        : 'https://www.google.com/maps/search/agricultural+supply+shop',
      desc: t('Search "agricultural shop" near your field on Google Maps', 'Search "agricultural shop" near your field on Google Maps'),
    },
    {
      icon: '📞',
      label: t('JustDial — agri input dealers', 'JustDial — agri input dealers'),
      url: 'https://www.justdial.com/search?q=agricultural+inputs+fertilizer',
      desc: t('Find fertiliser and seed dealers near you on JustDial', 'Find fertiliser and seed dealers near you on JustDial'),
    },
    {
      icon: '🛒',
      label: t('IndiaMart — agricultural supplies', 'IndiaMart — agricultural supplies'),
      url: 'https://www.indiamart.com/search.mp?ss=agricultural+inputs',
      desc: t('Browse agricultural input suppliers on IndiaMart', 'Browse agricultural input suppliers on IndiaMart'),
    },
    {
      icon: '🏛️',
      label: t('Nearest Krishi Vigyan Kendra (KVK)', 'Nearest Krishi Vigyan Kendra (KVK)'),
      url: 'https://icar.org.in/kvk',
      desc: t('KVKs provide free soil testing, seed, and input guidance', 'KVKs provide free soil testing, seed, and input guidance'),
    },
  ]

  if (compact) {
    return (
      <div className="ch2-supp-fallback-compact">
        <span>{t('Also search:', 'Also search:')}</span>
        {links.slice(0, 3).map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.icon} {l.label} ↗</a>
        ))}
      </div>
    )
  }

  return (
    <div className="ch2-supp-fallback">
      <div className="ch2-supp-fallback-head">
        <b>{t('Find suppliers directly', 'Find suppliers directly')}</b>
        <small>
          {hasCoords
            ? t('Links use your confirmed field coordinates where supported.', 'Links use your confirmed field coordinates where supported.')
            : t('Confirm your field location to get location-specific search links.', 'Confirm your field location to get location-specific search links.')}
        </small>
      </div>
      <div className="ch2-supp-links">
        {links.map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="ch2-supp-link">
            <span className="ch2-supp-link-icon">{l.icon}</span>
            <div>
              <b>{l.label}</b>
              <small>{l.desc}</small>
            </div>
            <span className="ch2-supp-link-arrow">↗</span>
          </a>
        ))}
      </div>
      <p className="ch2-report-note" style={{marginTop:8}}>
        {t('Never share personal or financial details with unverified suppliers. Prefer dealers registered with your state Agriculture Department or Krishi Vigyan Kendra.')}
      </p>
    </div>
  )
}

export default function CropReport({ report: rawReport, crop, sowingDate }) {
  const { t, language } = useLanguage()

  const report = useMemo(() => {
    return localizeReport(rawReport, language)
  }, [rawReport, language])

  if (!report) {
    return (
      <div className="ch2-report-card ch2-report-loading">
        <Sprout size={26} />
        <b>{t('Generating crop health report…')}</b>
        <p>{t('Fetching weather, soil, and agronomic calendar data for your field.')}</p>
      </div>
    )
  }

  if (report.error) {
    return (
      <div className="ch2-report-card ch2-report-error">
        <AlertTriangle size={22} />
        <b>{t('Report could not be generated')}</b>
        <p>{t(report.error, report.error)}</p>
      </div>
    )
  }

  const gs   = report.growth_stage || {}
  const he   = report.harvest_estimate || {}
  const veg  = report.vegetation_condition || {}
  const irr  = report.irrigation_recommendation || {}
  const fert = report.fertiliser_recommendation || {}
  const prob = report.problems_and_remedies || []
  const supp = report.nearby_suppliers || {}
  const src  = report.data_sources || []

  return (
    <div className="ch2-report-card">
      {/* Header */}
      <div className="ch2-report-head">
        <span className="ch2-report-head-icon"><Leaf size={20} /></span>
        <div>
          <span className="ch2-eyebrow">{t('04 · AI CROP HEALTH REPORT')}</span>
          <h2>{t(report.crop, report.crop)}{report.variety && report.variety !== 'Not specified' ? ` · ${t(report.variety, report.variety)}` : ''}</h2>
          <p>{t('Sown:', 'Sown:')} {report.sowing_date} · {t('Report date:', 'Report date:')} {report.report_date}</p>
        </div>
      </div>

      {/* ── A. Growth stage ── */}
      {gs.available !== false && (
        <Section icon={<Sprout size={18}/>} eyebrow={t('CROP STATUS')} title={t('Growth stage')} badge={gs.confidence}>
          <div className="ch2-stage-display">
            <div className="ch2-stage-name">{t(gs.current_stage, gs.current_stage)}</div>
            <div className="ch2-stage-days">{t(`Day ${gs.days_after_sowing} of ${gs.total_crop_duration_days}`)}</div>
            <div className="ch2-stage-bar-wrap">
              <div className="ch2-stage-bar-fill" style={{ width: `${gs.progress_pct}%` }} />
            </div>
            <div className="ch2-stage-ends">
              <span>{t('Sowing')}</span><b>{gs.progress_pct}%</b><span>{t('Harvest')}</span>
            </div>
          </div>
          <p className="ch2-report-note">{t(gs.note, gs.note)}</p>
          <KindBadge kind={gs.data_kind} />
        </Section>
      )}

      {/* ── A. Vegetation condition ── */}
      <Section icon={<Leaf size={18}/>} eyebrow={t('VEGETATION CONDITION')} title={t('Satellite vegetation status')} badge={veg.confidence}>
        {veg.available !== false ? (
          <>
            <p className="ch2-report-body">{t(veg.interpretation, veg.interpretation)}</p>
            <p className="ch2-report-note">{t(veg.limitations, veg.limitations)}</p>
          </>
        ) : (
          <p className="ch2-report-body ch2-unavail-text">{t(veg.reason, veg.reason)}</p>
        )}
        <KindBadge kind={veg.data_kind || 'unavailable'} />
      </Section>

      {/* ── B. Harvest estimate ── */}
      {he.available && (
        <Section icon={<Wheat size={18}/>} eyebrow={t('HARVEST PREDICTION')} title={t('Estimated harvest date')} badge={he.confidence}>
          <div className="ch2-harvest-row">
            <DataRow label={t('Estimated harvest')} value={he.estimated_harvest_date} note={`${t('±7 days', '±7 days')} · ${he.days_remaining} ${t('days remaining')}`} />
            <DataRow label={t('Earliest')} value={he.earliest} />
            <DataRow label={t('Latest')}   value={he.latest} />
          </div>
          <p className="ch2-report-note">{t(he.basis, he.basis)}</p>
          <p className="ch2-report-note">{t(he.note, he.note)}</p>
          <KindBadge kind={he.data_kind} />
        </Section>
      )}

      {/* ── C. Crop problems ── */}
      <Section icon={<AlertTriangle size={18}/>} eyebrow={t('CROP PROBLEMS & REMEDIES')} title={t('Identified issues and actions')}>
        {prob.map((p, i) => (
          <div key={i} className="ch2-problem-row">
            <div className="ch2-problem-head">
              <b>{t(p.issue, p.issue)}</b>
              <span className={`ch2-conf-badge ch2-conf-${p.confidence}`}>{t(p.confidence, p.confidence)}</span>
            </div>
            <DataRow label={t('Evidence')}    value={p.evidence} />
            <DataRow label={t('Cause')}       value={p.cause} />
            <DataRow label={t('Inspection')}  value={p.inspection} />
            <DataRow label={t('Remedy')}      value={p.remedy} />
            {p.important_note && (
              <div className="ch2-problem-note">
                <AlertTriangle size={13} /><span>{t(p.important_note, p.important_note)}</span>
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* ── D. Irrigation ── */}
      {irr.available && (
        <Section icon={<Droplets size={18}/>} eyebrow={t('IRRIGATION RECOMMENDATION')} title={`${t('IRRIGATION RECOMMENDATION')} — ${t(irr.current_stage, irr.current_stage)}`} badge={irr.confidence}>
          <p className="ch2-report-body">{t(irr.recommendation, irr.recommendation)}</p>
          {irr.weather_context && <p className="ch2-report-note">{t('Weather context')}: {t(irr.weather_context, irr.weather_context)}</p>}
          <p className="ch2-report-note">{t(irr.note, irr.note)}</p>
          <p className="ch2-report-source">{t('Source')}: {t(irr.source, irr.source)}</p>
          <KindBadge kind={irr.data_kind} />
        </Section>
      )}

      {/* ── E. Fertiliser ── */}
      {fert.available && (
        <Section icon={<span style={{fontSize:18}}>🌾</span>} eyebrow={t('FERTILISER & MANURE')} title={`${t('FERTILISER & MANURE')} — ${t(fert.current_stage, fert.current_stage)}`} badge={fert.confidence}>
          <p className="ch2-report-body">{t(fert.recommendation, fert.recommendation)}</p>
          <div className="ch2-manure-box">
            <b>{t('Organic manure')}</b>
            <p>{t(fert.organic_manure, fert.organic_manure)}</p>
          </div>
          {fert.soil_test_needed && (
            <div className="ch2-soil-test-cta">
              <ShieldCheck size={14} />
              <span>{t(fert.soil_test_note, fert.soil_test_note)}</span>
            </div>
          )}
          <p className="ch2-report-note">{t(fert.note, fert.note)}</p>
          <p className="ch2-report-source">{t('Source')}: {t(fert.source, fert.source)}</p>
          <KindBadge kind={fert.data_kind} />
        </Section>
      )}

      {/* ── Nearby suppliers ── */}
      <Section icon={<span style={{fontSize:18}}>🏪</span>} eyebrow={t('NEARBY AGRICULTURAL SUPPLIERS')} title={t('Input suppliers near your field')}>
        {!supp.available || supp.error_code ? (
          // Overpass unavailable — show direct search links instead
          <SupplierFallback lat={report.location?.lat} lng={report.location?.lng} />
        ) : supp.count === 0 ? (
          <div>
            <div className="ch2-suppliers-unavail">
              <p>{t(`No tagged agricultural suppliers found within ${supp.radius_km} km in OpenStreetMap for this area.`)}</p>
              <p className="ch2-report-note">{t('OpenStreetMap coverage of agri shops is incomplete in rural India. Use the links below to search directly.')}</p>
            </div>
            <SupplierFallback lat={report.location?.lat} lng={report.location?.lng} />
          </div>
        ) : (
          <div>
            <p className="ch2-report-note">
              {t(`Found ${supp.count} suppliers within ${supp.radius_km} km`)} · {supp.source}
            </p>
            <div className="ch2-suppliers-list">
              {(supp.suppliers || []).map((s, i) => (
                <div key={s.osm_id || i} className="ch2-supplier-row">
                  <div className="ch2-supplier-head">
                    <b>{s.name}</b>
                    <span className="ch2-supplier-dist">{s.distance_km} km</span>
                  </div>
                  <p>{s.address}</p>
                  <div className="ch2-supplier-meta">
                    {s.what_sold && <span>🛒 {t(s.what_sold, s.what_sold)}</span>}
                    {s.phone && <span>📞 {s.phone}</span>}
                    {s.opening_hours && <span>🕐 {s.opening_hours}</span>}
                    {s.website && <a href={s.website} target="_blank" rel="noreferrer">🌐 {t('Website')} ↗</a>}
                  </div>
                  <a href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}&zoom=16`} target="_blank" rel="noreferrer" className="ch2-supplier-map-link">{t('View on map')} ↗</a>
                </div>
              ))}
            </div>
            <p className="ch2-report-note" style={{marginTop:10}}>{t(supp.note, supp.note)}</p>
            <p className="ch2-attr">{supp.attribution}</p>
            <SupplierFallback lat={report.location?.lat} lng={report.location?.lng} compact />
          </div>
        )}
      </Section>

      {/* ── Data sources ── */}
      <div className="ch2-report-sources">
        <span className="ch2-eyebrow">{t('DATA SOURCES USED IN THIS REPORT', 'DATA SOURCES USED IN THIS REPORT')}</span>
        <div className="ch2-sources-grid">
          {src.map(s => (
            <div key={s.name} className={`ch2-source-row ${s.used ? '' : 'ch2-source-unused'}`}>
              <CheckCircle2 size={13} className={s.used ? 'ch2-src-icon-ok' : 'ch2-src-icon-no'} />
              <div>
                <b>{s.name}</b>
                <small>{t(s.note, s.note)}</small>
              </div>
              <KindBadge kind={s.type} />
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="ch2-report-disclaimer">
        <ShieldCheck size={14} />
        <span>{t(report.disclaimer, report.disclaimer)}</span>
      </div>
    </div>
  )
}
