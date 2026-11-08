const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5174/recommendation', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  console.log('--- 1. User selects Hindi ---');
  await page.locator('.topbar-language-select').selectOption('hi');
  await page.waitForTimeout(1000);
  
  let hSchemes = await page.locator('a[href="/schemes"] span').textContent();
  console.log('Schemes text in HI:', hSchemes);
  
  console.log('--- 2. User selects Telugu ---');
  await page.locator('.topbar-language-select').selectOption('te');
  await page.waitForTimeout(1000);
  
  let tSchemes = await page.locator('a[href="/schemes"] span').textContent();
  console.log('Schemes text in TE:', tSchemes);

  console.log('--- 3. User selects Kannada ---');
  await page.locator('.topbar-language-select').selectOption('kn');
  await page.waitForTimeout(1000);
  let kSchemes = await page.locator('a[href="/schemes"] span').textContent();
  console.log('Schemes text in KN:', kSchemes);

  console.log('--- 4. User selects Malayalam ---');
  await page.locator('.topbar-language-select').selectOption('ml');
  await page.waitForTimeout(1000);
  let mSchemes = await page.locator('a[href="/schemes"] span').textContent();
  console.log('Schemes text in ML:', mSchemes);

  console.log('--- 5. User selects Punjabi ---');
  await page.locator('.topbar-language-select').selectOption('pa');
  await page.waitForTimeout(1000);
  let pSchemes = await page.locator('a[href="/schemes"] span').textContent();
  console.log('Schemes text in PA:', pSchemes);

  console.log('--- 6. User selects Odia ---');
  await page.locator('.topbar-language-select').selectOption('or');
  await page.waitForTimeout(1000);
  let oSchemes = await page.locator('a[href="/schemes"] span').textContent();
  console.log('Schemes text in OR:', oSchemes);

  await browser.close();
})();

