const fs = require('fs');
const path = require('path');

function searchBackend(dir, matches = []) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (f === '.venv' || f === '__pycache__' || f === '.git') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchBackend(full, matches);
    } else if (f.endsWith('.py')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes("'ta'") || line.includes('"ta"') || line.includes("'hi'") || line.includes('"hi"')) {
          matches.push({ file: full, line: idx + 1, text: line.trim() });
        }
      });
    }
  }
  return matches;
}

const bMatches = searchBackend('backend');
console.log('Backend lines with ta/hi:', bMatches.length);
bMatches.forEach(b => console.log(`${b.file}:${b.line} -> ${b.text}`));
