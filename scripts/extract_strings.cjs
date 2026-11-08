// scripts/extract_strings.cjs
const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('src/i18n/locales/en/translation.json', 'utf8'));

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('src');
const extracted = new Set();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');

  // Match t('key' or t("key"
  const tMatches = content.matchAll(/t\(\s*['"]([^'"]+)['"]/g);
  for (const m of tMatches) {
    const txt = m[1].trim();
    if (txt && !en[txt]) extracted.add(txt);
  }

  // Match JSX children >Text<
  const tagMatches = content.matchAll(/>\s*([A-Za-z][A-Za-z0-9 ,.?!':;()&/%-]{2,})\s*</g);
  for (const m of tagMatches) {
    const txt = m[1].trim();
    if (!txt.startsWith('{') && !txt.startsWith('/*') && !en[txt]) {
      extracted.add(txt);
    }
  }

  // Match placeholder="..." and title="..." and aria-label="..."
  const attrMatches = content.matchAll(/(?:placeholder|title|aria-label)=['"]([A-Za-z][A-Za-z0-9 ,.?!':;()&/%-]{3,})['"]/g);
  for (const m of attrMatches) {
    const txt = m[1].trim();
    if (!en[txt]) {
      extracted.add(txt);
    }
  }
});

console.log('Total new unique strings to translate:', extracted.size);
fs.writeFileSync('scripts/new_strings.json', JSON.stringify(Array.from(extracted).sort(), null, 2));
console.log('Saved to scripts/new_strings.json');

