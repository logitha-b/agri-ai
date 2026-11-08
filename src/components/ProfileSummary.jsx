import { Droplets, MapPin, Ruler, Sprout, Tractor, UserRound, Wheat } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const profileFields = [
  ['crop', Wheat, (profile, t) => t(profile.crop, profile.crop)],
  ['land', Ruler, (profile, t) => `${profile.land_area} ${t('acres', 'acres')}`],
  ['category', UserRound, (profile, t) => t(profile.farmer_category, profile.farmer_category)],
  ['irrigation', Droplets, (profile, t) => t(profile.irrigation, profile.irrigation)],
  ['activity', Tractor, (profile, t) => t(profile.activity, profile.activity)],
]

export function ProfileSummary({ profile, onEdit }) {
  const { t } = useLanguage()
  if (!profile) return null
  return <section className="card scheme-profile-summary">
    <div className="scheme-profile-heading">
      <span className="scheme-profile-icon"><Sprout size={19}/></span>
      <div>
        <small>{t('YOUR PROFILE', 'YOUR PROFILE')}</small>
        <b>{t('Your Profile', 'Your Profile')}</b>
        <span><MapPin size={15}/>{t(profile.district, profile.district)}, {t(profile.state, profile.state)}</span>
      </div>
    </div>
    <div className="scheme-profile-facts">{profileFields.map(([key, Icon, getValue])=><div key={key}><Icon size={16}/><span>{getValue(profile, t)}</span></div>)}</div>
    <button type="button" className="scheme-edit-profile" onClick={onEdit}>{t('Edit Profile', 'Edit Profile')}</button>
  </section>
}
