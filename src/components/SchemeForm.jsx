import { useState } from 'react'
import { ArrowRight, Sparkles, UserRound } from 'lucide-react'
import { Button, Field, Select } from '../components'
import { useLanguage } from '../context/LanguageContext'

export const DEMO_SCHEME_PROFILE = {
  state: 'Tamil Nadu',
  district: 'Thiruvallur',
  crop: 'Paddy',
  land_area: '2.5',
  farmer_category: 'Small Farmer',
  irrigation: 'Borewell',
  activity: 'Crop Cultivation',
  annual_income: '150000',
  age: '42',
}

const DISTRICTS = {
  'Tamil Nadu': ['Thiruvallur', 'Chennai', 'Salem', 'Madurai', 'Coimbatore'],
  'Andhra Pradesh': ['Chittoor', 'Guntur', 'Krishna', 'Nellore'],
  Karnataka: ['Bengaluru Rural', 'Mysuru', 'Mandya', 'Dharwad'],
  Maharashtra: ['Pune', 'Nashik', 'Nagpur', 'Kolhapur'],
  Jharkhand: ['Ranchi', 'Khunti', 'Gumla', 'Lohardaga'],
  'Uttar Pradesh': ['Lucknow', 'Varanasi', 'Agra', 'Gorakhpur'],
  Odisha: ['Cuttack', 'Puri', 'Ganjam', 'Balasore'],
  Assam: ['Guwahati', 'Nagaon', 'Jorhat', 'Dibrugarh'],
}

export function SchemeForm({ onAnalyze, loading, formRef }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(DEMO_SCHEME_PROFILE)
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const loadSampleAndAnalyze = () => {
    setForm(DEMO_SCHEME_PROFILE)
    onAnalyze({
      ...DEMO_SCHEME_PROFILE,
      land_area: Number(DEMO_SCHEME_PROFILE.land_area),
      annual_income: Number(DEMO_SCHEME_PROFILE.annual_income || 150000),
      age: Number(DEMO_SCHEME_PROFILE.age || 42),
    })
  }

  const submit = event => {
    event.preventDefault()
    onAnalyze({
      ...form,
      land_area: Number(form.land_area),
      annual_income: Number(form.annual_income || 0),
      age: Number(form.age || 42),
    })
  }

  return <form className="card scheme-form" onSubmit={submit} ref={formRef}>
    <header className="scheme-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <span className="scheme-section-icon"><UserRound size={20}/></span>
        <div>
          <h2>{t('Farmer Profile')}</h2>
          <p>{t('Tell us about your agricultural activity to discover relevant government schemes.')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={loadSampleAndAnalyze}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
          transition: 'all 0.2s ease',
        }}
        title="Fill sample farmer profile (Paddy, Thiruvallur, 2.5 acres) and automatically fetch eligible schemes"
      >
        <Sparkles size={16} />
        {t('✨ Load Sample Data & Find Schemes', '✨ Load Sample Data & Find Schemes')}
      </button>
    </header>
    <div className="input-grid columns-2">
      <Field label="State *"><Select required options={Object.keys(DISTRICTS)} value={form.state} onChange={event=>{const state=event.target.value;update('state',state);update('district',DISTRICTS[state][0])}}/></Field>
      <Field label="District *"><Select required options={DISTRICTS[form.state]||[]} value={form.district} onChange={event=>update('district',event.target.value)}/></Field>
      <Field label="Crop / commodity *"><Select required options={['Paddy','Groundnut','Maize','Tomato','Millet','Horticulture','Fish','Shrimp','Pearl Mussel','Livestock']} value={form.crop} onChange={event=>update('crop',event.target.value)}/></Field>
      <Field label="Land area (acres) *"><input required type="number" min=".1" max="100000" step=".1" value={form.land_area} onChange={event=>update('land_area',event.target.value)}/></Field>
      <Field label="Farmer category *"><Select required options={['Small Farmer','Marginal Farmer','Other']} value={form.farmer_category} onChange={event=>update('farmer_category',event.target.value)}/></Field>
      <Field label="Irrigation *"><Select required options={['Borewell','Canal','Drip','Sprinkler','Rain-fed','Pond','Other']} value={form.irrigation} onChange={event=>update('irrigation',event.target.value)}/></Field>
      <Field label="Farm activity *"><Select required options={['Crop Cultivation','Horticulture','Fisheries','Aquaculture','Pearl Culture','Livestock','Farm Machinery','Irrigation','Agri Infrastructure']} value={form.activity} onChange={event=>update('activity',event.target.value)}/></Field>
      <Field label="Annual household income (₹)"><input type="number" min="0" max="1000000000" value={form.annual_income} onChange={event=>update('annual_income',event.target.value)}/></Field>
      <Field label="Age"><input type="number" min="18" max="120" value={form.age} onChange={event=>update('age',event.target.value)}/></Field>
    </div>
    <div className="scheme-form-footer">
      <span>{t('Required fields are marked *.')} {t('Your profile is used for this request only.')}</span>
      <div className="scheme-form-actions">
        <Button type="button" kind="secondary" onClick={loadSampleAndAnalyze} disabled={loading}><Sparkles size={15}/>{t('✨ Load Sample & Analyze', '✨ Load Sample & Analyze')}</Button>
        <Button type="submit" disabled={loading}>{loading ? t('Analyzing profile…') : t('Analyze My Profile')} <ArrowRight size={16}/></Button>
      </div>
    </div>
  </form>
}
