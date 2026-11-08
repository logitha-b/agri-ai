const { chromium } = require('playwright');

const devRegex = /[\u0904-\u0939\u0958-\u0961]/;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Loading site with Hindi...');
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Switch to Hindi via UI dropdown
  const langSelect = page.locator('header select, .topbar select, select[aria-label*="language" i]').first();
  if (await langSelect.count() > 0) {
    await langSelect.selectOption('hi');
    await page.waitForTimeout(1000);
  }

  console.log('2. Switching to Tamil via UI dropdown...');
  if (await langSelect.count() > 0) {
    await langSelect.selectOption('ta');
    await page.waitForTimeout(1000);
  }

  console.log('3. Switching to Telugu via UI dropdown...');
  if (await langSelect.count() > 0) {
    await langSelect.selectOption('te');
    await page.waitForTimeout(1500);
  }

  // Now scan entire page for Hindi text
  const checkPageForHindi = async (pageName) => {
    return await page.evaluate(({ pName, regexStr }) => {
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
            page: pName,
            tag: n.parentElement ? n.parentElement.tagName : '',
            class: n.parentElement ? n.parentElement.className : '',
            text: val
          });
        }
      }
      return textNodes;
    }, { pName: pageName, regexStr: '[\u0904-\u0939\u0958-\u0961]' });
  };

  const leaks = [];
  leaks.push(...await checkPageForHindi('Home'));

  // Navigate to internal pages
  const routes = ['/schemes', '/production', '/crop-health', '/disease', '/water-risk', '/crop-recommendation', '/market', '/loss', '/profile'];
  for (const r of routes) {
    await page.goto(`http://localhost:5174${r}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    leaks.push(...await checkPageForHindi(r));
  }

  console.log('\n================ FOUND HINDI AFTER SWITCHING TO TELUGU ================');
  console.log('Total leaks:', leaks.length);
  leaks.forEach((l, idx) => {
    console.log(`[${l.page}] <${l.tag} class="${l.class}"> "${l.text}"`);
  });

  await browser.close();
})();
