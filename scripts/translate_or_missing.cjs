const fs = require('fs');

const orFile = 'src/i18n/locales/or/translation.json';
const orData = JSON.parse(fs.readFileSync(orFile, 'utf8'));

const translations = {
  "No rainfall thresholds exceeded in the available data. This does not guarantee safety — missing inputs (listed below) may carry risk.": "ଉପଲବ୍ଧ ତଥ୍ୟରେ କୌଣସି ବର୍ଷା ସୀମା ଅତିକ୍ରମ କରିନାହିଁ। ଏହା ସମ୍ପୂର୍ଣ୍ଣ ସୁରକ୍ଷା ନିଶ୍ଚିତ କରେ ନାହିଁ — ଅନୁପସ୍ଥିତ ଇନପୁଟ୍ (ନିମ୍ନରେ ତାଲିକାଭୁକ୍ତ) ରେ ବିପଦ ଥାଇପାରେ।",
  "Not enough data to assess flood risk for this location. IMD district rainfall was not found, and no other confirming signals are available.": "ଏହି ସ୍ଥାନ ପାଇଁ ବନ୍ୟା ବିପଦ ଆକଳନ କରିବାକୁ ଯଥେଷ୍ଟ ତଥ୍ୟ ନାହିଁ। IMD ଜିଲ୍ଲା ବର୍ଷା ମିଳିଲା ନାହିଁ, ଏବଂ ଅନ୍ୟ କୌଣସି ନିଶ୍ଚିତ ସଙ୍କେତ ଉପଲବ୍ଧ ନାହିଁ।",
  "Satellite flood inundation (Sentinel-1 SAR not linked to district-level alerts — use the Sentinel-1 layer in Crop Health for visual flood indicators)": "ଉପଗ୍ରହ ବନ୍ୟା ଜଳପ୍ଲାବନ (ସେଣ୍ଟିନେଲ-୧ SAR ଜିଲ୍ଲା-ସ୍ତରୀୟ ଆଲର୍ଟ ସହିତ ସଂଯୁକ୍ତ ନୁହେଁ — ଦୃଶ୍ୟମାନ ବନ୍ୟା ସୂଚକ ପାଇଁ ଫସଲ ସ୍ୱାସ୍ଥ୍ୟରେ ସେଣ୍ଟିନେଲ-୧ ସ୍ତର ବ୍ୟବହାର କରନ୍ତୁ)",
  "River gauge levels (CWC real-time data requires registration at india-water.gov.in)": "ନଦୀ ଜଳସ୍ତର (CWC ରିଅଲ-ଟାଇମ୍ ତଥ୍ୟ ପାଇଁ india-water.gov.in ରେ ପଞ୍ଜୀକରଣ ଆବଶ୍ୟକ)",
  "Elevation / DEM (not integrated — low-lying areas may face higher risk than indicated)": "ଉଚ୍ଚତା / DEM (ସଂଯୁକ୍ତ ନୁହେଁ — ତଳିଆ ଅଞ୍ଚଳଗୁଡ଼ିକ ସୂଚିତ ତୁଳନାରେ ଅଧିକ ବିପଦର ସମ୍ମୁଖୀନ ହୋଇପାରନ୍ତି)",
  "Dam proximity data (none within 50 km)": "ଡ୍ୟାମ୍ ନିକଟବର୍ତ୍ତୀ ତଥ୍ୟ (୫୦ କିମି ମଧ୍ୟରେ କୌଣସିଟି ନାହିଁ)",
  "Reservoir data (none within 50 km)": "ଜଳଭଣ୍ଡାର ତଥ୍ୟ (୫୦ କିମି ମଧ୍ୟରେ କୌଣସିଟି ନାହିଁ)",
  "NASA POWER regional rainfall": "NASA POWER ଆଞ୍ଚଳିକ ବର୍ଷା",
  "Continue routine field monitoring.": "ନିୟମିତ କ୍ଷେତ୍ର ନିରୀକ୍ଷଣ ଜାରି ରଖନ୍ତୁ।",
  "Keep drainage channels clear as a precaution.": "ସତର୍କତାମୂଳକ ପଦକ୍ଷେପ ଭାବେ ନିଷ୍କାସନ ନାଳଗୁଡ଼ିକୁ ସଫା ରଖନ୍ତୁ।",
  "Check official weather forecasts before the next irrigation or field operation.": "ପରବର୍ତ୍ତୀ ଜଳସେଚନ କିମ୍ବା କ୍ଷେତ୍ର କାର୍ଯ୍ୟ ପୂର୍ବରୁ ସରକାରୀ ପାଣିପାଗ ପୂର୍ବାନୁମାନ ଯାଞ୍ଚ କରନ୍ତୁ।",
  "Check the official CWC Flood Forecasting portal: cwc.gov.in/flood-forecasting": "ସରକାରୀ CWC ବନ୍ୟା ପୂର୍ବାନୁମାନ ପୋର୍ଟାଲ୍ ଯାଞ୍ଚ କରନ୍ତୁ: cwc.gov.in/flood-forecasting",
  "Monitor NDMA flood alerts: ndma.gov.in": "NDMA ବନ୍ୟା ସତର୍କତା ଉପରେ ନଜର ରଖନ୍ତୁ: ndma.gov.in",
  "Do not enter flooded or waterlogged fields.": "ବନ୍ୟା କିମ୍ବା ଜଳବନ୍ଦୀ ଜମିରେ ପ୍ରବେଶ କରନ୍ତୁ ନାହିଁ।",
  "Ensure field drainage channels are clear.": "କ୍ଷେତ୍ରର ଜଳ ନିଷ୍କାସନ ନାଳ ସଫା ଥିବା ନିଶ୍ଚିତ କରନ୍ତୁ।",
  "Move stored harvest, machinery, and livestock to higher ground if flooding is confirmed.": "ବନ୍ୟା ନିଶ୍ଚିତ ହେଲେ ସଂଗୃହିତ ଫସଲ, ଯନ୍ତ୍ରପାତି ଏବଂ ଗୃହପାଳିତ ପଶୁମାନଙ୍କୁ ଉଚ୍ଚ ସ୍ଥାନକୁ ସ୍ଥାନାନ୍ତର କରନ୍ତୁ।",
  "Do not rely on this estimate as an official flood warning.": "ଏହି ଆକଳନକୁ ସରକାରୀ ବନ୍ୟା ଚେତାବନୀ ଭାବେ ନିର୍ଭର କରନ୍ତୁ ନାହିଁ।",
  "Flooding confirmed — do not enter flooded areas.": "ବନ୍ୟା ନିଶ୍ଚିତ ହୋଇଛି — ବନ୍ୟା ପ୍ରଭାବିତ ଅଞ୍ଚଳରେ ପ୍ରବେଶ କରନ୍ତୁ ନାହିଁ।",
  "Contact local emergency services and agricultural extension officers.": "ସ୍ଥାନୀୟ ଜରୁରୀକାଳୀନ ସେବା ଏବଂ କୃଷି ବିସ୍ତାର ଅଧିକାରୀଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।",
  "Move assets to safety immediately.": "ତୁରନ୍ତ ସମ୍ପତ୍ତିକୁ ସୁରକ୍ଷିତ ସ୍ଥାନକୁ ନିଅନ୍ତୁ।",
  "Check official IMD rainfall forecasts: mausam.imd.gov.in": "ସରକାରୀ IMD ବର୍ଷା ପୂର୍ବାନୁମାନ ଯାଞ୍ଚ କରନ୍ତୁ: mausam.imd.gov.in",
  "Check official CWC flood bulletins: cwc.gov.in": "ସରକାରୀ CWC ବନ୍ୟା ବୁଲେଟିନ୍ ଯାଞ୍ଚ କରନ୍ତୁ: cwc.gov.in",
  "Conduct a field inspection before any agricultural operations.": "କୌଣସି କୃଷି କାର୍ଯ୍ୟ ପୂର୍ବରୁ ଏକ କ୍ଷେତ୍ର ଯାଞ୍ଚ କରନ୍ତୁ।",
  "Dam presence indicates managed water storage, NOT an imminent release. No live gate-operation or release data is available. 1 dam(s) have Flood Control as a stated purpose.": "ଡ୍ୟାମ୍ ର ଉପସ୍ଥିତି ନିୟନ୍ତ୍ରିତ ଜଳ ସଂରକ୍ଷଣକୁ ସୂଚିତ କରେ, ତୁରନ୍ତ ଜଳ ଛାଡ଼ିବାକୁ ନୁହେଁ। କୌଣସି ଲାଇଭ୍ ଗେଟ୍-ଅପରେସନ୍ କିମ୍ବା ଡିସଚାର୍ଜ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ। ୧ଟି ଡ୍ୟାମ୍ ର ଉଦ୍ଦେଶ୍ୟ ବନ୍ୟା ନିୟନ୍ତ୍ରଣ ଅଟେ।",
  "Dam presence indicates managed water storage, NOT an imminent release. No live gate-operation or release data is available.": "ଡ୍ୟାମ୍ ର ଉପସ୍ଥିତି ନିୟନ୍ତ୍ରିତ ଜଳ ସଂରକ୍ଷଣକୁ ସୂଚିତ କରେ, ତୁରନ୍ତ ଜଳ ଛାଡ଼ିବାକୁ ନୁହେଁ। କୌଣସି ଲାଇଭ୍ ଗେଟ୍-ଅପରେସନ୍ କିମ୍ବା ଡିସଚାର୍ଜ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ।",
  "No live water-level, storage, inflow, or outflow data available.": "କୌଣସି ଲାଇଭ୍ ଜଳସ୍ତର, ସଂରକ୍ଷଣ, ପ୍ରବେଶ କିମ୍ବା ନିର୍ଗମନ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ।",
  "NASA POWER resolution is ~55 km. Not a district-level measurement.": "NASA POWER ରିଜୋଲ୍ୟୁସନ୍ ପ୍ରାୟ ୫୫ କିମି। ଏହା ଜିଲ୍ଲା ସ୍ତରୀୟ ମାପ ନୁହେଁ।",
  "Values represent IMD gridded/district-level estimates. Daily values are for the date shown; weekly and cumulative values are as published in the dataset for that date. These are not field-level measurements.": "ମୂଲ୍ୟଗୁଡ଼ିକ IMD ଗ୍ରୀଡ୍/ଜିଲ୍ଲା ସ୍ତରୀୟ ଆକଳନକୁ ପ୍ରତିନିଧିତ୍ୱ କରେ। ଦୈନିକ ମୂଲ୍ୟ ପ୍ରଦର୍ଶିତ ତାରିଖ ପାଇଁ ଅଟେ; ସାପ୍ତାହିକ ଏବଂ ସମୁଦାୟ ମୂଲ୍ୟ ସେହି ତାରିଖ ପାଇଁ ଡାଟାସେଟ୍ ରେ ପ୍ରକାଶିତ ହୋଇଛି। ଏଗୁଡ଼ିକ କ୍ଷେତ୍ର ସ୍ତରୀୟ ମାପ ନୁହେଁ।",
  "3-day accumulated rainfall": "୩-ଦିନର ସମୁଦାୟ ବର୍ଷା",
  "30-day regional rainfall (NASA POWER)": "୩୦-ଦିନର ଆଞ୍ଚଳିକ ବର୍ଷା (NASA POWER)",
  "Closest: Redhills (15.38 km)": "ନିକଟତମ: ରେଡହିଲ୍ସ (୧୫.୩୮ କିମି)",
  "Closest: Redhills (16.16 km)": "ନିକଟତମ: ରେଡହିଲ୍ସ (୧୬.୧୬ କିମି)",
  "CWC Central Water Commission — National Water Data Portal": "CWC କେନ୍ଦ୍ରୀୟ ଜଳ ଆୟୋଗ — ଜାତୀୟ ଜଳ ତଥ୍ୟ ପୋର୍ଟାଲ୍",
  "NDSA National Dam Safety Authority — National Water Data Portal": "NDSA ଜାତୀୟ ଡ୍ୟାମ୍ ସୁରକ୍ଷା ପ୍ରାଧିକରଣ — ଜାତୀୟ ଜଳ ତଥ୍ୟ ପୋର୍ଟାଲ୍",
  "NASA POWER ~55 km grid — regional context only": "NASA POWER ~୫୫ କିମି ଗ୍ରୀଡ୍ — କେବଳ ଆଞ୍ଚଳିକ ସନ୍ଦର୍ଭ",
  "This is a rules-based estimate derived from published IMD thresholds and available satellite/inventory data. It is NOT an official flood warning, forecast, or validated hydrological model output. Inputs marked as missing may carry risk not captured here. Always consult official CWC and NDMA flood alerts before taking action.": "ଏହା ପ୍ରକାଶିତ IMD ସୀମା ଏବଂ ଉପଲବ୍ଧ ଉପଗ୍ରହ/ତାଲିକା ତଥ୍ୟରୁ ପ୍ରାପ୍ତ ଏକ ନିୟମ-ଆଧାରିତ ଆକଳନ। ଏହା କୌଣସି ସରକାରୀ ବନ୍ୟା ଚେତାବନୀ, ପୂର୍ବାନୁମାନ କିମ୍ବା ବୈଧ ଜଳବିଜ୍ଞାନ ମଡେଲ ଆଉଟପୁଟ୍ ନୁହେଁ। ଅନୁପସ୍ଥିତ ଭାବେ ଚିହ୍ନିତ ଇନପୁଟ୍ ଗୁଡ଼ିକରେ ଏଠାରେ ନ ଥିବା ବିପଦ ଥାଇପାରେ। କୌଣସି ପଦକ୍ଷେପ ନେବା ପୂର୍ବରୁ ସର୍ବଦା ସରକାରୀ CWC ଏବଂ NDMA ବନ୍ୟା ଆଲର୍ଟ ଦେଖନ୍ତୁ।"
};

const odiaDigits = ['୦', '୧', '୨', '୩', '୪', '୫', '୬', '୭', '୮', '୯'];
function toOdiaNum(n) {
  return String(n).split('').map(d => odiaDigits[parseInt(d, 10)] || d).join('');
}

for (let i = 1; i <= 20; i++) {
  const oNum = toOdiaNum(i);
  translations[`${i} dam(s) within 50 km`] = `୫୦ କିମି ମଧ୍ୟରେ ${oNum}ଟି ଡ୍ୟାମ୍`;
  translations[`${i} reservoir(s) within 50 km`] = `୫୦ କିମି ମଧ୍ୟରେ ${oNum}ଟି ଜଳଭଣ୍ଡାର`;
}

let added = 0;
for (const [k, v] of Object.entries(translations)) {
  if (!orData[k]) {
    orData[k] = v;
    added++;
  }
}

fs.writeFileSync(orFile, JSON.stringify(orData, null, 2), 'utf8');
console.log(`Successfully added ${added} keys to ${orFile}. Total keys now: ${Object.keys(orData).length}`);
