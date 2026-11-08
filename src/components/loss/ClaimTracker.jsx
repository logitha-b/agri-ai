import { useLanguage } from '../../context/LanguageContext'
/**
 * ClaimTracker — Step 6: Farmer-managed claim tracking (browser state only).
 * Supports statuses: draft, reported, assessment_pending, under_review, approved, rejected, paid.
 * Clearly distinguishes farmer-entered data from verified insurer data.
 */
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { Button, Card, Field, Notice } from '../../components'

const STATUSES = [
  { value: 'draft',              label: 'Draft — not yet submitted',         color: '#95a59c' },
  { value: 'reported',           label: 'Reported to insurer / bank',         color: '#4e86c8' },
  { value: 'assessment_pending', label: 'Assessment Pending',                 color: '#d4a84b' },
  { value: 'under_review',       label: 'Under Review',                       color: '#d4a84b' },
  { value: 'approved',           label: 'Approved by insurer',                color: '#3a8057' },
  { value: 'rejected',           label: 'Rejected by insurer',                color: '#c0392b' },
  { value: 'paid',               label: 'Compensation Paid',                  color: '#27ae60' },
]

function statusCfg(v) {
  return STATUSES.find(s => s.value === v) || STATUSES[0]
}

function ClaimEntry({ entry, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ ...entry })

  const save = () => { onUpdate(form); setEditing(false) }
  const cfg  = statusCfg(entry.status)

  return (
    <div className="loss-claim-entry">
      <div className="loss-claim-header">
        <div>
          <b>{entry.scheme || 'Insurance claim'}</b>
          {entry.ref && <small> · Ref: {entry.ref}</small>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="loss-claim-status" style={{ borderColor: cfg.color, color: cfg.color }}>
            {cfg.label}
          </span>
          <button className="icon-button" onClick={() => setEditing(e => !e)} aria-label="Edit claim">{editing ? '✕' : '✏'}</button>
          <button className="icon-button" onClick={onDelete} aria-label="Delete claim"><Trash2 size={14}/></button>
        </div>
      </div>

      {!editing ? (
        <div className="loss-claim-detail">
          {entry.submitted_date  && <div><span>Submitted:</span><b>{entry.submitted_date}</b></div>}
          {entry.notes           && <div><span>Notes:</span><b>{entry.notes}</b></div>}
          {entry.documents       && <div><span>Documents:</span><b>{entry.documents}</b></div>}
          <div className="loss-claim-disclaimer">
            <AlertTriangle size={12}/> Status is farmer-entered only — not verified by insurer.
          </div>
        </div>
      ) : (
        <div className="input-grid columns-2" style={{ marginTop: 12 }}>
          <Field label="SCHEME / INSURER">
            <input value={form.scheme} onChange={e => setForm(f => ({ ...f, scheme: e.target.value }))} placeholder="PMFBY / insurer name" />
          </Field>
          <Field label="POLICY / CLAIM REFERENCE">
            <input value={form.ref} onChange={e => setForm(f => ({ ...f, ref: e.target.value }))} placeholder="Ref / application number" />
          </Field>
          <Field label="SUBMISSION DATE">
            <input type="date" value={form.submitted_date} onChange={e => setForm(f => ({ ...f, submitted_date: e.target.value }))} />
          </Field>
          <Field label="STATUS">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="DOCUMENTS SUBMITTED">
            <input value={form.documents} onChange={e => setForm(f => ({ ...f, documents: e.target.value }))} placeholder="e.g. Aadhaar, land record, photos" />
          </Field>
          <Field label="NOTES">
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about the claim" />
          </Field>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <Button type="button" kind="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="button" onClick={save}><Save size={14}/> Save</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClaimTracker({ claims, onClaimsChange }) {
  const { t } = useLanguage()
  const [showForm, setShowForm] = useState(false)
  const [newClaim, setNewClaim] = useState({
    id: '',
    scheme: 'PMFBY',
    ref: '',
    submitted_date: '',
    status: 'draft',
    documents: '',
    notes: '',
  })

  const addClaim = () => {
    if (!newClaim.scheme) return
    const entry = { ...newClaim, id: `claim_${Date.now()}` }
    onClaimsChange([...(claims || []), entry])
    setNewClaim({ id: '', scheme: 'PMFBY', ref: '', submitted_date: '', status: 'draft', documents: '', notes: '' })
    setShowForm(false)
  }

  const updateClaim = (id, data) => {
    onClaimsChange(claims.map(c => c.id === id ? { ...c, ...data } : c))
  }

  const deleteClaim = (id) => {
    onClaimsChange(claims.filter(c => c.id !== id))
  }

  return (
    <div className="page">
      <Notice>
        Claim status shown here is entered by you and is NOT verified by any insurer or
        government authority. Never rely on farmer-entered status as confirmation of a claim
        decision. Always contact your insurer or bank directly for official status.
      </Notice>

      {/* Official submission guidance */}
      <Card title="How to Submit a PMFBY Claim" subtitle="No authorized API exists — claims must be submitted through official channels.">
        <div className="loss-submit-steps">
          {[
            { step: '1', action: 'Report the damage immediately', detail: 'Notify your insurer/bank and local agriculture department. Use the PMFBY portal crop loss intimation form.' },
            { step: '2', action: 'Visit the PMFBY portal', detail: 'Go to pmfby.gov.in → Farmer Corner → Claim Status / Intimation.' },
            { step: '3', action: 'Contact your bank', detail: 'If enrolled through a bank (KCC loan), submit the damage report to your bank branch.' },
            { step: '4', action: 'Request field inspection', detail: 'Your insurer must organise a crop-cutting experiment. Follow up to ensure this is scheduled.' },
            { step: '5', action: 'Track claim online', detail: 'Use the PMFBY portal with your application number to check claim progress.' },
          ].map(({ step, action, detail }) => (
            <div key={step} className="loss-submit-step">
              <span className="loss-step-num">{step}</span>
              <div><b>{action}</b><p>{detail}</p></div>
            </div>
          ))}
        </div>
        <div className="loss-links-grid" style={{ marginTop: 12 }}>
          <a href="https://pmfby.gov.in/" target="_blank" rel="noopener noreferrer" className="loss-official-link">
            <ShieldCheck size={14}/> PMFBY Official Portal <ExternalLink size={12}/>
          </a>
          <a href="https://pmfby.gov.in/farmerHome" target="_blank" rel="noopener noreferrer" className="loss-official-link">
            <ShieldCheck size={14}/> Farmer Claim Status <ExternalLink size={12}/>
          </a>
          <a href="https://agricoop.nic.in/" target="_blank" rel="noopener noreferrer" className="loss-official-link">
            <ShieldCheck size={14}/> Agriculture Ministry <ExternalLink size={12}/>
          </a>
        </div>
      </Card>

      {/* Claim log */}
      <Card
        title="Your Claim Log"
        subtitle="Track your claim reference numbers, submission status, and notes."
        action={
          <button className="button secondary" type="button" onClick={() => setShowForm(v => !v)}>
            <Plus size={14}/> {showForm ? 'Cancel' : 'Add claim'}
          </button>
        }
      >
        {showForm && (
          <div className="input-grid columns-2" style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #edf0ed' }}>
            <Field label="SCHEME / INSURER">
              <input value={newClaim.scheme} onChange={e => setNewClaim(f => ({ ...f, scheme: e.target.value }))} placeholder="PMFBY / insurer name" />
            </Field>
            <Field label="POLICY / CLAIM REFERENCE">
              <input value={newClaim.ref} onChange={e => setNewClaim(f => ({ ...f, ref: e.target.value }))} placeholder="Ref / application number" />
            </Field>
            <Field label="SUBMISSION DATE">
              <input type="date" value={newClaim.submitted_date} onChange={e => setNewClaim(f => ({ ...f, submitted_date: e.target.value }))} />
            </Field>
            <Field label="STATUS">
              <select value={newClaim.status} onChange={e => setNewClaim(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="DOCUMENTS SUBMITTED">
              <input value={newClaim.documents} onChange={e => setNewClaim(f => ({ ...f, documents: e.target.value }))} placeholder="e.g. Aadhaar, land record, photos" />
            </Field>
            <Field label="NOTES">
              <input value={newClaim.notes} onChange={e => setNewClaim(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes" />
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Button type="button" onClick={addClaim}><CheckCircle2 size={14}/> Add to claim log</Button>
            </div>
          </div>
        )}

        {claims?.length > 0 ? (
          claims.map(entry => (
            <ClaimEntry
              key={entry.id}
              entry={entry}
              onUpdate={data => updateClaim(entry.id, data)}
              onDelete={() => deleteClaim(entry.id)}
            />
          ))
        ) : (
          <p className="loss-unavail">No claims recorded yet. Add a claim entry above to start tracking.</p>
        )}
      </Card>
    </div>
  )
}
