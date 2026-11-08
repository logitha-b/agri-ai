import { useLanguage } from '../../context/LanguageContext'
// Shared score bar used in multiple recommendation components

const DIM_LABELS = {
  agronomic:  { label: 'Agronomic fit',    color: '#3a8052' },
  flood_risk: { label: 'Flood safety',     color: '#5c91a6' },
  yield_hist: { label: 'Yield potential',  color: '#d4a332' },
  market:     { label: 'Market price',     color: '#7c4db8' },
  economics:  { label: 'Economics',        color: '#c0583a' },
}

export function DimensionBars({ scores }) {
  const { t } = useLanguage()
  if (!scores) return null
  return (
    <div className="rc-score-bars">
      {Object.entries(scores).map(([key, val]) => {
        const { label, color } = DIM_LABELS[key] || { label: key, color: '#888' }
        const pct = Math.round((val || 0) * 100)
        return (
          <div key={key} className="rc-score-row">
            <span className="rc-score-label">{t(label, label)}</span>
            <div className="rc-score-track">
              <div className="rc-score-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="rc-score-val">{pct}</span>
          </div>
        )
      })}
    </div>
  )
}

export function FinalScoreBadge({ score, rank }) {
  const { t } = useLanguage()
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 70 ? '#166534' : pct >= 50 ? '#854d0e' : '#991b1b'
  const bg    = pct >= 70 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#fee2e2'
  return (
    <div className="rc-final-badge" style={{ background: bg, color }}>
      <span className="rc-final-num">{pct}</span>
      <span className="rc-final-label">
        / 100{rank === 1 ? ` · ${t('Best match', 'Best match')}` : rank === 2 ? ` · ${t('2nd', '2nd')}` : rank === 3 ? ` · ${t('3rd', '3rd')}` : ''}
      </span>
    </div>
  )
}
