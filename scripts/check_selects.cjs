const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5174/recommendation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  const selects = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select')).map(s => ({
      className: s.className,
      value: s.value,
      options: Array.from(s.options).map(o => o.value)
    }));
  });
  console.log('Selects on page:', selects);

  await browser.close();
})();

