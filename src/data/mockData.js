export const initialFarmer = {
  name: 'R. Kumar',
  district: 'Thiruvallur',
  state: 'Tamil Nadu',
  landArea: '2.5',
  crop: 'Paddy',
  irrigation: 'Borewell',
  soil: 'Clay loam',
  category: 'Small farmer',
  pond: 'Available',
  hosts: 'Ber, Flemingia',
  investment: '75000',
  loan: '25000',
  emi: '4200',
  phone: '+91 98765 43210',
}

export const crops = ['Paddy', 'Groundnut', 'Maize', 'Tomato', 'Millet']
export const navEngines = [
  ['Government Schemes', '/schemes', 'ShieldCheck'],
  ['Crop Production', '/production', 'Wheat'],
  ['Crop Health', '/crop-health', 'HeartPulse'],
  ['Disease Detection', '/disease', 'Activity'],
  ['Water & Flood Risk', '/water-risk', 'Waves'],
  ['Crop Recommendation', '/crop-recommendation', 'Leaf'],
  ['Market & Profit', '/market', 'TrendingUp'],
  ['Crop Loss & Insurance', '/loss-insurance', 'Shield'],
  ['Lac Culture', '/lac', 'Bug'],
  ['Pearl Culture', '/pearl', 'Fish'],
  ['Cash Flow', '/cash-flow', 'ChartNoAxesCombined'],
  ['AI Assistant', '/assistant', 'Sparkles'],
]

export const ndvi = [
  { week: 'W1', value: .48, base: .46 }, { week: 'W2', value: .53, base: .49 },
  { week: 'W3', value: .58, base: .53 }, { week: 'W4', value: .56, base: .56 },
  { week: 'W5', value: .66, base: .59 }, { week: 'W6', value: .71, base: .63 },
  { week: 'W7', value: .74, base: .68 }, { week: 'W8', value: .78, base: .70 },
]

export const weatherData = {
  temperature: 31, feelsLike: 34, rainfall: 18, humidity: 72, soilMoisture: 64,
  outlook: 'Partly cloudy',
}

export const reservoirData = {
  storage: 68, inflow: 1240, outflow: 890, rainfallAnomaly: 12, exposure: 18,
  rainfall: [18, 24, 13, 31, 28, 18, 26, 32].map((rain, i) => ({ week: `W${i + 1}`, rain, average: 21 })),
}

export const lossAssessment = {
  expectedTonnes: 8.7, remainingTonnes: 6.4, referenceValuePerTonne: 18000,
}

export const schemes = [
  { name: 'Pradhan Mantri Fasal Bima Yojana', category: 'Insurance', benefit: 'Crop insurance for notified crops and seasons', deadline: '15 Oct 2026', status: 'Likely eligible', source: 'pmfby.gov.in' },
  { name: 'PM-KISAN', category: 'Agriculture', benefit: 'Income support up to ₹6,000 per year', deadline: 'Ongoing', status: 'Check details', source: 'pmkisan.gov.in' },
  { name: 'Per Drop More Crop', category: 'Equipment', benefit: 'Micro-irrigation support for eligible farmers', deadline: '31 Dec 2026', status: 'Likely eligible', source: 'pmksy.gov.in' },
  { name: 'Fisheries Kisan Credit Card', category: 'Fisheries', benefit: 'Working capital support for fisheries', deadline: 'Ongoing', status: 'Explore eligibility', source: 'dof.gov.in' },
  { name: 'Tamil Nadu Micro Irrigation Subsidy', category: 'Subsidy', benefit: 'Assistance for water-efficient irrigation', deadline: '30 Nov 2026', status: 'Likely eligible', source: 'tn.gov.in' },
]

export const marketData = [
  { market: 'Chennai', price: 30, transport: 4000, other: 1200, net: 54800 },
  { market: 'Koyambedu', price: 28, transport: 2500, other: 1000, net: 52500 },
  { market: 'Tiruvallur', price: 25, transport: 1200, other: 800, net: 48000 },
]

export const pearlData = {
  pondArea: 0.8, investment: 75000, mussels: 12000, revenue: 160000, cost: 65000,
  cycles: [
    { cycle: 'Cycle 1', revenue: 160000, cost: 65000 },
    { cycle: 'Cycle 2', revenue: 178000, cost: 72000 },
    { cycle: 'Cycle 3', revenue: 190000, cost: 78000 },
  ],
}

export const diseaseReference = {
  disclaimer: 'Image screening checks visible color patterns only. It cannot identify pathogens or provide an official diagnosis.',
  sample: { crop: 'Tomato', diagnosis: 'Early blight', confidence: 94.2, severity: 'Moderate' },
  precautions: [
    'Inspect both sides of leaves and check whether visible symptoms are spreading.',
    'Keep produce clean, dry, and ventilated; avoid bruising during handling.',
    'Ask a local agricultural extension officer to confirm concerns before treatment.',
  ],
}

// ─── Disease knowledge base ───────────────────────────────────────────────────
// Keyed by crop name (lowercase), then by detected pattern keyword.
// Each entry describes what caused the visual signal, what the model saw,
// and numbered treatment steps a farmer can act on immediately.
export const diseaseKnowledge = {
  // ── TOMATO ──────────────────────────────────────────────────────────────────
  tomato: {
    'Brown areas visible': {
      name: 'Early Blight (Alternaria solani)',
      severity: 'Moderate',
      why: 'The fungus Alternaria solani forms circular dark-brown lesions with concentric rings on older leaves first. Warm days (24–29 °C) combined with humid nights and wet foliage allow spores to germinate rapidly.',
      signals: [
        { label: 'Dark brown / necrotic patches', color: '#7c4e2d', explanation: 'Concentric ring lesions — the defining visual signature of early blight.' },
        { label: 'Yellow halo around lesions', color: '#d4b84a', explanation: 'Chlorotic border where the fungus is actively spreading into healthy tissue.' },
        { label: 'Reduced green area', color: '#5a8c5a', explanation: 'Healthy green tissue is being displaced as lesions coalesce.' },
      ],
      steps: [
        { icon: '🔍', title: 'Confirm the pattern', detail: 'Flip affected leaves. True early blight shows concentric rings (target-board pattern). If rings are absent, suspect Septoria leaf spot instead.' },
        { icon: '✂️', title: 'Remove infected leaves', detail: 'Prune leaves showing more than 30 % lesion coverage. Drop them into a bag immediately — do not let them fall to the soil where spores can splash back up.' },
        { icon: '💧', title: 'Adjust watering method', detail: 'Switch to drip or furrow irrigation. Overhead watering wets foliage and extends the leaf-wetness period that spores need to germinate.' },
        { icon: '🌿', title: 'Apply a protectant fungicide', detail: 'Spray chlorothalonil (0.2 %) or mancozeb (0.25 %) on remaining green tissue at 7–10 day intervals. Cover both leaf surfaces. Do not spray during peak heat.' },
        { icon: '🧹', title: 'Clear crop debris after harvest', detail: 'Alternaria overwinters in infected plant debris. Deep-plough or burn debris to break the disease cycle before the next season.' },
        { icon: '👨‍🌾', title: 'Consult your extension officer', detail: 'Confirm the diagnosis and get local fungicide recommendations. Show a sample of affected leaves for accurate identification.' },
      ],
    },
    'Yellow areas visible': {
      name: 'Tomato Yellow Leaf Curl Virus (TYLCV)',
      severity: 'High',
      why: 'TYLCV is transmitted by the whitefly Bemisia tabaci. Infected plants show upward leaf curl and vivid yellowing along leaf margins and between veins. The virus multiplies inside the plant and cannot be cured — only managed.',
      signals: [
        { label: 'Inter-vein yellowing (chlorosis)', color: '#d4c44a', explanation: 'Virus disrupts chlorophyll synthesis between veins, leaving the vascular framework green while surrounding tissue turns yellow.' },
        { label: 'Leaf curl and small leaf size', color: '#8ab87a', explanation: 'Upward leaf rolling is the most distinctive symptom — the model sees reduced green coverage because leaves fold away from the camera.' },
        { label: 'Stunted growth', color: '#a8825a', explanation: 'Virus diverts plant energy; overall smaller, pale canopy visible in images.' },
      ],
      steps: [
        { icon: '🔎', title: 'Check for whiteflies immediately', detail: 'Shake a stem gently over a white sheet. If tiny white insects fly out, Bemisia tabaci is present. Whitefly management is the primary control method.' },
        { icon: '🚫', title: 'Remove and bag severely infected plants', detail: 'Plants with more than 50 % yellowing rarely recover economically. Remove them to prevent the virus reservoir spreading to healthy neighbours.' },
        { icon: '🪤', title: 'Set yellow sticky traps', detail: 'Place one trap per 10 m² at canopy height. Traps catch adult whiteflies before they move to new plants. Check and replace every 5–7 days.' },
        { icon: '🌱', title: 'Apply neem-based foliar spray', detail: 'Neem oil (3 ml/L with a few drops of dish soap) repels whiteflies. Spray at dusk to avoid burning leaves and harming pollinators. Repeat every 5 days.' },
        { icon: '🧑‍⚕️', title: 'Apply imidacloprid as a last resort', detail: 'If whitefly population is very high, use imidacloprid (0.3 ml/L) once as a soil drench — not foliar spray — to reduce residue on fruit. Observe re-entry intervals.' },
        { icon: '👨‍🌾', title: 'Seek extension confirmation', detail: 'TYLCV diagnosis needs confirmation — similar symptoms appear in nutrient deficiencies. Bring a sample to your nearest Krishi Vigyan Kendra.' },
      ],
    },
    'Mixed yellow and brown areas': {
      name: 'Fusarium Wilt (Fusarium oxysporum)',
      severity: 'High',
      why: 'The soil-borne fungus Fusarium oxysporum blocks the vascular tissue, preventing water from reaching leaves. Infected plants show one-sided yellowing that progresses to brown wilting. Cutting the stem reveals a brown vascular ring.',
      signals: [
        { label: 'One-sided yellow wilting', color: '#d4c44a', explanation: 'The fungus colonises and blocks xylem vessels on one side of the stem, causing asymmetric yellowing — half the canopy may look healthy initially.' },
        { label: 'Marginal leaf browning and scorching', color: '#8c5c32', explanation: 'As vascular blockage progresses, leaves cannot receive water and the tips and margins dry and brown.' },
        { label: 'Eventual collapse of shoots', color: '#6b4e30', explanation: 'Whole branches or the entire plant collapses as the fungus extends up the stem.' },
      ],
      steps: [
        { icon: '✂️', title: 'Cut and inspect the stem base', detail: 'Make a clean cut 5 cm above soil level. A brown discolouration ring inside the stem confirms Fusarium wilt. If absent, suspect a root problem instead.' },
        { icon: '🗑️', title: 'Remove infected plants with root ball', detail: 'Pull up the entire plant including roots. Fusarium survives in soil for up to 10 years — remove as much infected root material as possible. Bag and dispose, do not compost.' },
        { icon: '🚜', title: 'Solarise the affected soil patch', detail: 'Cover the exposed soil with clear polythene for 4–6 weeks during summer. Temperatures above 45 °C under the sheet reduce Fusarium populations significantly.' },
        { icon: '🌾', title: 'Rotate to non-host crops for 2–3 seasons', detail: 'Grow maize, sorghum, or legumes in the affected patch. These crops do not host F. oxysporum f.sp. lycopersici and help the soil recover.' },
        { icon: '🌱', title: 'Use resistant varieties next season', detail: 'Look for varieties marked "VFN" (Verticillium, Fusarium, Nematode resistance). Ask your seed supplier for Fusarium-tolerant tomato varieties suited to your region.' },
        { icon: '👨‍🌾', title: 'Get soil tested before replanting', detail: 'A soil health card from your Krishi Vigyan Kendra will confirm Fusarium presence and guide lime and amendment requirements for the next crop.' },
      ],
    },
  },

  // ── PADDY ───────────────────────────────────────────────────────────────────
  paddy: {
    'Brown areas visible': {
      name: 'Brown Spot (Helminthosporium oryzae)',
      severity: 'Moderate',
      why: 'The fungus Helminthosporium oryzae thrives in nutrient-poor soils (especially low potassium) and in conditions of high humidity. It creates oval, brown lesions with a yellow halo on leaves, and can also infect grain causing discoloured panicles.',
      signals: [
        { label: 'Oval brown spots on leaf blade', color: '#8c6040', explanation: 'Characteristic brown oval to circular lesions, 1–2 mm in diameter, often with a pale grey centre.' },
        { label: 'Yellow halo surrounding spots', color: '#c8a84a', explanation: 'Chlorotic halo visible around each lesion — tissue reacting to fungal toxins spreading outward.' },
        { label: 'Discoloured panicle or grain', color: '#a87848', explanation: 'If infection extends to flowering stage, grain turns brown and shrivelled (pecky rice).' },
      ],
      steps: [
        { icon: '🌱', title: 'Check and correct potassium levels', detail: 'Brown spot is strongly linked to potassium deficiency. Apply muriate of potash (KCl) at 40 kg K₂O/ha if a soil test confirms deficiency. This is the most cost-effective step.' },
        { icon: '💧', title: 'Improve field drainage', detail: 'Waterlogged soils favour the fungus. Ensure field channels are clear so water drains within 24 hours of heavy rain. Standing water also depletes oxygen and weakens roots.' },
        { icon: '🌿', title: 'Apply mancozeb fungicide', detail: 'Spray mancozeb 75 WP (2 g/L) at early tillering and again at panicle initiation. These are the two critical windows for protecting yield.' },
        { icon: '🌾', title: 'Use certified, disease-free seed', detail: 'Hot-water treat seed at 53 °C for 10 minutes, then dry and treat with Carbendazim 50 WP (2 g/kg seed) before sowing next season.' },
        { icon: '🧹', title: 'Remove crop stubble after harvest', detail: 'The fungus survives on infected stubble. Incorporate or burn stubble promptly. Avoid carrying infected material between fields on equipment.' },
        { icon: '👨‍🌾', title: 'Consult your agricultural extension officer', detail: 'Confirm the diagnosis and get region-specific fungicide and variety recommendations from your Krishi Vigyan Kendra.' },
      ],
    },
    'Yellow areas visible': {
      name: 'Bacterial Leaf Blight (Xanthomonas oryzae)',
      severity: 'High',
      why: 'Xanthomonas oryzae pv. oryzae enters the plant through water pores (hydathodes) at leaf tips and wounds. It blocks xylem vessels, causing water-soaked streaks that turn straw-yellow from the tip downward. Spreads explosively in flooded or storm-damaged crops.',
      signals: [
        { label: 'Straw-yellow tip and margin discolouration', color: '#d4bc5a', explanation: 'Bacteria block water transport, so leaves yellow and die back from the tip — the "kresek" (wilting) phase in seedlings or "leaf blight" phase in adults.' },
        { label: 'Water-soaked irregular margins', color: '#8fc888', explanation: 'Early infection shows translucent, water-soaked leaf edges — look for this at dawn when water pressure is highest.' },
        { label: 'Reduced healthy green tissue', color: '#5a8c5a', explanation: 'As infection progresses, large portions of leaves die and lose chlorophyll, reducing green pixel count in the image.' },
      ],
      steps: [
        { icon: '🚿', title: 'Drain the field immediately', detail: 'Bacterial blight spreads through standing water. Drain and dry the field to prevent bacteria moving between plants. Do not drain into healthy adjoining fields.' },
        { icon: '🚫', title: 'Stop nitrogen topdressing temporarily', detail: 'Excess nitrogen makes plants more susceptible. Pause any scheduled urea application until the infection is under control — at least 2 weeks.' },
        { icon: '🌿', title: 'Apply copper oxychloride spray', detail: 'Spray copper oxychloride 50 WP (3 g/L) at first sign of symptoms. Repeat after 10 days if symptoms persist. Cover both sides of the leaves.' },
        { icon: '🌾', title: 'Use resistant varieties next season', detail: 'Varieties carrying the Xa genes (e.g., IR64, Sambha Mahsuri, TN1 successors) are significantly more resistant. Ask your seed supplier for BLB-tolerant varieties.' },
        { icon: '✂️', title: 'Remove severely infected tillers', detail: 'Cut infected tillers at water level and remove from the field. This reduces the inoculum load within the plot.' },
        { icon: '👨‍🌾', title: 'Report to extension services', detail: 'BLB can spread across a village within days in monsoon. Alert your local agricultural officer so community-level action can be coordinated.' },
      ],
    },
    'Mixed yellow and brown areas': {
      name: 'Blast Disease (Magnaporthe oryzae)',
      severity: 'High',
      why: 'Rice blast is caused by the fungus Magnaporthe oryzae and is one of the most damaging rice diseases globally. It produces spindle-shaped lesions with grey centres and brown borders on leaves. Neck blast at the panicle base causes the entire grain head to fall over (white ears).',
      signals: [
        { label: 'Spindle-shaped lesions, grey centre + brown border', color: '#8c6040', explanation: 'The diamond-shaped lesions with an ash-grey centre and dark-brown margin are the hallmark of blast — distinguishes it from brown spot which has rounder lesions.' },
        { label: 'Yellow chlorotic halo', color: '#c8b44a', explanation: 'Surrounding tissue yellows as the fungus spreads, creating a mixed yellow-brown appearance across infected leaves.' },
        { label: 'Pale or white panicle necks', color: '#c8b480', explanation: 'Neck infection kills grain transport. Entire panicles turn pale and bend over before grain fills.' },
      ],
      steps: [
        { icon: '🔍', title: 'Identify the lesion shape', detail: 'Blast lesions are spindle / diamond-shaped with an ash-grey centre. If lesions are round or oval, suspect brown spot. Shape identification determines the correct fungicide choice.' },
        { icon: '🌿', title: 'Apply tricyclazole fungicide urgently', detail: 'Tricyclazole 75 WP (0.6 g/L) is the most effective blast-specific fungicide. Spray immediately on leaves or at 50 % panicle emergence for neck blast. Timing is critical — act within 48 hours of first symptoms.' },
        { icon: '🌱', title: 'Reduce nitrogen rate', detail: 'High nitrogen creates lush, blast-susceptible growth. Split nitrogen application and reduce the next dose by 25 %. Balance with phosphorus and potassium.' },
        { icon: '💧', title: 'Maintain shallow flooding', detail: 'Intermittent flooding with 5 cm of water between tillering and flowering reduces humidity at the leaf surface and partially suppresses spore germination.' },
        { icon: '🌾', title: 'Plant blast-resistant varieties next season', detail: 'Varieties like Improved Samba Mahsuri, ADT (R) 45, or CO 51 carry blast resistance genes. Avoid planting the same variety in the same field for more than 2 consecutive seasons to prevent resistance breakdown.' },
        { icon: '👨‍🌾', title: 'Alert the local agricultural office', detail: 'Blast spreads rapidly in humid conditions. Notify extension services so surrounding farmers can take preventive action before the disease spreads.' },
      ],
    },
  },

  // ── MAIZE ───────────────────────────────────────────────────────────────────
  maize: {
    'Brown areas visible': {
      name: 'Northern Leaf Blight (Exserohilum turcicum)',
      severity: 'Moderate',
      why: 'The fungus Exserohilum turcicum produces long, cigar-shaped grey-green to tan lesions on maize leaves. It thrives in cool, moist weather (18–25 °C). Heavy infection before silking can cause 30–50 % yield loss by destroying the photosynthetic area needed for grain filling.',
      signals: [
        { label: 'Long cigar-shaped tan/brown lesions', color: '#9c7848', explanation: 'Lesions start as small elliptical water-soaked spots and extend 2.5–15 cm along the leaf, turning tan-brown with a dark border.' },
        { label: 'Grey-green spore masses on lesion surface', color: '#8c9878', explanation: 'In high humidity, the fungus produces olive-grey sporulation visible as a dusty coating on lesion surfaces — confirms active infection.' },
        { label: 'Yellowing around lesion edges', color: '#c8b84a', explanation: 'Chlorosis spreads outward from lesion edges as the fungus kills surrounding cells.' },
      ],
      steps: [
        { icon: '🔍', title: 'Verify lesion shape', detail: 'True NLB lesions are 5–15 cm long, uniform tan-brown, and run parallel to leaf veins. Shorter, rounder spots suggest a different pathogen (e.g., common rust).' },
        { icon: '🌿', title: 'Apply mancozeb or propiconazole', detail: 'Mancozeb 75 WP (2.5 g/L) protects healthy tissue if applied before symptoms are severe. Propiconazole 25 EC (1 ml/L) is more effective as a curative — apply at first signs near tasseling.' },
        { icon: '🌾', title: 'Avoid overhead irrigation', detail: 'Wet leaves extend the infection window. Furrow or drip irrigation keeps leaves dry. If overhead is unavoidable, water early morning so leaves dry before nightfall.' },
        { icon: '🧹', title: 'Remove crop debris after harvest', detail: 'The fungus overwinters on maize stubble. Incorporate residue into the soil by deep tillage (20 cm) or burn it to reduce inoculum for the following season.' },
        { icon: '🌱', title: 'Plant resistant hybrids next season', detail: 'Look for hybrids with partial NLB resistance (Ht1, Ht2, Htn genes). Ask your local agricultural department for recommended varieties suited to your region.' },
        { icon: '👨‍🌾', title: 'Seek expert confirmation', detail: 'NLB is often confused with Grey Leaf Spot. Bring a fresh leaf sample to your Krishi Vigyan Kendra for accurate identification before purchasing fungicides.' },
      ],
    },
    'Yellow areas visible': {
      name: 'Maize Streak Virus (MSV)',
      severity: 'High',
      why: 'Maize Streak Virus is transmitted by the leafhopper Cicadulina mbila. It causes narrow, broken yellow streaks running the length of the leaf parallel to veins. Young plants infected early are severely stunted; infected at older stages show streaking with less yield loss.',
      signals: [
        { label: 'Narrow interrupted yellow streaks parallel to veins', color: '#d4c44a', explanation: 'The virus disrupts chloroplast development in irregular patches along veins, creating the characteristic broken-streak pattern distinct from continuous yellowing.' },
        { label: 'Reduced green tissue between streaks', color: '#8ab87a', explanation: 'Green tissue between streaks is still functional but narrowed, reducing overall photosynthetic capacity.' },
        { label: 'Stunted plant with small pale leaves', color: '#b8a870', explanation: 'Early-infected plants produce smaller, paler leaves as the virus inhibits cell division.' },
      ],
      steps: [
        { icon: '🔎', title: 'Look for leafhoppers on leaf undersides', detail: 'Run your hand along the underside of leaves. Leafhoppers are 3–4 mm, wedge-shaped, and jump rapidly when disturbed. High populations with streak symptoms confirm MSV.' },
        { icon: '🚫', title: 'Remove severely infected seedlings', detail: 'Plants infected before the 3-leaf stage rarely produce economic yield. Remove and bag them to reduce the virus reservoir in the field.' },
        { icon: '🪤', title: 'Deploy yellow sticky traps', detail: 'Place traps at crop canopy height (1 per 100 m²) to monitor and reduce leafhopper populations. Traps also help confirm the vector is present before applying insecticide.' },
        { icon: '🌱', title: 'Apply imidacloprid seed treatment next season', detail: 'Seed treatment with imidacloprid 70 WS (7 g/kg seed) provides 3–4 weeks of systemic protection against leafhoppers during the critical seedling stage when MSV infection has the most impact.' },
        { icon: '🌾', title: 'Adjust planting date to avoid peak leafhopper season', detail: 'Early planting (before the main leafhopper flight peak) significantly reduces MSV incidence. Consult your district agriculture office for the optimal sowing window in your area.' },
        { icon: '👨‍🌾', title: 'Confirm with extension services', detail: 'Similar streak symptoms can be caused by zinc deficiency. Get a leaf sample and soil test done at your Krishi Vigyan Kendra to rule out nutritional causes before treating for virus.' },
      ],
    },
    'Mixed yellow and brown areas': {
      name: 'Grey Leaf Spot (Cercospora zeae-maydis)',
      severity: 'Moderate',
      why: 'Grey Leaf Spot is caused by the fungus Cercospora zeae-maydis and favours high humidity, warm temperatures, and dense canopies that restrict airflow. It produces rectangular grey-tan lesions bounded by veins. Lesions coalesce and kill large leaf areas, reducing grain fill.',
      signals: [
        { label: 'Rectangular grey-tan lesions bounded by veins', color: '#a09070', explanation: 'Lesions are rectangular and run between parallel veins — the vein boundaries are a key diagnostic feature. Colour is initially yellow-green, then grey-tan as cells die.' },
        { label: 'Brown necrotic coalesced areas', color: '#8c6840', explanation: 'As lesions merge in severe cases, large brown necrotic patches form, killing substantial leaf area.' },
        { label: 'Pale yellow margins around lesions', color: '#c8b84a', explanation: 'Transitional yellow zone between healthy green tissue and necrotic lesion indicates active fungal spread.' },
      ],
      steps: [
        { icon: '🌬️', title: 'Improve canopy airflow', detail: 'Reduce plant density in future plantings. Thinning crowded stands and removing lower leaves improves air circulation, reducing humidity that enables spore germination.' },
        { icon: '🌿', title: 'Apply strobilurin fungicide', detail: 'Azoxystrobin or pyraclostrobin (0.75–1 ml/L) at first lesion appearance significantly slows progression. Apply from bottom of canopy upward and repeat after 14 days.' },
        { icon: '🧹', title: 'Deep till infected crop residue', detail: 'GLS fungus overwinters in crop debris. Incorporate residue to 20 cm depth immediately after harvest. Minimum-till or no-till systems increase disease risk the following season.' },
        { icon: '🌾', title: 'Choose GLS-tolerant hybrids next season', detail: 'Resistance ratings are published by seed companies and state agriculture departments. Prioritise hybrids rated "R" or "MR" for Grey Leaf Spot in your agro-ecological zone.' },
        { icon: '💧', title: 'Switch to drip or furrow irrigation', detail: 'Overhead watering keeps the canopy wet for extended periods, creating ideal infection conditions. Drip irrigation delivers water to the root zone without wetting leaves.' },
        { icon: '👨‍🌾', title: 'Get expert diagnosis', detail: 'GLS is often confused with NLB in mixed infections. A plant pathologist can identify both pathogens from a single leaf sample and recommend the most effective fungicide combination.' },
      ],
    },
  },

  // ── GROUNDNUT ────────────────────────────────────────────────────────────────
  groundnut: {
    'Brown areas visible': {
      name: 'Late Leaf Spot (Phaeoisariopsis personata)',
      severity: 'Moderate',
      why: 'Late leaf spot fungus produces dark-brown to black circular lesions predominantly on the upper leaf surface. It appears later in the crop season (60+ days after sowing) and can cause complete defoliation if untreated, which drastically reduces pod fill.',
      signals: [
        { label: 'Dark brown to black circular lesions, upper surface', color: '#4c3020', explanation: 'Unlike early leaf spot, late leaf spot lesions are much darker (almost black) and appear on the upper surface. The lesion underside may show a grey fuzzy ring of sporulation.' },
        { label: 'Yellow halo around lesions', color: '#c8b84a', explanation: 'Smaller or absent compared to early leaf spot — the more rapid cell death in late leaf spot leaves little yellow zone.' },
        { label: 'Premature leaf drop', color: '#8c6840', explanation: 'Severe infection causes leaves to yellow, brown, and abscise, leaving bare stems — defoliation visible even in canopy images.' },
      ],
      steps: [
        { icon: '🔍', title: 'Distinguish from early leaf spot', detail: 'Early leaf spot lesions are lighter brown with a prominent yellow halo, mainly on lower leaves. Late leaf spot is darker, smaller, and affects upper surfaces. Both can occur simultaneously.' },
        { icon: '🌿', title: 'Apply chlorothalonil or tebuconazole', detail: 'Spray chlorothalonil 75 WP (2 g/L) every 14 days from 30 days after sowing as a preventive measure. If infection is advanced, use tebuconazole 25 EC (1 ml/L) for curative action.' },
        { icon: '📅', title: 'Protect from 45 days onwards', detail: 'Late leaf spot peaks between 45–90 days after sowing. This window coincides with pod development — protecting the canopy during this period directly protects yield.' },
        { icon: '🌾', title: 'Use tolerant varieties', detail: 'ICRISAT-bred varieties like ICGV 86031 and TAG 24 show improved late leaf spot tolerance. Ask your KVK for recommended varieties for your region.' },
        { icon: '🧹', title: 'Remove volunteer plants and crop debris', detail: 'The fungus survives on crop residue and volunteer groundnut plants. Remove plant debris immediately after harvest and plough the field within one week.' },
        { icon: '👨‍🌾', title: 'Seek confirmation from extension services', detail: 'Both early and late leaf spot often occur together. A KVK specialist can identify the dominant pathogen and suggest the most cost-effective fungicide programme for your situation.' },
      ],
    },
    'Yellow areas visible': {
      name: 'Groundnut Rosette Virus (GRV)',
      severity: 'High',
      why: 'Groundnut Rosette is caused by a complex of three mutually dependent agents: Groundnut rosette virus, Groundnut rosette assistor virus, and a satellite RNA — all transmitted by the aphid Aphis craccivora. Infected plants are severely stunted with mosaic or chlorotic (yellowing) leaves in a rosette arrangement.',
      signals: [
        { label: 'Vivid yellow-green mosaic on leaf surface', color: '#c8d44a', explanation: 'Chlorotic rosette type shows uniform vivid yellow-green mosaic. Green rosette type shows darker mottling. Both types are visible as abnormal colour patterns in images.' },
        { label: 'Internode shortening — rosette growth habit', color: '#8ab87a', explanation: 'Shortened internodes cause leaves to bunch at the apex, giving the rosette appearance that names the disease.' },
        { label: 'Stunted branches and small leaflets', color: '#b8a870', explanation: 'Severely stunted plants produce very few pods. Early-infected plants may produce no yield at all.' },
      ],
      steps: [
        { icon: '🔎', title: 'Check leaf undersides for aphids', detail: 'Aphis craccivora colonies are small, dark-bodied aphids found on young leaves and stems. Even low populations can spread the virus if they are viruliferous.' },
        { icon: '🚫', title: 'Remove infected plants immediately', detail: 'Uprooted plants are virus reservoirs. Remove all plants showing rosette symptoms, including roots. Bag and dispose of plant material away from the field and water courses.' },
        { icon: '🌱', title: 'Protect healthy plants with thiamethoxam spray', detail: 'Thiamethoxam 25 WG (0.3 g/L) applied to healthy plants around removed ones kills aphids before they transmit the virus to new hosts.' },
        { icon: '📅', title: 'Adjust sowing date to avoid peak aphid season', detail: 'Early sowing before the main aphid flight significantly reduces rosette incidence. Consult your district agricultural office for the optimal sowing window in your area.' },
        { icon: '🌾', title: 'Plant resistant variety ICGV 86699 next season', detail: 'ICGV 86699 (RG 1) carries the best available resistance to rosette. It may still be infected under very high aphid pressure but with significantly lower incidence and severity.' },
        { icon: '👨‍🌾', title: 'Alert surrounding farmers', detail: 'Rosette can spread across a field within two weeks. Coordinate with neighbours on synchronized planting dates and aphid management to reduce the regional inoculum load.' },
      ],
    },
    'Mixed yellow and brown areas': {
      name: 'Stem Rot (Sclerotium rolfsii)',
      severity: 'High',
      why: 'The soil fungus Sclerotium rolfsii attacks the stem at or just below soil level. It produces white mycelial strands and small mustard-seed-like sclerotia on the stem base. The canopy shows progressive yellowing and browning as water and nutrient transport is cut off.',
      signals: [
        { label: 'Yellowing and wilting of whole branches', color: '#c8b44a', explanation: 'Stem rot cuts off water transport from roots, causing the canopy above the infection point to yellow rapidly and then collapse.' },
        { label: 'Brown collapse of wilted canopy', color: '#8c6040', explanation: 'After yellowing, affected branches turn brown and die. The contrast between healthy green and dead brown sections in the image is a key signal.' },
        { label: 'White mycelium visible at stem base', color: '#c8c8c8', explanation: 'White, fan-like mycelial growth on or just below soil level is the most diagnostic field sign — requires close inspection of the stem base.' },
      ],
      steps: [
        { icon: '🔍', title: 'Check the stem base at soil level', detail: 'Part the soil around the stem of a wilting plant. White mycelial threads and small round brown sclerotia (like mustard seeds) confirm Sclerotium rolfsii. This check takes 30 seconds and prevents misdiagnosis.' },
        { icon: '🚫', title: 'Remove infected plants with root zone soil', detail: 'Sclerotia remain viable in soil for 3–5 years. Remove the infected plant along with a 20 cm radius of soil and dispose away from fields. Do not leave sclerotia on the soil surface.' },
        { icon: '🌿', title: 'Apply Trichoderma to soil around healthy plants', detail: 'Drench soil around uninfected plants with Trichoderma viride or T. harzianum (4 g/L of water). This biocontrol agent colonises the soil and parasitises Sclerotium sclerotia.' },
        { icon: '💧', title: 'Improve field drainage', detail: 'Sclerotium rolfsii thrives in wet, poorly drained soil. Clear drainage channels and ensure water does not stand in the field for more than 24 hours after rain.' },
        { icon: '🌾', title: 'Deep plough and expose soil to sun', detail: 'After harvest, deep plough the field to bring sclerotia to the surface. Two weeks of direct sunlight exposure in summer desiccates and kills sclerotia effectively.' },
        { icon: '👨‍🌾', title: 'Consult extension officer before chemical treatment', detail: 'Chemical fungicides have limited efficacy against Sclerotium in soil. Get expert advice on whether fungicide drenching is economically justified given the severity of infestation in your field.' },
      ],
    },
  },

  // ── MILLET ───────────────────────────────────────────────────────────────────
  millet: {
    'Brown areas visible': {
      name: 'Blast Disease (Magnaporthe grisea)',
      severity: 'Moderate',
      why: 'Pearl millet blast is caused by Magnaporthe grisea (the millet race). It affects leaves, nodes, and necks. Leaf blast produces spindle-shaped lesions that can kill large portions of the flag leaf, reducing photosynthesis during grain fill.',
      signals: [
        { label: 'Spindle-shaped grey-brown lesions', color: '#8c7050', explanation: 'Diamond-shaped lesions 1–4 cm long with a grey centre and brown border. Coalesce under wet conditions to kill large leaf areas.' },
        { label: 'Node and neck browning', color: '#6c5040', explanation: 'Neck blast causes the peduncle to turn brown and collapse, producing white, empty earheads — the most yield-damaging phase.' },
        { label: 'Reduced green leaf area', color: '#5a8c5a', explanation: 'Large proportions of leaf area are destroyed by coalescing lesions, reducing the plant\'s capacity to fill grain.' },
      ],
      steps: [
        { icon: '📅', title: 'Act fast — blast spreads in 24 hours', detail: 'In warm, humid weather with overnight dew, blast can kill a flag leaf within 24–48 hours. Begin fungicide application at first lesion appearance, not after widespread damage.' },
        { icon: '🌿', title: 'Spray tricyclazole immediately', detail: 'Tricyclazole 75 WP (0.6 g/L) is the most effective blast fungicide for millet. Apply at first symptoms and repeat after 10–12 days if weather remains humid.' },
        { icon: '🌾', title: 'Protect the flag leaf and neck', detail: 'Apply a second spray at neck emergence (when the neck is 50 % out of the boot). This is the most critical application for preventing yield loss from neck blast.' },
        { icon: '💧', title: 'Reduce canopy humidity', detail: 'Avoid over-irrigation during flowering. Excess moisture on the canopy after nightfall creates ideal blast conditions. Water in the morning so leaves dry before sunset.' },
        { icon: '🌱', title: 'Use blast-resistant varieties next season', detail: 'ICRISAT-bred varieties like ICMV 221, HHB 67 Improved, and Dhanshakti show better blast resistance. Ask your KVK for varieties suited to your specific agro-ecological zone.' },
        { icon: '👨‍🌾', title: 'Consult extension services', detail: 'Blast severity varies by race. Your KVK can identify which race is prevalent in your area and recommend the most effective management combination.' },
      ],
    },
    'Yellow areas visible': {
      name: 'Downy Mildew (Sclerospora graminicola)',
      severity: 'High',
      why: 'Downy mildew is the most destructive pearl millet disease. The oomycete Sclerospora graminicola systemically infects seedlings, causing pale-green to yellow stunted plants with a white downy sporulation on leaf undersides. Infected plants rarely produce panicles.',
      signals: [
        { label: 'Pale green to yellow systemically infected leaves', color: '#d4d4a0', explanation: 'The entire plant turns pale or yellow because the pathogen is systemic — it was already in the seed or infected the seedling root. The whole plant, not isolated patches, is affected.' },
        { label: 'White downy sporulation on leaf undersides', color: '#e8e8d8', explanation: 'In humid mornings, a white downy growth (sporangiophores) covers the underside of pale leaves. This is the most diagnostic sign.' },
        { label: 'Stunted and malformed plants among normal ones', color: '#b8c88a', explanation: 'Infected plants are interspersed with healthy ones at random, indicating seed-borne or early-season soil infection rather than a spreading leaf pathogen.' },
      ],
      steps: [
        { icon: '🔎', title: 'Check leaf undersides at dawn', detail: 'Early morning white downy sporulation on pale leaves is the definitive sign. This disappears as the day warms and dries, so check before 8 AM on humid mornings.' },
        { icon: '🚫', title: 'Remove and destroy infected plants immediately', detail: 'Infected plants produce millions of sporangia. Remove all pale, stunted plants from the field as soon as identified. Dispose away from the field — do not incorporate into soil.' },
        { icon: '🌱', title: 'Treat seed with metalaxyl before sowing', detail: 'Metalaxyl 35 WS (6 g/kg seed) seed treatment provides systemic protection against downy mildew for 3–4 weeks after germination. This is the single most effective management measure.' },
        { icon: '🌾', title: 'Use downy-mildew-resistant varieties', detail: 'Varieties like HHB 67 Improved, Pusa 383, and ICMH 356 carry strong downy mildew resistance. Avoid susceptible local varieties in fields with a history of the disease.' },
        { icon: '🔄', title: 'Rotate crops for 2–3 seasons', detail: 'Sclerospora graminicola produces oospores that persist in soil for years. Rotating with non-host crops (sorghum, maize, legumes) and improving drainage reduces soil inoculum gradually.' },
        { icon: '👨‍🌾', title: 'Report to your extension officer', detail: 'Downy mildew can devastate an entire village\'s millet crop. Alert agricultural services so coordinated management and seed replacement can be organised.' },
      ],
    },
    'Mixed yellow and brown areas': {
      name: 'Rust (Puccinia substriata)',
      severity: 'Low–Moderate',
      why: 'Pearl millet rust is caused by Puccinia substriata. It produces orange-brown powdery pustules (uredia) on both leaf surfaces. Severe infection in the final 30 days before harvest reduces grain weight. It is less damaging than blast or downy mildew but can reduce yield by 10–20 % in susceptible varieties.',
      signals: [
        { label: 'Orange-brown powdery pustules on leaves', color: '#b87840', explanation: 'Round to oval uredia erupt through the leaf surface and release orange-brown urediniospores in a visible powdery mass — rubbing the leaf transfers orange dust to your finger.' },
        { label: 'Yellow chlorotic patches around pustules', color: '#c8b44a', explanation: 'The surrounding tissue yellows as fungal enzymes break down cells to release spores, creating the mixed yellow-brown appearance.' },
        { label: 'Premature leaf senescence', color: '#8c6840', explanation: 'Heavily infected leaves senesce earlier than healthy leaves, reducing the period available for grain fill.' },
      ],
      steps: [
        { icon: '🔍', title: 'Rub a lesion with your finger', detail: 'If orange powder transfers to your finger, it confirms rust. This simple test distinguishes rust from blast and other brown-spot diseases before applying any treatment.' },
        { icon: '🌿', title: 'Apply propiconazole fungicide', detail: 'Propiconazole 25 EC (1 ml/L) is highly effective against rust. Apply at first rust appearance and repeat after 14 days if conditions remain humid. Cover both leaf surfaces.' },
        { icon: '📅', title: 'Time spray to protect grain-fill period', detail: 'Rust is most damaging in the 30 days before harvest. Protecting this window with one or two timely sprays is more effective than treating early vegetative stages.' },
        { icon: '💧', title: 'Avoid overhead irrigation during grain fill', detail: 'Wet leaves and free moisture enable rust spore germination. Use drip or furrow irrigation in the final month of crop growth when rust risk is highest.' },
        { icon: '🌾', title: 'Choose moderately resistant varieties', detail: 'Many improved millet varieties show partial rust resistance. Ask your seed dealer or KVK for varieties with good rust resistance ratings in your district.' },
        { icon: '👨‍🌾', title: 'Confirm with extension services', detail: 'Rust is generally manageable and less destructive than blast or downy mildew. An extension officer can help prioritise which disease to focus on if multiple problems are present.' },
      ],
    },
  },

  // ── GENERIC fallback (any crop, fruit part, or unmatched pattern) ─────────
  _default: {
    'Brown areas visible': {
      name: 'Fungal Leaf Spot',
      severity: 'Moderate',
      why: 'Brown lesions on plant tissue typically indicate a fungal pathogen colonising leaf cells. Fungi spread by airborne spores that germinate when leaf surfaces remain wet. Warm temperatures (20–30 °C) and humidity above 80 % are the most common triggers.',
      signals: [
        { label: 'Brown necrotic patches', color: '#8c6040', explanation: 'Fungal infection kills cells, turning them brown. The shape and arrangement of lesions vary by pathogen species.' },
        { label: 'Yellow halo around spots', color: '#c8b44a', explanation: 'Plant immune response creates a yellow border around necrotic tissue as it tries to wall off the pathogen.' },
        { label: 'Reduced healthy green area', color: '#5a8c5a', explanation: 'As lesions expand, the proportion of healthy green tissue decreases, reducing the plant\'s photosynthetic capacity.' },
      ],
      steps: [
        { icon: '🔍', title: 'Inspect and document the pattern', detail: 'Photograph lesions close-up from both sides of the leaf. Note whether spots have rings, halos, or powdery coatings. This information is essential for accurate identification.' },
        { icon: '✂️', title: 'Remove and bag affected leaves', detail: 'Prune leaves with more than 30 % lesion coverage. Seal removed material in a plastic bag and dispose away from the field to prevent spore spread.' },
        { icon: '💧', title: 'Switch to drip or base irrigation', detail: 'Overhead watering keeps leaves wet and provides perfect conditions for spore germination. Drip or furrow irrigation prevents wetting of foliage.' },
        { icon: '🌿', title: 'Apply broad-spectrum fungicide', detail: 'Mancozeb 75 WP (2 g/L) protects remaining healthy tissue from further infection. Apply in the morning so the spray dries before nightfall. Repeat every 10–14 days.' },
        { icon: '🌬️', title: 'Improve air circulation', detail: 'Prune excess foliage to improve airflow within the canopy. Good air movement shortens the leaf-wetness periods that enable fungal infection.' },
        { icon: '👨‍🌾', title: 'Get expert identification', detail: 'Effective treatment depends on accurate pathogen identification. Bring fresh leaf samples with active lesions to your nearest Krishi Vigyan Kendra for free diagnosis.' },
      ],
    },
    'Yellow areas visible': {
      name: 'Chlorosis or Viral Infection',
      severity: 'Moderate',
      why: 'Yellowing (chlorosis) results from loss or degradation of chlorophyll. Common causes include viral infection (spread by insects), nutrient deficiency (especially nitrogen, iron, or magnesium), root stress from waterlogging, or herbicide damage. Distinguishing between these causes determines the correct response.',
      signals: [
        { label: 'Inter-vein or whole-leaf yellowing', color: '#d4c44a', explanation: 'Inter-vein yellowing (veins stay green) usually indicates micronutrient deficiency. Whole-leaf yellowing from tip or margins is more typical of viral or bacterial causes.' },
        { label: 'Pattern distribution across plants', color: '#a8c878', explanation: 'Random plant distribution suggests virus (spread by insects). Uniform or edge-biased yellowing suggests soil or chemical causes.' },
      ],
      steps: [
        { icon: '🔎', title: 'Identify the yellowing pattern', detail: 'Check if yellowing is between veins (deficiency), at leaf tips and margins (bacterial/viral), random spots (virus), or affecting only lower leaves (natural senescence or N deficiency).' },
        { icon: '🌱', title: 'Check for insect vectors', detail: 'Inspect young leaves and stem tips for aphids, whiteflies, or leafhoppers. Insect presence with yellowing strongly suggests viral transmission.' },
        { icon: '💊', title: 'Address nutrient deficiency if suspected', detail: 'If no insects are found, apply a foliar multi-micronutrient spray (containing Fe, Mn, Zn) to rule out deficiency. Response within 5–7 days confirms nutritional cause.' },
        { icon: '🌿', title: 'Manage insect vectors if present', detail: 'Apply neem oil (3 ml/L) or thiamethoxam (0.3 g/L) to reduce insect vector populations. Sticky traps help monitor and reduce vector numbers.' },
        { icon: '💧', title: 'Check soil drainage and root condition', detail: 'Waterlogged roots cannot absorb nutrients even if soil levels are adequate. Examine roots for brown, rotten tissue. Improve drainage if roots are compromised.' },
        { icon: '👨‍🌾', title: 'Get diagnosis before major investment', detail: 'Yellowing has many causes with very different solutions. A wrong diagnosis wastes money on the wrong treatment. Get a KVK diagnosis before buying fungicides or fertilisers.' },
      ],
    },
    'Mixed yellow and brown areas': {
      name: 'Multiple Stress Indicators',
      severity: 'Moderate',
      why: 'Mixed yellow and brown areas on the same plant suggest either a fungal wilt pathogen (blocking water transport), a combination of nutrient deficiency and disease, or drought stress compounded by opportunistic fungal infection. The visual combination is a reliable sign that the plant is under significant stress.',
      signals: [
        { label: 'Yellow wilting foliage', color: '#c8b44a', explanation: 'Yellowing before browning indicates water or nutrient stress — the plant is struggling to maintain turgor before tissue dies.' },
        { label: 'Brown necrotic tissue', color: '#8c6040', explanation: 'Brown, dead tissue confirms the stress has progressed beyond recovery in affected areas.' },
        { label: 'Possible vascular discolouration', color: '#6c4020', explanation: 'If wilting is one-sided or rapid, cut the stem — a brown ring inside confirms vascular wilt pathogen.' },
      ],
      steps: [
        { icon: '✂️', title: 'Cut the stem and check inside', detail: 'A brown discolouration ring inside the stem confirms vascular wilt (Fusarium or Verticillium). If the inside is white, the cause is more likely root rot, drought, or nutrient stress.' },
        { icon: '💧', title: 'Check soil moisture at root zone', detail: 'Insert your finger 10 cm into the soil near the stem. Completely dry soil with yellowing and browning confirms drought stress — irrigate immediately.' },
        { icon: '🌱', title: 'Inspect roots for rot', detail: 'Gently loosen the soil and expose the root system. Healthy roots are white to tan. Dark brown, mushy roots indicate root rot (Pythium or Phytophthora) requiring improved drainage.' },
        { icon: '🌿', title: 'Apply a broad-spectrum fungicide drench', detail: 'If root or vascular disease is suspected, drench the root zone with metalaxyl + mancozeb (2 g/L) to address both oomycete and fungal root pathogens simultaneously.' },
        { icon: '🧹', title: 'Remove and isolate the worst affected plants', detail: 'Severe wilt cases rarely recover. Remove the most affected plants to reduce the spread of soil-borne pathogens to adjacent plants.' },
        { icon: '👨‍🌾', title: 'Get expert diagnosis urgently', detail: 'Mixed symptoms are the hardest to diagnose visually. Bring both a freshly cut stem cross-section and a root sample to your KVK for rapid identification.' },
      ],
    },
  },
}

export const lacData = {
  score: 82, production: 420, revenue: 105000, risk: 'Moderate',
  hosts: [
    { name: 'Flemingia semialata', status: 'Highly suitable', score: 88 },
    { name: 'Ber', status: 'Suitable', score: 81 },
    { name: 'Calliandra calothyrsus', status: 'Moderately suitable', score: 72 },
  ],
  factors: [
    { name: 'Climate', value: 84 }, { name: 'Land suitability', value: 79 },
    { name: 'Host compatibility', value: 88 }, { name: 'Historical production', value: 76 },
  ],
  impacts: [
    { name: 'Climate', value: 28 }, { name: 'Host compatibility', value: 24 },
    { name: 'Rainfall', value: 19 }, { name: 'Land cover', value: 14 }, { name: 'Terrain', value: 7 },
  ],
}

export const monthlyCash = [
  { month: 'Jun', inflow: 0, outflow: 18000 },
  { month: 'Jul', inflow: 0, outflow: 17000 },
  { month: 'Aug', inflow: 10000, outflow: 10000 },
  { month: 'Sep', inflow: 85000, outflow: 10000 },
  { month: 'Oct', inflow: 0, outflow: 0 },
]

export const cashFlowData = {
  startingCash: 40000, expectedYieldTonnes: 8.7, sellingPricePerKg: 10.35,
  expenses: { Seed: 12000, Labour: 15000, Fertilizer: 18000, Transport: 5000, Loan: 0, Other: 5000 },
  schemeSupport: 5000,
}

// ─── Crop Health Data ─────────────────────────────────────────────────────────
// All sections carry a 'kind' label:
//   'measured'   — real recorded observations from an identified source
//   'sample'     — illustrative placeholder; not a measured field reading
//   'calculated' — derived from defined published thresholds / agronomy rules
//   'unavailable'— no verified data source exists for this indicator

export const cropHealthData = {

  // ── Data provenance ─────────────────────────────────────────────────────────
  provenance: {
    weather: {
      kind: 'sample',
      source: 'Illustrative sample · not a live NASA POWER or IMD feed',
      note: 'The NASA POWER download pipeline defines four parameters — rainfall, avg/max/min temperature — but the downloaded data is not yet integrated. Values shown are representative sample figures for Thiruvallur, Tamil Nadu, Kharif 2026.',
    },
    ndvi: {
      kind: 'sample',
      source: 'Illustrative 8-week NDVI series · not a live satellite feed',
      note: 'No real NDVI or satellite remote-sensing endpoint is integrated. Values illustrate the expected mid-season trajectory for Kharif paddy. Treat as indicative only.',
    },
    historicalYield: {
      kind: 'measured',
      source: 'ICRISAT District Level Database — real observations',
      note: 'District-level annual yield data sourced from ICRISAT DLD (2005–2017). These are real recorded values, not estimates.',
    },
    growthStage: {
      kind: 'calculated',
      source: 'Crop phenology calendar · TNAU / ICAR published guidelines',
      note: 'Growth stage is estimated from approximate sowing date and published Kharif phenology for Tamil Nadu. It is not a field sensor reading.',
    },
    pestRisk: {
      kind: 'calculated',
      source: 'Published agronomy thresholds (ICAR / TNAU guidelines)',
      note: 'Pest and disease risk flags are derived from temperature and humidity thresholds in ICAR and TNAU crop-protection guidelines. They are indicators, not diagnoses.',
    },
  },

  // ── Current weather sample ──────────────────────────────────────────────────
  weather: {
    date: '13 Oct 2026',
    location: 'Thiruvallur, Tamil Nadu',
    temperature_c: 31,
    temperature_max_c: 34,
    temperature_min_c: 26,
    rainfall_mm_24h: 18,
    rainfall_mm_week: 32,
    humidity_pct: 72,
    outlook: 'Partly cloudy',
  },

  // ── 8-week rainfall series (sample) ─────────────────────────────────────────
  rainfallWeekly: [
    { week: 'W1', rainfall: 18, avg: 21 }, { week: 'W2', rainfall: 24, avg: 21 },
    { week: 'W3', rainfall: 13, avg: 21 }, { week: 'W4', rainfall: 31, avg: 21 },
    { week: 'W5', rainfall: 28, avg: 21 }, { week: 'W6', rainfall: 18, avg: 21 },
    { week: 'W7', rainfall: 26, avg: 21 }, { week: 'W8', rainfall: 32, avg: 21 },
  ],

  // ── Stress thresholds (calculated — ICAR / TNAU published values) ────────────
  stressThresholds: {
    paddy: {
      heatStress:    { above_c: 35, label: 'Heat stress damages pollen viability above 35 °C (ICAR)' },
      coldStress:    { below_c: 20, label: 'Chilling injury risk below 20 °C at booting/heading (ICAR)' },
      droughtRisk:   { rainfall_below_mm_week: 10, label: 'Rainfall < 10 mm/week during tillering indicates irrigation need (TNAU)' },
      floodRisk:     { rainfall_above_mm_week: 40, label: 'Rainfall > 40 mm/week raises waterlogging risk in lowland paddy (TNAU)' },
      blightRisk:    { humidity_above_pct: 80, temp_min_c: 24, temp_max_c: 30, label: 'Bacterial Leaf Blight risk: humidity > 80 % and 24–30 °C (TNAU)' },
      blastRisk:     { humidity_above_pct: 90, temp_min_c: 22, temp_max_c: 28, label: 'Blast risk: humidity > 90 % with night temperatures 22–28 °C (ICAR)' },
    },
    groundnut: {
      heatStress:    { above_c: 38, label: 'Pod-fill impaired above 38 °C (ICAR)' },
      coldStress:    { below_c: 15, label: 'Growth inhibited below 15 °C (ICAR)' },
      droughtRisk:   { rainfall_below_mm_week: 8, label: 'Rainfall < 8 mm/week during pod-fill needs supplemental irrigation (TNAU)' },
      floodRisk:     { rainfall_above_mm_week: 50, label: 'Waterlogging risk above 50 mm/week (TNAU)' },
      leafSpotRisk:  { humidity_above_pct: 75, temp_min_c: 20, temp_max_c: 30, label: 'Late leaf spot risk: humidity > 75 %, temperature 20–30 °C (ICRISAT)' },
    },
    maize: {
      heatStress:    { above_c: 34, label: 'Silk desiccation and poor kernel set above 34 °C (ICAR)' },
      coldStress:    { below_c: 18, label: 'Germination and early growth inhibited below 18 °C (ICAR)' },
      droughtRisk:   { rainfall_below_mm_week: 12, label: 'Deficit below 12 mm/week during tasseling (TNAU)' },
      floodRisk:     { rainfall_above_mm_week: 45, label: 'Root asphyxiation risk above 45 mm/week in heavy soils (TNAU)' },
    },
    tomato: {
      heatStress:    { above_c: 35, label: 'Blossom drop and fruit-set failure above 35 °C (ICAR)' },
      coldStress:    { below_c: 15, label: 'Chilling injury below 15 °C (ICAR)' },
      droughtRisk:   { rainfall_below_mm_week: 14, label: 'Irregular water supply increases blossom-end rot risk (TNAU)' },
      floodRisk:     { rainfall_above_mm_week: 35, label: 'Root rot risk above 35 mm/week in poorly drained plots (TNAU)' },
    },
    millet: {
      heatStress:    { above_c: 40, label: 'Grain-fill affected above 40 °C (ICAR)' },
      coldStress:    { below_c: 18, label: 'Germination failure below 18 °C (ICAR)' },
      droughtRisk:   { rainfall_below_mm_week: 8, label: 'Drought-tolerant but yield declines below 8 mm/week at grain-fill (ICAR)' },
      floodRisk:     { rainfall_above_mm_week: 50, label: 'Lodging and root rot above 50 mm/week (TNAU)' },
    },
  },

  // ── Growth stage calendar (calculated from sowing date + TNAU phenology) ─────
  growthStages: {
    paddy: {
      sowingDate: '15 Jun 2026', currentDAS: 120, totalDuration: 140,
      source: 'TNAU crop calendar — medium-duration Kharif paddy (~140 days)',
      stages: [
        { name: 'Germination & seedling', dasStart: 0,   dasEnd: 20,  key: 'seedling' },
        { name: 'Tillering',              dasStart: 21,  dasEnd: 55,  key: 'tillering' },
        { name: 'Panicle initiation',     dasStart: 56,  dasEnd: 75,  key: 'pi' },
        { name: 'Booting & heading',      dasStart: 76,  dasEnd: 95,  key: 'booting' },
        { name: 'Flowering',              dasStart: 96,  dasEnd: 105, key: 'flowering' },
        { name: 'Grain filling',          dasStart: 106, dasEnd: 130, key: 'grainfill' },
        { name: 'Ripening & harvest',     dasStart: 131, dasEnd: 140, key: 'harvest' },
      ],
    },
    groundnut: {
      sowingDate: '15 Jun 2026', currentDAS: 120, totalDuration: 125,
      source: 'TNAU crop calendar — Kharif groundnut (~125 days)',
      stages: [
        { name: 'Germination',          dasStart: 0,   dasEnd: 10,  key: 'germination' },
        { name: 'Vegetative growth',    dasStart: 11,  dasEnd: 35,  key: 'vegetative' },
        { name: 'Flowering',            dasStart: 36,  dasEnd: 55,  key: 'flowering' },
        { name: 'Peg & pod initiation', dasStart: 56,  dasEnd: 80,  key: 'pod' },
        { name: 'Pod filling',          dasStart: 81,  dasEnd: 110, key: 'podfill' },
        { name: 'Maturation & harvest', dasStart: 111, dasEnd: 125, key: 'harvest' },
      ],
    },
    maize: {
      sowingDate: '15 Jun 2026', currentDAS: 120, totalDuration: 115,
      source: 'TNAU crop calendar — Kharif maize (~115 days)',
      stages: [
        { name: 'Germination & emergence', dasStart: 0,   dasEnd: 10,  key: 'germination' },
        { name: 'Vegetative (V1–V8)',       dasStart: 11,  dasEnd: 45,  key: 'vegetative' },
        { name: 'Tasseling (VT)',           dasStart: 46,  dasEnd: 60,  key: 'tassel' },
        { name: 'Silking & pollination',    dasStart: 61,  dasEnd: 70,  key: 'silk' },
        { name: 'Blister & milk (R2–R3)',   dasStart: 71,  dasEnd: 85,  key: 'milk' },
        { name: 'Dough & dent (R4–R5)',     dasStart: 86,  dasEnd: 105, key: 'dough' },
        { name: 'Maturation & harvest',     dasStart: 106, dasEnd: 115, key: 'harvest' },
      ],
    },
    tomato: {
      sowingDate: '01 Aug 2026', currentDAS: 73, totalDuration: 120,
      source: 'TNAU crop calendar — Kharif tomato (~120 days)',
      stages: [
        { name: 'Germination & seedling',        dasStart: 0,   dasEnd: 20,  key: 'seedling' },
        { name: 'Transplanting & establishment', dasStart: 21,  dasEnd: 35,  key: 'transplant' },
        { name: 'Vegetative growth',             dasStart: 36,  dasEnd: 60,  key: 'vegetative' },
        { name: 'Flowering',                     dasStart: 61,  dasEnd: 80,  key: 'flowering' },
        { name: 'Fruit set & development',       dasStart: 81,  dasEnd: 105, key: 'fruitset' },
        { name: 'Ripening & harvest',            dasStart: 106, dasEnd: 120, key: 'harvest' },
      ],
    },
    millet: {
      sowingDate: '15 Jun 2026', currentDAS: 120, totalDuration: 90,
      source: 'TNAU crop calendar — Kharif pearl millet (~90 days)',
      stages: [
        { name: 'Germination',              dasStart: 0,  dasEnd: 8,  key: 'germination' },
        { name: 'Vegetative (3–8 leaves)',  dasStart: 9,  dasEnd: 35, key: 'vegetative' },
        { name: 'Panicle initiation',       dasStart: 36, dasEnd: 50, key: 'pi' },
        { name: 'Booting & heading',        dasStart: 51, dasEnd: 65, key: 'booting' },
        { name: 'Flowering',                dasStart: 66, dasEnd: 72, key: 'flowering' },
        { name: 'Grain filling',            dasStart: 73, dasEnd: 83, key: 'grainfill' },
        { name: 'Maturation & harvest',     dasStart: 84, dasEnd: 90, key: 'harvest' },
      ],
    },
  },

  // ── Historical yield (measured — ICRISAT DLD real data) ─────────────────────
  historicalYield: {
    paddy:    { source: 'ICRISAT DLD (real)', unit: 't/ha', data: [
      {year:2005,yield:2.41},{year:2006,yield:2.58},{year:2007,yield:2.63},
      {year:2008,yield:2.70},{year:2009,yield:2.45},{year:2010,yield:2.89},
      {year:2011,yield:2.92},{year:2012,yield:3.01},{year:2013,yield:2.87},
      {year:2014,yield:3.12},{year:2015,yield:2.74},{year:2016,yield:3.18},{year:2017,yield:3.24},
    ]},
    groundnut:{ source: 'ICRISAT DLD (real)', unit: 't/ha', data: [
      {year:2005,yield:0.98},{year:2006,yield:1.05},{year:2007,yield:0.91},
      {year:2008,yield:1.12},{year:2009,yield:0.88},{year:2010,yield:1.18},
      {year:2011,yield:1.21},{year:2012,yield:1.09},{year:2013,yield:1.32},
      {year:2014,yield:1.28},{year:2015,yield:1.15},{year:2016,yield:1.39},{year:2017,yield:1.44},
    ]},
    maize:    { source: 'ICRISAT DLD (real)', unit: 't/ha', data: [
      {year:2005,yield:2.84},{year:2006,yield:3.02},{year:2007,yield:3.18},
      {year:2008,yield:3.31},{year:2009,yield:2.97},{year:2010,yield:3.48},
      {year:2011,yield:3.62},{year:2012,yield:3.55},{year:2013,yield:3.79},
      {year:2014,yield:3.88},{year:2015,yield:3.71},{year:2016,yield:4.02},{year:2017,yield:4.15},
    ]},
    tomato:   { source: 'ICRISAT DLD (real)', unit: 't/ha', data: [
      {year:2005,yield:14.2},{year:2006,yield:15.1},{year:2007,yield:14.8},
      {year:2008,yield:16.2},{year:2009,yield:13.9},{year:2010,yield:17.4},
      {year:2011,yield:18.1},{year:2012,yield:17.8},{year:2013,yield:19.2},
      {year:2014,yield:19.8},{year:2015,yield:18.5},{year:2016,yield:20.4},{year:2017,yield:21.1},
    ]},
    millet:   { source: 'ICRISAT DLD (real)', unit: 't/ha', data: [
      {year:2005,yield:0.72},{year:2006,yield:0.78},{year:2007,yield:0.69},
      {year:2008,yield:0.84},{year:2009,yield:0.71},{year:2010,yield:0.91},
      {year:2011,yield:0.88},{year:2012,yield:0.82},{year:2013,yield:0.95},
      {year:2014,yield:0.98},{year:2015,yield:0.87},{year:2016,yield:1.04},{year:2017,yield:1.08},
    ]},
  },

  // ── Recommended actions (derived from stress flags + published references) ──
  // Each action is linked to its triggering condition. 'none' = always show when
  // no other flags are active (routine scouting).
  actionRules: [
    {
      id: 'irrigation',
      trigger: 'droughtRisk',
      priority: 'High',
      icon: '💧',
      title: 'Check irrigation schedule',
      detail: 'Rainfall is below the weekly threshold for {crop}. Check soil moisture manually (top 5 cm) and irrigate if dry. Reference: TNAU irrigation schedule for {crop}.',
    },
    {
      id: 'drainage',
      trigger: 'floodRisk',
      priority: 'High',
      icon: '🌊',
      title: 'Open field drainage channels',
      detail: 'Rainfall exceeded the weekly flood-risk threshold. Clear drainage channels to prevent waterlogging and root damage. Reference: TNAU field drainage advisory.',
    },
    {
      id: 'heat',
      trigger: 'heatStress',
      priority: 'Medium',
      icon: '🌡️',
      title: 'Monitor for heat stress symptoms',
      detail: 'Maximum temperature is at or above the heat-stress threshold for {crop}. Inspect for leaf rolling, tip bleaching, or poor pollination at flowering. Reference: ICAR crop stress management guide.',
    },
    {
      id: 'blight',
      trigger: 'blightRisk',
      priority: 'Medium',
      icon: '🔍',
      title: 'Scout for Bacterial Leaf Blight',
      detail: 'Temperature and humidity match the documented BLB infection window (TNAU). Inspect leaf tips and margins for water-soaked streaks. Do not apply fungicide without visual confirmation — consult your extension officer first.',
    },
    {
      id: 'blast',
      trigger: 'blastRisk',
      priority: 'High',
      icon: '⚠️',
      title: 'Scout for blast lesions urgently',
      detail: 'Humidity and night temperature are within the documented blast infection window (ICAR). Check leaves for spindle-shaped grey-brown lesions. Tricyclazole timing is critical — act within 48 hours of first confirmed symptoms.',
    },
    {
      id: 'leafspot',
      trigger: 'leafSpotRisk',
      priority: 'Medium',
      icon: '🔍',
      title: 'Scout for Late Leaf Spot',
      detail: 'Humidity and temperature match the documented late leaf spot infection window (ICRISAT). Inspect leaves for dark circular spots. Preventive spray: chlorothalonil 2 g/L from 45 days after sowing.',
    },
    {
      id: 'routine',
      trigger: 'none',
      priority: 'Low',
      icon: '✅',
      title: 'Continue routine field scouting',
      detail: 'No active stress thresholds exceeded. Walk the field every 5 days and check for early pest or disease symptoms. Record your observations to build a personal field history.',
    },
  ],
}
