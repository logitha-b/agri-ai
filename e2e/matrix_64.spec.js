// e2e/matrix_64.spec.js
import { test, expect } from '@playwright/test';

const TARGET_MODULES = [
  { path: '/crop-health', name: 'Crop Health' },
  { path: '/disease', name: 'Disease Detection' },
  { path: '/water-risk', name: 'Water & Flood Risk' },
  { path: '/crop-recommendation', name: 'Crop Recommendation' },
  { path: '/market', name: 'Market & Profit' },
  { path: '/lac', name: 'Lac Culture' },
  { path: '/pearl', name: 'Pearl Culture' },
  { path: '/cash-flow', name: 'Farm Cash Flow' },
];

const LANGUAGES = [
  { code: 'en', name: 'English', scriptRegex: null },
  { code: 'hi', name: 'Hindi', scriptRegex: /[\u0900-\u097F]/ },
  { code: 'ta', name: 'Tamil', scriptRegex: /[\u0B80-\u0BFF]/ },
  { code: 'te', name: 'Telugu', scriptRegex: /[\u0C00-\u0C7F]/ },
  { code: 'kn', name: 'Kannada', scriptRegex: /[\u0C80-\u0CFF]/ },
  { code: 'ml', name: 'Malayalam', scriptRegex: /[\u0D00-\u0D7F]/ },
  { code: 'pa', name: 'Punjabi', scriptRegex: /[\u0A00-\u0A7F]/ },
  { code: 'or', name: 'Odia', scriptRegex: /[\u0B00-\u0B7F]/ },
];

test.describe('64 Module-Language Verification Matrix (8 Modules x 8 Languages)', () => {
  for (const mod of TARGET_MODULES) {
    for (const lang of LANGUAGES) {
      test(`[${lang.name} (${lang.code})] on ${mod.name} (${mod.path})`, async ({ page }) => {
        // Set language preference in localStorage
        await page.addInitScript((code) => {
          window.localStorage.setItem('agri_platform_selected_language', code);
        }, lang.code);

        await page.goto(mod.path);
        await page.waitForLoadState('domcontentloaded');

        // Verify page rendered its main container
        await expect(page.locator('.page, .page-header, .ch-toolbar, .profile-page, .scheme-page').first()).toBeVisible({ timeout: 10000 });

        // Extract body text excluding language selector options
        const pageText = await page.evaluate(() => {
          const clone = document.body.cloneNode(true);
          clone.querySelectorAll('select, option, script, style').forEach(el => el.remove());
          return clone.innerText || '';
        });

        if (lang.code === 'en') {
          // Zero Indic scripts allowed on page when English is selected
          const indicMatches = pageText.match(/[\u0900-\u0D7F]+/g) || [];
          const significant = indicMatches.filter(m => m.length > 2);
          expect(significant, `Unexpected Indic text on ${mod.path} in English: ${significant.join(', ')}`).toEqual([]);
        } else {
          // Verify presence of target language script
          const hasScript = lang.scriptRegex.test(pageText);
          expect(hasScript, `Expected ${lang.name} script on ${mod.path}`).toBe(true);
        }
      });
    }
  }
});

