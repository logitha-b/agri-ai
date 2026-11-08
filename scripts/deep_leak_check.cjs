const { chromium } = require('playwright');

const devanagariLetters = /[\u0904-\u0939\u0958-\u0961]/;
const langs = ['te', 'kn', 'ml', 'pa', 'or'];

const testRoutes = [
  '/',
  '/disease',
  '/loss',
  '/lac-culture',
  '/pearl-culture',
  '/cashflow',
  '/profile'
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const lang of langs) {
    const page = await browser.newPage();
    await page.addInitScript((l) => {
      localStorage.setItem('agri_platform_selected_language', l);
    }, lang);

    console.log(`\n================ Testing ${lang} ================`);
    for (const route of testRoutes) {
      await page.goto(`http://localhost:5174${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const leaks = await page.evaluate((regexStr) => {
        const reg = new RegExp(regexStr);
        const textNodes = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          const val = n.nodeValue.trim();
          if (n.parentElement && n.parentElement.tagName === 'OPTION' && val.includes('हिन्दी')) continue;
          if (n.parentElement && n.parentElement.classList && n.parentElement.classList.contains('notranslate')) continue;

          if (reg.test(val)) {
            textNodes.push({
              tag: n.parentElement ? n.parentElement.tagName : '',
              text: val
            });
          }
        }
        return textNodes;
      }, '[\u0904-\u0939\u0958-\u0961]');

      if (leaks.length > 0) {
        console.log(`[${lang.toUpperCase()}] route "${route}" had ${leaks.length} Hindi leaks:`);
        leaks.forEach(l => console.log(`   <${l.tag}> ${l.text.slice(0, 100)}`));
      }
    }

    // Also check opening the Ask Agri AI chat widget
    await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    const chatBtn = page.locator('button:has-text("Ask Agri AI"), button:has-text("అగ్రి"), button:has-text("ಅಗ್ರಿ"), button:has-text("അഗ്രി"), button:has-text("ਅਗਰੀ"), button:has-text("ଅଗ୍ରି"), button:has-text("अग्रि")').first();
    if (await chatBtn.count() > 0) {
      await chatBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
      const chatLeaks = await page.evaluate((regexStr) => {
        const reg = new RegExp(regexStr);
        const textNodes = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          const val = n.nodeValue.trim();
          if (n.parentElement && n.parentElement.tagName === 'OPTION' && val.includes('हिन्दी')) continue;
          if (reg.test(val)) {
            textNodes.push({ tag: n.parentElement?.tagName, text: val });
          }
        }
        return textNodes;
      }, '[\u0904-\u0939\u0958-\u0961]');
      if (chatLeaks.length > 0) {
        console.log(`[${lang.toUpperCase()}] Chatbot open had ${chatLeaks.length} Hindi leaks:`);
        chatLeaks.forEach(l => console.log(`   <${l.tag}> ${l.text.slice(0, 100)}`));
      }
    }

    await page.close();
  }

  await browser.close();
})();
