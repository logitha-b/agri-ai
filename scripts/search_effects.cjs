const fs = require('fs');
const path = require('path');

function searchEffects(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (f === 'node_modules' || f === 'dist' || f === '.git' || f === 'locales') continue;
    if (fs.statSync(full).isDirectory()) searchEffects(full);
    else if (f.endsWith('.jsx')) {
      const c = fs.readFileSync(full, 'utf8');
      const lines = c.split('\n');
      lines.forEach((l, idx) => {
        if (l.includes('useEffect(') || l.includes('useCallback(')) {
          // Check next 20 lines for language or fetch
          const snippet = lines.slice(idx, idx + 25).join('\n');
          if (snippet.includes('fetch(') || snippet.includes('apiFetch') || snippet.includes('apiGet')) {
            console.log(`[${full}:${idx+1}] has fetch in effect/callback. Depends on language? ${snippet.includes('language')}`);
          }
        }
      });
    }
  }
}
searchEffects('src');
