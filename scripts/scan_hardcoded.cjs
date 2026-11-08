const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.git') {
      scanDir(full);
    } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js'))) {
      if (f.name.includes('.test.') || f.name.includes('.spec.') || f.name.includes('.bak')) continue;
      const content = fs.readFileSync(full, 'utf8');
      const matches = [];
      const regex = /(?:title|description|eyebrow|subtitle)="([^"]{3,})"/g;
      let m;
      while ((m = regex.exec(content)) !== null) {
        if (!m[1].includes('{') && /[a-zA-Z]{3,}/.test(m[1])) {
          matches.push(m[1]);
        }
      }
      if (matches.length > 0) {
        console.log(`[FILE] ${path.relative(process.cwd(), full)}`);
        matches.forEach(str => console.log(`   - "${str}"`));
      }
    }
  }
}

scanDir(path.join(process.cwd(), 'src'));

