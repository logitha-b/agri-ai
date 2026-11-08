// scripts/audit-production-strings.js
const fs = require('fs');

function extractTCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /t\(\s*['"]([^'"]+)['"]/g;
  let match;
  const list = [];
  while ((match = regex.exec(content)) !== null) {
    list.push(match[1]);
  }
  return list;
}

const prodList = [
  ...extractTCalls('src/pages/CropProduction.jsx'),
  ...extractTCalls('src/components/production/ProductionPanels.jsx')
];

const unique = [...new Set(prodList)];
console.log('Unique strings:', unique.length);

const en = JSON.parse(fs.readFileSync('src/i18n/locales/en/translation.json', 'utf8'));
const hi = JSON.parse(fs.readFileSync('src/i18n/locales/hi/translation.json', 'utf8'));
const ta = JSON.parse(fs.readFileSync('src/i18n/locales/ta/translation.json', 'utf8'));

const missing = [];
for (const s of unique) {
  if (!en[s] || !hi[s] || !ta[s]) {
    missing.push({
      str: s,
      hasEn: !!en[s],
      hasHi: !!hi[s],
      hasTa: !!ta[s]
    });
  }
}

console.log('Missing in any dictionary:', missing.length);
missing.forEach(m => console.log('  MISSING:', JSON.stringify(m.str), m));
