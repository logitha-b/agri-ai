export function validateProductionQuery({ state, district, crop, season, year, area }) {
  const errors = {}
  if (!state) errors.state = 'Choose a state represented in the processed data.'
  if (!district) errors.district = 'Choose a district represented in the processed data.'
  if (!crop) errors.crop = 'Choose a crop represented in the processed data.'
  if (!season) errors.season = 'Choose a season represented in the processed data.'
  if (!year || !Number.isInteger(Number(year))) errors.year = 'Choose an available source year.'
  const hectares = Number(area)
  if (!Number.isFinite(hectares) || hectares <= 0 || hectares > 1_000_000) {
    errors.area = 'Enter a farm area greater than zero and no more than 1,000,000 hectares.'
  }
  return errors
}
