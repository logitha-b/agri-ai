import { useLanguage } from '../context/LanguageContext'
import { Filter, Search, X } from 'lucide-react'
import { Field, Select } from '../components'

export function SchemeFilters({ filters, onChange, categories, crops, activities, onClear, browse = false }) {
  const { t } = useLanguage()
  const update = (key, value) => onChange(current => ({ ...current, [key]: value }))
  const activeFilters = [
    ['category', 'All categories'],
    ...(!browse ? [['relevance', 'All relevance classes'], ['eligibility', 'All eligibility statuses']] : []),
    ['crop', 'All crops'],
    ['activity', 'All activities'],
  ].filter(([key, defaultValue]) => filters[key] !== defaultValue)
  const hasActiveFilters = activeFilters.length > 0 || filters.search
  return <section className="scheme-filters" aria-label="Search and filter schemes">
    <div className="scheme-filter-main">
      <label className="scheme-search"><Search size={18}/><input aria-label="Search schemes" placeholder={t("Search schemes, benefits or department")} value={filters.search} onChange={event=>update('search',event.target.value)}/></label>
      <Field label="Category"><Select options={['All categories',...categories]} value={filters.category} onChange={event=>update('category',event.target.value)}/></Field>
      {!browse && <Field label="Relevance"><Select options={['All relevance classes','Highly Relevant','Relevant','Potentially Relevant','Not Relevant']} value={filters.relevance} onChange={event=>update('relevance',event.target.value)}/></Field>}
      <Field label="Sort by"><Select options={browse ? [{value:'name',label:'Scheme Name'}] : [{value:'best',label:'Best ML Match'},{value:'high',label:'Highest Confidence'},{value:'low',label:'Lowest Confidence'},{value:'name',label:'Scheme Name'}]} value={browse ? 'name' : filters.sort} onChange={event=>update('sort',event.target.value)}/></Field>
    </div>
    <details className="scheme-more-filters">
      <summary><Filter size={15}/> {t("More filters", "More filters")}</summary>
      <div className="scheme-filter-grid">
        {!browse && <Field label="Eligibility status"><Select options={[{value:'All eligibility statuses',label:'All statuses'},{value:'potentially_eligible',label:'Potentially eligible'},{value:'not_eligible',label:'Not eligible'}]} value={filters.eligibility} onChange={event=>update('eligibility',event.target.value)}/></Field>}
        <Field label="Crop"><Select options={['All crops',...crops]} value={filters.crop} onChange={event=>update('crop',event.target.value)}/></Field>
        <Field label="Activity"><Select options={['All activities',...activities]} value={filters.activity} onChange={event=>update('activity',event.target.value)}/></Field>
      </div>
    </details>
    {hasActiveFilters&&<div className="scheme-filter-chips">
      {filters.search&&<button type="button" onClick={()=>update('search','')}>“{filters.search}” <X size={13}/></button>}
      {activeFilters.map(([key])=><button type="button" key={key} onClick={()=>update(key,EMPTY_FILTERS[key])}>{key==='eligibility'?filters[key].replace('_',' '):filters[key]} <X size={13}/></button>)}
      <button type="button" className="scheme-clear-filters" onClick={onClear}>{t("Clear all")}</button>
    </div>
    }
  </section>
}

const EMPTY_FILTERS = {
  category: 'All categories',
  relevance: 'All relevance classes',
  eligibility: 'All eligibility statuses',
  crop: 'All crops',
  activity: 'All activities',
}
