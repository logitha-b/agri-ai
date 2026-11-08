import { useLanguage } from '../../context/LanguageContext'
/**
 * RecoveryAdvisor — Step 5: Recovery recommendations based on crop type, 
 * damage type, growth stage, and available data.
 */
import { AlertTriangle, ArrowRight, CheckCircle2, Leaf, ShieldCheck, Sprout } from 'lucide-react'
import { Card } from '../../components'

const URGENCY_COLORS = {
  'Immediate':              '#c0392b',
  'Within 24–72 hours':     '#d35400',
  'As soon as possible':    '#d35400',
  'High — act within days': '#c0392b',
  'Within 2–3 days':        '#e67e22',
  'Within 3–5 days of flood recession': '#e67e22',
  'After initial damage assessment':    '#2d6a4f',
  'When drought stress first confirmed':'#e67e22',
  'As soon as flood recedes':           '#e67e22',
}

function urgencyColor(text) {
  if (!text) return '#68766c'
  for (const [key, color] of Object.entries(URGENCY_COLORS)) {
    if (text.toLowerCase().includes(key.toLowerCase().split(' ')[0])) return color
  }
  return '#68766c'
}

function RecCard({ rec, index }) {
  const color = urgencyColor(rec.urgency)
  return (
    <div className="loss-rec-card">
      <div className="loss-rec-num" style={{ background: color }}>{index + 1}</div>
      <div className="loss-rec-body">
        <div className="loss-rec-header">
          <b>{rec.action}</b>
          <span className="loss-rec-urgency" style={{ color }}>{rec.urgency}</span>
        </div>
        <p>{rec.reason}</p>
        <small className="loss-source">Source: {rec.source}</small>
      </div>
    </div>
  )
}

export default function RecoveryAdvisor({ assessment }) {
  const { t } = useLanguage()
  if (!assessment) return null
  const recs = assessment.recovery_recommendations || []
  const { incident, production_loss } = assessment

  // Group by urgency tier
  const immediate = recs.filter(r => /immediate|24|urgent|high|asap/i.test(r.urgency))
  const soon      = recs.filter(r => !immediate.includes(r) && /days|recedes|weeks/i.test(r.urgency))
  const later     = recs.filter(r => !immediate.includes(r) && !soon.includes(r))

  return (
    <div className="page">
      {/* Summary strip */}
      <div className="loss-recovery-header">
        <Sprout size={20} className="loss-recovery-icon" />
        <div>
          <b>Recovery Plan — {incident?.crop} ({incident?.incident_type?.replace('_', ' ')})</b>
          <p>
            {production_loss?.estimated_loss_t != null
              ? `Estimated loss: ${production_loss.estimated_loss_t} t (${production_loss.loss_pct_of_total}% of expected production)`
              : 'Based on reported damage and available data.'}
          </p>
        </div>
      </div>

      {immediate.length > 0 && (
        <Card title="Immediate Actions" subtitle="Act now — delays reduce claim and crop-recovery chances.">
          <div className="loss-recs-list">
            {immediate.map((r, i) => <RecCard key={i} rec={r} index={i} />)}
          </div>
        </Card>
      )}

      {soon.length > 0 && (
        <Card title="Actions Within Days" subtitle="Complete within the next few days for best outcomes.">
          <div className="loss-recs-list">
            {soon.map((r, i) => <RecCard key={i} rec={r} index={immediate.length + i} />)}
          </div>
        </Card>
      )}

      {later.length > 0 && (
        <Card title="Follow-up Steps" subtitle="Plan these actions once the immediate situation is stabilised.">
          <div className="loss-recs-list">
            {later.map((r, i) => <RecCard key={i} rec={r} index={immediate.length + soon.length + i} />)}
          </div>
        </Card>
      )}

      {recs.length === 0 && (
        <div className="inline-feedback">
          <AlertTriangle size={15} />
          <span>No recovery recommendations available — complete the damage form to generate recommendations.</span>
        </div>
      )}

      {/* Quick actions checklist */}
      <Card title="Quick Action Checklist" subtitle="Tick these off in the next 72 hours.">
        <div className="loss-quick-checks">
          {[
            { label: 'Photograph all affected areas (multiple angles, geo-tagged)', icon: CheckCircle2 },
            { label: 'Notify insurer / bank (PMFBY enrollment required)', icon: ShieldCheck },
            { label: 'Inform local agriculture officer / village-level worker (VLW)', icon: Leaf },
            { label: 'Collect policy document and enrollment acknowledgement', icon: CheckCircle2 },
            { label: 'Document crop variety, sowing date, and affected area with evidence', icon: CheckCircle2 },
            { label: 'Request official field inspection from insurer/agriculture dept', icon: ArrowRight },
          ].map(({ label, icon: Icon }, i) => (
            <div key={i} className="loss-quick-check">
              <Icon size={14} className="loss-ev-yes" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
