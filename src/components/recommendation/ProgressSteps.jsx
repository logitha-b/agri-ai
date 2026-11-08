import { useLanguage } from '../../context/LanguageContext'
// Analysis progress indicator

const STEPS = [
  { id: 'weather',  label: 'Loading weather & rainfall data',         icon: '🌧️' },
  { id: 'flood',    label: 'Assessing flood exposure',                icon: '🌊' },
  { id: 'soil',     label: 'Checking soil nutrient records',          icon: '🌱' },
  { id: 'yield',    label: 'Evaluating historical yield data',        icon: '📊' },
  { id: 'market',   label: 'Comparing market prices',                 icon: '💰' },
  { id: 'scoring',  label: 'Preparing final recommendations',         icon: '🏆' },
]

export default function ProgressSteps({ active }) {
  const { t } = useLanguage()
  // active: index up to which steps are "done" (-1 = all pending, 5 = all done)
  return (
    <div className="rc-progress">
      {STEPS.map((step, i) => {
        const done    = i < active
        const current = i === active
        return (
          <div key={step.id} className={`rc-progress-step ${done ? 'rc-step-done' : current ? 'rc-step-active' : 'rc-step-pending'}`}>
            <span className="rc-step-icon">
              {done ? '✅' : current ? <span className="rc-spinner" /> : step.icon}
            </span>
            <span className="rc-step-label">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}
