const fs = require('fs');
let code = fs.readFileSync('c:/Users/nemol/OneDrive/Desktop/agri/src/components/ModuleResultRenderer.jsx', 'utf8');

const oldMap = `      {moduleId === 'weather'            && <WeatherResult          data={moduleResult} />}
      {moduleId === 'flood_risk'         && <FloodRiskResult        data={moduleResult} />}
      {moduleId === 'lac_suitability'    && <RiskResult             data={moduleResult} title="Lac Cultivation Risk" />}
      {moduleId === 'pearl_risk'         && <RiskResult             data={moduleResult} title="Pearl Culture Risk" />}
      {moduleId === 'lac_history'        && <LacHistoryResult       data={moduleResult} />}
      {moduleId === 'lac_forecast'       && <LacForecastResult      data={moduleResult} />}
      {moduleId === 'pearl_suitability'  && <PearlSuitabilityResult data={moduleResult} />}
      {moduleId === 'market'             && <MarketResult           data={moduleResult} />}
      {moduleId === 'crop_recommendation'&& <CropRecommendationResult data={moduleResult} />}
      {moduleId === 'schemes'            && <SchemesResult          data={moduleResult} />}
      {moduleId === 'cashflow'           && <CashflowResult         data={moduleResult} />}
      {moduleId === 'production'         && <ProductionResult       data={moduleResult} />}
      {moduleId === 'disease'            && <DiseaseResult          data={moduleResult} />}
      {moduleId === 'soil_nutrients'     && <SoilResult             data={moduleResult} />}
      {moduleId === 'crop_loss'          && <CropLossResult         data={moduleResult} />}
      {moduleId === 'crop_health'        && <CropHealthResult       data={moduleResult} />}`;

const newMap = `      {moduleId === 'weather'            && <WeatherResult          data={moduleResult} />}
      {moduleId === 'flood_risk'         && <FloodRiskResult        data={moduleResult} />}
      {moduleId === 'lac_suitability'    && <LacSuitabilityResult   data={moduleResult} />}
      {moduleId === 'lac_risk'           && <LacRiskResult          data={moduleResult} />}
      {moduleId === 'lac_forecast'       && <LacForecastResult      data={moduleResult} />}
      {moduleId === 'lac_calendar'       && <LacCalendarResult      data={moduleResult} />}
      {moduleId === 'lac_market'         && <LacMarketResult        data={moduleResult} />}
      {moduleId === 'lac_history'        && <LacHistoryResult       data={moduleResult} />}
      {moduleId === 'lac_guidance'       && <LacGuidanceResult      data={moduleResult} />}
      {moduleId === 'pearl_suitability'  && <PearlSuitabilityResult data={moduleResult} />}
      {moduleId === 'pearl_risk'         && <UnavailableState       message="Pearl environmental risk assessment unavailable." />}
      {moduleId === 'market'             && <MarketResult           data={moduleResult} />}
      {moduleId === 'crop_recommendation'&& <CropRecommendationResult data={moduleResult} />}
      {moduleId === 'schemes'            && <SchemesResult          data={moduleResult} />}
      {moduleId === 'cashflow'           && <CashflowResult         data={moduleResult} />}
      {moduleId === 'production'         && <ProductionResult       data={moduleResult} />}
      {moduleId === 'disease'            && <DiseaseResult          data={moduleResult} />}
      {moduleId === 'soil_nutrients'     && <SoilResult             data={moduleResult} />}
      {moduleId === 'crop_loss'          && <CropLossResult         data={moduleResult} />}
      {moduleId === 'crop_health'        && <CropHealthResult       data={moduleResult} />}`;

if (code.includes(oldMap)) {
  code = code.replace(oldMap, newMap);
  fs.writeFileSync('c:/Users/nemol/OneDrive/Desktop/agri/src/components/ModuleResultRenderer.jsx', code, 'utf8');
  console.log('Successfully replaced oldMap with newMap in ModuleResultRenderer.jsx!');
} else {
  console.error('oldMap not found directly! Checking normalized line endings...');
  const codeNorm = code.replace(/\r\n/g, '\n');
  const oldMapNorm = oldMap.replace(/\r\n/g, '\n');
  const newMapNorm = newMap.replace(/\r\n/g, '\n');
  if (codeNorm.includes(oldMapNorm)) {
    code = codeNorm.replace(oldMapNorm, newMapNorm);
    fs.writeFileSync('c:/Users/nemol/OneDrive/Desktop/agri/src/components/ModuleResultRenderer.jsx', code, 'utf8');
    console.log('Successfully replaced oldMap with newMap using normalized line endings!');
  } else {
    console.error('Still not found!');
  }
}

