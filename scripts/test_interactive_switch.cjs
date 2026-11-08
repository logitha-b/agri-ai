const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // ── 1. Recommendation Page ──
  console.log('\n--- Testing /recommendation ---');
  await page.addInitScript(() => {
    localStorage.setItem('agri_platform_selected_language', 'hi');
  });
  await page.goto('http://localhost:5174/recommendation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  // Click load sample button
  const loadBtnRec = page.locator('button:has-text("नमूना"), button:has-text("तुलना")').first();
  if (await loadBtnRec.count() > 0) {
    console.log('Clicking sample/compare button on /recommendation...');
    await loadBtnRec.click();
    await page.waitForTimeout(2500);
  }
  
  for (const targetLang of ['te', 'kn', 'ml', 'pa', 'or']) {
    console.log(`Switching /recommendation to ${targetLang}...`);
    await page.evaluate((tl) => {
      const selects = document.querySelectorAll('select');
      for (const s of selects) {
        for (const o of s.options) {
          if (o.value === tl) {
            s.value = tl;
            s.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
      }
    }, targetLang);
    await page.waitForTimeout(1500);
    
    const leaks = await page.evaluate(() => {
      const reg = /[\u0904-\u0939\u0958-\u0961]/;
      const textNodes = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const val = n.nodeValue.trim();
        if (n.parentElement && n.parentElement.tagName === 'OPTION' && (val.includes('हिन्दी') || val.includes('हिंदी'))) continue;
        if (n.parentElement && n.parentElement.classList && n.parentElement.classList.contains('notranslate')) continue;
        if (reg.test(val)) {
          textNodes.push({ tag: n.parentElement?.tagName, text: val });
        }
      }
      return textNodes;
    });
    console.log(`[${targetLang.toUpperCase()}] /recommendation Hindi leaks: ${leaks.length}`);
    leaks.forEach(l => console.log('   <' + l.tag + '> ' + l.text.slice(0, 120)));
  }

  // ── 2. Market Page ──
  console.log('\n--- Testing /market ---');
  await page.evaluate(() => {
    // switch back to hi first
    const selects = document.querySelectorAll('select');
    for (const s of selects) {
      for (const o of s.options) {
        if (o.value === 'hi') {
          s.value = 'hi';
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }
  });
  await page.goto('http://localhost:5174/market', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const loadBtnMkt = page.locator('button:has-text("नमूना")').first();
  if (await loadBtnMkt.count() > 0) {
    console.log('Clicking sample button on /market...');
    await loadBtnMkt.click();
    await page.waitForTimeout(2000);
  }

  for (const targetLang of ['te', 'kn', 'ml', 'pa', 'or']) {
    console.log(`Switching /market to ${targetLang}...`);
    await page.evaluate((tl) => {
      const selects = document.querySelectorAll('select');
      for (const s of selects) {
        for (const o of s.options) {
          if (o.value === tl) {
            s.value = tl;
            s.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
      }
    }, targetLang);
    await page.waitForTimeout(1500);

    const leaks = await page.evaluate(() => {
      const reg = /[\u0904-\u0939\u0958-\u0961]/;
      const textNodes = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const val = n.nodeValue.trim();
        if (n.parentElement && n.parentElement.tagName === 'OPTION' && (val.includes('हिन्दी') || val.includes('हिंदी'))) continue;
        if (n.parentElement && n.parentElement.classList && n.parentElement.classList.contains('notranslate')) continue;
        if (reg.test(val)) {
          textNodes.push({ tag: n.parentElement?.tagName, text: val });
        }
      }
      return textNodes;
    });
    console.log(`[${targetLang.toUpperCase()}] /market Hindi leaks: ${leaks.length}`);
    leaks.forEach(l => console.log('   <' + l.tag + '> ' + l.text.slice(0, 120)));
  }

  await browser.close();
})();
