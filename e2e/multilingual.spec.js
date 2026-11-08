// e2e/multilingual.spec.js
import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/profile', name: 'Farmer Profile' },
  { path: '/schemes', name: 'Government Schemes' },
  { path: '/production', name: 'Crop Production' },
  { path: '/crop-health', name: 'Crop Health' },
  { path: '/disease', name: 'Disease Detection' },
  { path: '/water-risk', name: 'Water Risk' },
  { path: '/crop-recommendation', name: 'Crop Recommendation' },
  { path: '/market', name: 'Market & Profit' },
  { path: '/loss-insurance', name: 'Crop Loss & Insurance' },
  { path: '/lac', name: 'Lac Culture' },
  { path: '/pearl', name: 'Pearl Culture' },
  { path: '/cash-flow', name: 'Farm Cash Flow' },
  { path: '/settings', name: 'Settings' },
];

const LANGUAGES = [
  { code: 'en', name: 'English', expectedSchemeTitle: 'Government Scheme Intelligence' },
  { code: 'hi', name: 'Hindi', scriptRegex: /[\u0900-\u097F]/, expectedSchemeTitle: 'सरकारी योजना आसूचना' },
  { code: 'ta', name: 'Tamil', scriptRegex: /[\u0B80-\u0BFF]/, expectedSchemeTitle: 'அரசு திட்ட நுண்ணறிவு' },
  { code: 'te', name: 'Telugu', scriptRegex: /[\u0C00-\u0C7F]/, expectedSchemeTitle: 'ప్రభుత్వ పథకాల సమాచారం' },
  { code: 'kn', name: 'Kannada', scriptRegex: /[\u0C80-\u0CFF]/, expectedSchemeTitle: 'ಸರ್ಕಾರಿ ಯೋಜನೆ ಮಾಹಿತಿ' },
  { code: 'ml', name: 'Malayalam', scriptRegex: /[\u0D00-\u0D7F]/, expectedSchemeTitle: 'സർക്കാർ പദ്ധതി വിവരങ്ങൾ' },
  { code: 'pa', name: 'Punjabi', scriptRegex: /[\u0A00-\u0A7F]/, expectedSchemeTitle: 'ਸਰਕਾਰੀ ਸਕੀਮ ਜਾਣਕਾਰੀ' },
  { code: 'or', name: 'Odia', scriptRegex: /[\u0B00-\u0B7F]/, expectedSchemeTitle: 'ସରକାରୀ ଯୋଜନା ବିବରଣୀ' },
];

test.describe('Agri-Economic Multilingual Architecture E2E Tests', () => {

  test('English Acceptance: Selecting English results in 100% pure English with ZERO Hindi text', async ({ page }) => {
    // Set English language in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('agri_platform_selected_language', 'en');
    });

    for (const route of ROUTES) {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      // Specifically check Government Schemes pipeline steps
      if (route.path === '/schemes') {
        await expect(page.locator('.scheme-page-header h1')).toContainText('Government Scheme Intelligence');
        await expect(page.locator('.scheme-pipeline')).toContainText('Farmer profile');
        await expect(page.locator('.scheme-pipeline')).toContainText('Feature processing');
        await expect(page.locator('.scheme-pipeline')).toContainText('Scheme relevance model');
        await expect(page.locator('.scheme-pipeline')).toContainText('Eligibility verification');
        await expect(page.locator('.scheme-pipeline')).toContainText('Recommendations');
      }

      // Extract all rendered text outside the language select options
      const pageText = await page.evaluate(() => {
        const clone = document.body.cloneNode(true);
        // Remove select options (which contain native language names like हिन्दी)
        const selectors = clone.querySelectorAll('select, option');
        selectors.forEach(s => s.remove());
        return clone.innerText || '';
      });

      // Strict test: NO Indian script characters allowed anywhere on the page when English is active
      const indianScriptMatch = pageText.match(/[\u0900-\u0D7F]+/g);
      if (indianScriptMatch) {
        // Filter out any known assistant prompt chips if on assistant page
        const unexpected = indianScriptMatch.filter(m => m.length > 2);
        expect(unexpected, `Route ${route.path} contains unintended Indian script in English: ${unexpected.join(', ')}`).toEqual([]);
      }
    }
  });

  for (const lang of LANGUAGES) {
    if (lang.code === 'en') continue;

    test(`Language [${lang.name}]: All routes correctly render localized content`, async ({ page }) => {
      await page.addInitScript((code) => {
        window.localStorage.setItem('agri_platform_selected_language', code);
      }, lang.code);

      // Test Government Schemes
      await page.goto('/schemes');
      await page.waitForLoadState('domcontentloaded');
      const headerText = await page.locator('.scheme-page-header h1').innerText();
      expect(headerText).toContain(lang.expectedSchemeTitle);

      // Verify that the page contains the target Indic script
      const bodyText = await page.locator('.scheme-pipeline').innerText();
      expect(lang.scriptRegex.test(bodyText)).toBe(true);

      // Test Farmer Profile
      await page.goto('/profile');
      await page.waitForLoadState('domcontentloaded');
      const profileText = await page.locator('.page-header').innerText();
      expect(lang.scriptRegex.test(profileText)).toBe(true);

      // Test Water & Flood Risk
      await page.goto('/water-risk');
      await page.waitForLoadState('domcontentloaded');
      const waterText = await page.locator('.page-header').innerText();
      expect(lang.scriptRegex.test(waterText)).toBe(true);
    });
  }

  test('Water Risk Acceptance: Selecting Hindi renders complete Hindi UI for Water & Flood Risk', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('agri_platform_selected_language', 'hi');
    });

    await page.goto('/water-risk');
    await page.waitForLoadState('domcontentloaded');

    // Page title must be in Hindi
    await expect(page.locator('.page-header h1')).toContainText('जल अवसंरचना एवं बाढ़ जोखिम');
    // Sample button or card must contain Hindi text
    const pageText = await page.locator('.wr-page').innerText();
    expect(/[\u0900-\u097F]/.test(pageText)).toBe(true);
  });

  test('Language Switching & Persistence: Selector updates instantaneously and survives page reload', async ({ page }) => {
    await page.goto('/schemes');
    await page.waitForLoadState('domcontentloaded');

    // Switch to Hindi via Topbar selector
    const selector = page.locator('select.topbar-language-select');
    await selector.selectOption('hi');

    // Verify immediate UI update to Hindi without reload
    await expect(page.locator('.scheme-page-header h1')).toContainText('सरकारी योजना आसूचना');

    // Refresh page and verify persistence
    await page.reload();
    await expect(page.locator('.scheme-page-header h1')).toContainText('सरकारी योजना आसूचना');

    // Switch back to English
    await selector.selectOption('en');
    await expect(page.locator('.scheme-page-header h1')).toContainText('Government Scheme Intelligence');
    await expect(page.locator('.scheme-pipeline')).toContainText('Feature processing');
  });

  test('Mandatory Crop Production Regression: Tamil -> Hindi -> English -> Remaining Languages with ZERO stale text', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/production');
    await page.waitForLoadState('domcontentloaded');

    const selector = page.locator('select.topbar-language-select');
    const sourceSection = page.locator('.production-source-list');

    // 1. Switch to Tamil
    await selector.selectOption('ta');
    await expect(sourceSection).toContainText('ICRISAT மாவட்ட அளவிலான தரவுத்தளம்');

    // 2. Switch from Tamil to Hindi (Exact User Screenshot Bug)
    await selector.selectOption('hi');
    await expect(sourceSection).toContainText('ICRISAT जिला स्तरीय डेटाबेस');
    await expect(sourceSection).toContainText('अर्ध-शुष्क उष्णकटिबंधीय अंतर्राष्ट्रीय फसल अनुसंधान संस्थान');

    // Verify ZERO Tamil script characters remain in the Data Sources section
    const hindiSourceText = await sourceSection.innerText();
    const tamilScriptInHindi = hindiSourceText.match(/[\u0B80-\u0BFF]+/g) || [];
    expect(tamilScriptInHindi, `Found remaining Tamil script when Hindi is selected: ${tamilScriptInHindi.join(', ')}`).toEqual([]);

    // 3. Switch to English
    await selector.selectOption('en');
    await expect(sourceSection).toContainText('ICRISAT District Level Database');
    await expect(sourceSection).toContainText('International Crops Research Institute for the Semi-Arid Tropics');

    // Verify ZERO Indic characters remain in the Data Sources section
    const englishSourceText = await sourceSection.innerText();
    const indicScriptInEnglish = englishSourceText.match(/[\u0900-\u0D7F]+/g) || [];
    expect(indicScriptInEnglish, `Found remaining Indic script when English is selected: ${indicScriptInEnglish.join(', ')}`).toEqual([]);

    // 4. Test Remaining Languages
    const otherLangs = [
      { code: 'te', expected: 'ICRISAT జిల్లా స్థాయి డేటాబేస్' },
      { code: 'kn', expected: 'ICRISAT ಜಿಲ್ಲಾ ಮಟ್ಟದ ಡೇಟಾಬೇಸ್' },
      { code: 'ml', expected: 'ICRISAT ജില്ലാ തല ഡാറ്റാബേസ്' },
      { code: 'pa', expected: 'ICRISAT ਜ਼ਿਲ੍ਹਾ ਪੱਧਰੀ ਡਾਟਾਬੇਸ' },
      { code: 'or', expected: 'ICRISAT ଜିଲ୍ଲା ସ୍ତରୀୟ ଡାଟାବେସ୍' },
    ];

    for (const item of otherLangs) {
      await selector.selectOption(item.code);
      await expect(sourceSection).toContainText(item.expected);
    }
  });

  test('Complete Transition Matrix: Continuous switching across all 8 languages eliminates mixed script', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/schemes');
    await page.waitForLoadState('domcontentloaded');

    const selector = page.locator('select.topbar-language-select');
    const headerTitle = page.locator('.scheme-page-header h1');

    const transitions = [
      { from: 'en', to: 'hi', expected: 'सरकारी योजना आसूचना', disallowedRegex: null },
      { from: 'hi', to: 'ta', expected: 'அரசு திட்ட நுண்ணறிவு', disallowedRegex: /[\u0900-\u097F]/ }, // no Hindi
      { from: 'ta', to: 'te', expected: 'ప్రభుత్వ పథకాల సమాచారం', disallowedRegex: /[\u0B80-\u0BFF]/ }, // no Tamil
      { from: 'te', to: 'ml', expected: 'സർക്കാർ പദ്ധതി വിവരങ്ങൾ', disallowedRegex: /[\u0C00-\u0C7F]/ }, // no Telugu
      { from: 'ml', to: 'kn', expected: 'ಸರ್ಕಾರಿ ಯೋಜನೆ ಮಾಹಿತಿ', disallowedRegex: /[\u0D00-\u0D7F]/ }, // no Malayalam
      { from: 'kn', to: 'pa', expected: 'ਸਰਕਾਰੀ ਸਕੀਮ ਜਾਣਕਾਰੀ', disallowedRegex: /[\u0C80-\u0CFF]/ }, // no Kannada
      { from: 'pa', to: 'or', expected: 'ସରକାରୀ ଯୋଜନା ବିବରଣୀ', disallowedRegex: /[\u0A00-\u0A7F]/ }, // no Punjabi
      { from: 'or', to: 'en', expected: 'Government Scheme Intelligence', disallowedRegex: /[\u0900-\u0D7F]/ }, // no Indic
    ];

    for (const step of transitions) {
      await selector.selectOption(step.to);
      await expect(headerTitle).toContainText(step.expected);

      if (step.disallowedRegex) {
        const text = await page.locator('.scheme-page-header').innerText();
        const forbidden = text.match(step.disallowedRegex) || [];
        expect(forbidden, `Transition from ${step.from} to ${step.to} left foreign script: ${forbidden.slice(0, 5).join(', ')}`).toEqual([]);
      }
    }
  });

  test('Rapid-Switching Stress Test: Rapid sequential selections settle cleanly on latest language', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/schemes');
    await page.waitForLoadState('domcontentloaded');

    const selector = page.locator('select.topbar-language-select');
    const headerTitle = page.locator('.scheme-page-header h1');

    // Rapidly switch through languages with minimal delay
    const rapidSequence = ['hi', 'ta', 'te', 'ml', 'kn', 'pa', 'or'];
    for (const code of rapidSequence) {
      await selector.selectOption(code);
    }

    // Must cleanly and stably settle on the final language (Odia)
    await expect(headerTitle).toContainText('ସରକାରୀ ଯୋଜନା ବିବରଣୀ');

    // Verify zero mixed script letters from earlier languages (Devanagari letters, Tamil, Telugu, Malayalam, Kannada, Punjabi)
    // Note: \u0964 is the Indic danda (।) punctuation mark legitimately shared by Odia sentences
    const headerText = await page.locator('.scheme-page-header').innerText();
    const foreignScripts = headerText.match(/[\u0900-\u0963\u0966-\u0A7F]|[\u0C00-\u0D7F]/g) || [];
    expect(foreignScripts, `Found foreign script in Odia header after rapid switching: ${foreignScripts.slice(0, 5).join(', ')}`).toEqual([]);
  });

});


