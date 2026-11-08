// scripts/collect-all-dynamic-strings.cjs
const fs = require('fs');

const allStrings = new Set();

// 1. Data sources
try {
  const ds = JSON.parse(fs.readFileSync('ml/metadata/data_sources.json', 'utf8'));
  ds.sources.forEach(s => {
    if (s.name) allStrings.add(s.name.trim());
    if (s.organization) allStrings.add(s.organization.trim());
    if (s.usage) allStrings.add(s.usage.trim());
    if (s.dataset_version) allStrings.add(s.dataset_version.trim());
  });
} catch(e) {}

// 2. Model metadata
try {
  const mm = JSON.parse(fs.readFileSync('ml/metadata/model_metadata.json', 'utf8'));
  if (mm.model) allStrings.add(mm.model.trim());
  if (mm.target) allStrings.add(mm.target.trim());
  if (mm.explanation_note) allStrings.add(mm.explanation_note.trim());
  if (mm.risk_reference?.method) allStrings.add(mm.risk_reference.method.trim());
} catch(e) {}

// 3. Crop Production panels & constants
const prodStrings = [
  'ICRISAT District Level Database',
  'International Crops Research Institute for the Semi-Arid Tropics (ICRISAT)',
  'Historical district-level yields and crop area/production; the supplied wide-format export is reshaped using its documented units.',
  'ICRISAT-District Level Data.csv',
  'District-wise, season-wise crop production statistics',
  'Ministry of Agriculture & Farmers Welfare, Department of Agriculture & Farmers Welfare, Directorate of Economics and Statistics',
  'Official district, crop, season, year, area, production, and yield observations when a source file is supplied.',
  'NASA POWER Daily Point',
  'NASA Langley Research Center',
  'Observed precipitation, temperature, humidity, and solar radiation for user-supplied district-season periods and coordinates.',
  'SoilGrids',
  'ISRIC — World Soil Information',
  'Optional soil information; no district-level soil values are currently integrated.',
  'Historical district-level agricultural data; file not integrated.',
  'Ministry of Agriculture & Farmers Welfare · Directorate of Economics and Statistics',
  'Official Indian crop area and production records; file not integrated.',
  'Observed weather by documented district coordinates and crop-season period; not integrated.',
  'Soil layer not available for this prediction.',
  'Soil layer not available for this prediction. No soil properties are fabricated or imputed.',
  'Equal-weight mean of empirical percentile ranks for historical yield coefficient of variation and approximate prediction-interval width relative to predicted yield; tercile labels.',
  'Permutation importance is global and does not explain an individual prediction. Per-prediction SHAP is unavailable unless the optional shap package is installed.',
  'Random Forest',
  'Crop yield · tonnes/hectare',
  'District + crop + season + year',
  'Real Indian agricultural data',
  'Climate not integrated · Soil not integrated',
  'Climate not integrated',
  'Soil not integrated',
  'Climate integrated',
  'Not integrated',
  'Integrated',
  'NASA POWER integrated',
  'Not available',
  'Unavailable',
  'Not measurable',
  'Computed from processed source observations.',
  'Metrics are populated only after training and evaluation on verified source records.',
  'Official sources and whether their records are actually integrated.',
  'Yield variability and prediction interval relative to expected output.',
  'The selected year',
  'Selected model',
  'Training dataset',
  'Target',
  'Granularity',
  'Training years',
  'Future test years',
  'Test MAE',
  'Test RMSE',
  'Test R²',
  'Historical-mean baseline MAE',
  'ML MAE change vs baseline',
  'Climate / soil',
  'Features used by this trained model',
  'Data quality & coverage',
  'Real rows',
  'Districts',
  'Crops',
  'Year coverage',
  'Duplicate records removed',
  'Invalid records removed',
  'Climate layer',
  'Soil layer',
  'Data sources',
  'Model information',
  'Production risk analysis',
  'Version / resource:',
  'Official source ↗',
  'rows',
  'year range unavailable',
  'tonnes/ha',
  'No trained model or performance metrics are available. They will be shown only after a real dataset has been processed and evaluated.',
  'Quality report not available until a real source file is processed.',
  'ICRISAT historical mean yield relative to crop average',
  'ICRISAT yield data',
  'ICRISAT District baseline applied for Thiruvallur. Real ML model index pending for exact district-year boundary.',
  'Crop recommendations are estimates based on real data from ICRISAT, AGMARKNET, NASA POWER, IMD, and Soil Health Card sources. They are not official agronomic advice. Confirm all decisions with your local Krishi Vigyan Kendra or agricultural extension officer.',
  'Yield: ICRISAT historical mean (Tamil Nadu). Price: AGMARKNET — mandi price snapshot. Cost: ICAR/TNAU reference cost of cultivation (published estimates). Revenue = total yield (kg) × price per kg. Net return = revenue − cultivation cost. Excludes post-harvest losses, transport, and market commissions.',
  'Village-level aggregated survey data. Individual farm soil may differ. These records are from the 2024–25 Soil Health Card campaign. For precise recommendations, obtain a laboratory soil test.',
  'Source: India Data Portal — Soil Health Card scheme (2024–25)',
  'Estimate based on published total duration of 140 days for this crop type (source: TNAU crop calendar — medium-duration Kharif paddy (~140 days), ICAR Crop Production Guide). The ±7-day range accounts for variety differences and local climate variation.',
  'If you know the specific variety, provide it for a more accurate estimate. Actual harvest date depends on weather, variety, crop health, and local conditions.',
  'NASA POWER weather summary',
  'No weather thresholds exceeded in the 30-day NASA POWER data.',
  'Continue routine field scouting every 5–7 days.',
  'No remedial action required at this time.',
  'Maintain 5 cm standing water. Intermittent flooding is acceptable.'
];

prodStrings.forEach(s => allStrings.add(s.trim()));

console.log('Total unique dynamic & agricultural strings identified:', allStrings.size);
fs.writeFileSync('scripts/extracted-dynamic-strings.json', JSON.stringify([...allStrings], null, 2));

