const fs = require('fs');
const lines = fs.readFileSync('src/pages.jsx', 'utf8').split('\n');
console.log('Line 1332 to 1375:');
console.log(lines.slice(1331, 1375).join('\n'));
