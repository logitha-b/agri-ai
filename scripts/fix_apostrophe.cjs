// scripts/fix_apostrophe.cjs
const fs = require('fs');
const langs = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'pa', 'or'];
const targetKey = "All transactions, budgets, loans, and savings goals are stored in your browser's localStorage. Clearing browser data will erase all records. Export a report before clearing.";

langs.forEach(l => {
  const p = `src/i18n/locales/${l}/translation.json`;
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));

  // Find any existing variation
  let foundVal = '';
  for (const [k, v] of Object.entries(d)) {
    if (k.includes('stored in your browser') && v) {
      foundVal = v;
      break;
    }
  }

  if (foundVal) {
    d[targetKey] = foundVal;
  }

  // Also fix any empty values
  for (const [k, v] of Object.entries(d)) {
    if (!v || v.trim() === '') {
      console.log(`Fixing empty value in ${l} for key: ${k}`);
      d[k] = k;
    }
  }

  fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');
});

console.log('Fixed apostrophe keys and empty values.');

