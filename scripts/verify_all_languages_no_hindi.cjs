const { chromium } = require('playwright');

const indicLangs = ['te', 'kn', 'ml', 'pa', 'or'];
const devanagariRegex = /[\u0904-\u0939\u0958-\u0961]/;

const routesToTest = [
  '/',
  '/crop-health',
  '/water-risk',
  '/recommendation',
  '/market',
  '/disease',
  '/schemes',
  '/production',
  '/loss',
  '/lac-culture',
  '/pearl-culture',
  '/cashflow',
  '/profile'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  let totalLeaks = 0;

  for (const lang of indicLangs) {
    console.log(`\n================ Testing Language: ${lang.toUpperCase()} ================`);
    const page = await browser.newPage();
    await page.addInitScript((l) => {
      localStorage.setItem('agri_platform_selected_language', l);
    }, lang);

    for (const route of routesToTest) {
      await page.goto(`http://localhost:5174${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const leaks = await page.evaluate(() => {
        const reg = /[\u0904-\u0939\u0958-\u0961]/;
        const textNodes = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
          const val = n.nodeValue.trim();
          // Exclude language picker options showing 'हिन्दी' as their own label
          if (n.parentElement && (n.parentElement.tagName === 'OPTION' || n.parentElement.classList.contains('ai-lang-pill')) && (val.includes('हिन्दी') || val.includes('हिंदी'))) {
            continue;
          }
          if (n.parentElement && n.parentElement.classList && n.parentElement.classList.contains('notranslate') && (val.includes('हिन्दी') || val.includes('हिंदी'))) {
            continue;
          }
          if (reg.test(val)) {
            textNodes.push({ tag: n.parentElement?.tagName, text: val });
          }
        }
        return textNodes;
      });

      if (leaks.length > 0) {
        console.log(`[FAIL] [${lang.toUpperCase()}] route "${route}" had ${leaks.length} Hindi leaks:`);
        leaks.forEach(l => console.log(`   <${l.tag}> ${l.text.slice(0, 100)}`));
        totalLeaks += leaks.length;
      } else {
        console.log(`[PASS] [${lang.toUpperCase()}] route "${route}" -> 0 Hindi leaks`);
      }
    }

    // Now test dynamic language switch: start on /recommendation in Hindi, then switch to targetLang via topbar select
    await page.goto('http://localhost:5174/recommendation', { waitUntil: 'domcontentloaded' });
    await page.selectOption('.topbar-language-select', 'hi');
    await page.waitForTimeout(600);
    // Switch to targetLang
    await page.selectOption('.topbar-language-select', lang);
    await page.waitForTimeout(800);

    const switchLeaks = await page.evaluate(() => {
      const reg = /[\u0904-\u0939\u0958-\u0961]/;
      const textNodes = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const val = n.nodeValue.trim();
        if (n.parentElement && (n.parentElement.tagName === 'OPTION' || n.parentElement.classList.contains('ai-lang-pill')) && (val.includes('हिन्दी') || val.includes('हिंदी'))) continue;
        if (n.parentElement && n.parentElement.classList && n.parentElement.classList.contains('notranslate') && (val.includes('हिन्दी') || val.includes('हिंदी'))) continue;
        if (reg.test(val)) {
          textNodes.push({ tag: n.parentElement?.tagName, text: val });
        }
      }
      return textNodes;
    });

    if (switchLeaks.length > 0) {
      console.log(`[FAIL] [${lang.toUpperCase()}] switch from hi on /recommendation had ${switchLeaks.length} Hindi leaks:`);
      switchLeaks.forEach(l => console.log(`   <${l.tag}> ${l.text.slice(0, 100)}`));
      totalLeaks += switchLeaks.length;
    } else {
      console.log(`[PASS] [${lang.toUpperCase()}] switch from hi on /recommendation -> 0 Hindi leaks`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\n======================================================`);
  console.log(`TOTAL LEAKS DETECTED ACROSS ALL LANGUAGES: ${totalLeaks}`);
  console.log(`======================================================`);
  process.exit(totalLeaks > 0 ? 1 : 0);
})();

