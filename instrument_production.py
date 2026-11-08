with open('src/pages/CropProduction.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add import
if "import { useLanguage }" not in code:
    code = "import { useLanguage } from '../context/LanguageContext'\n" + code

# 2. Add hook call
if "const { t } = useLanguage()" not in code:
    code = code.replace(
        "export default function CropProduction({ onPrediction }) {",
        "export default function CropProduction({ onPrediction }) {\n  const { t } = useLanguage()"
    )

# 3. Replace key strings with t(...)
code = code.replace("eyebrow=\"ENGINE 2 · DISTRICT-LEVEL ESTIMATION\"", "eyebrow={t('ENGINE 2 · DISTRICT-LEVEL ESTIMATION')}")
code = code.replace("title=\"AI Crop Production & Yield Intelligence\"", "title={t('AI Crop Production & Yield Intelligence')}")
code = code.replace("description=\"Estimate yield for a district, crop and year combination using historical agricultural data.\"", "description={t('Estimate yield for a district, crop and year combination using historical agricultural data.')}")
code = code.replace("<b>Real agricultural data only</b>", "<b>{t('Real agricultural data only')}</b>")
code = code.replace("<p>Results are district-level estimates based on historical agricultural data. Entered farm area scales the estimated production.</p>", "<p>{t('Results are district-level estimates based on historical agricultural data. Entered farm area scales the estimated production.')}</p>")
code = code.replace("<b>Coverage matters.</b> Model performance depends on data coverage, quality and similarity between historical observations and current conditions. The current implementation has no integrated soil layer.", "<b>{t('Coverage matters.')}</b> {t('Model performance depends on data coverage, quality and similarity between historical observations and current conditions. The current implementation has no integrated soil layer.')}")
code = code.replace("<h2>Production scenario</h2>", "<h2>{t('Production scenario')}</h2>")
code = code.replace("<p>Selections are populated from the processed source dataset.</p>", "<p>{t('Selections are populated from the processed source dataset.')}</p>")
code = code.replace("<span className=\"production-step\">01 · INPUT</span>", "<span className=\"production-step\">{t('01 · INPUT')}</span>")
code = code.replace("<span>02 · MODEL OUTPUT</span>", "<span>{t('02 · MODEL OUTPUT')}</span>")
code = code.replace("<b>{(modelReady||syntheticAvailable)?'Ready for a source-backed estimate':'No prediction generated'}</b>", "<b>{(modelReady||syntheticAvailable)?t('Ready for a source-backed estimate'):t('No prediction generated', 'No prediction generated')}</b>")
code = code.replace("<p>{(modelReady||syntheticAvailable)?'Choose an observed combination and run the trained model.':'The page will never generate or display a hardcoded yield.'}</p>", "<p>{(modelReady||syntheticAvailable)?t('Choose an observed combination and run the trained model.'):t('The page will never generate or display a hardcoded yield.')}</p>")
code = code.replace("subtitle=\"Risk is calculated only after a source-backed prediction.\"", "subtitle={t('Risk is calculated only after a source-backed prediction.')}")
code = code.replace("<div className=\"production-empty-inline\">No real historical yield variability or calibrated prediction uncertainty is available yet.</div>", "<div className=\"production-empty-inline\">{t('No real historical yield variability or calibrated prediction uncertainty is available yet.')}</div>")
code = code.replace("<span>Farm area (hectares)</span>", "<span>{t('Farm area (hectares)')}</span>")
code = code.replace("placeholder=\"Enter area in hectares\"", "placeholder={t('Enter area in hectares')}")
code = code.replace("<span>Year</span>", "<span>{t('Year')}</span>")
code = code.replace("<span>State</span>", "<span>{t('State')}</span>")
code = code.replace("<span>District</span>", "<span>{t('District')}</span>")
code = code.replace("<span>Crop</span>", "<span>{t('Crop / commodity', 'Crop')}</span>")
code = code.replace("<span>Season</span>", "<span>{t('Season')}</span>")
code = code.replace("{submitting?'Predicting…':'Predict crop yield'}", "{submitting?t('Predicting…'):t('Predict crop yield')}")

with open('src/pages/CropProduction.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("CropProduction.jsx instrumented with t() successfully!")

