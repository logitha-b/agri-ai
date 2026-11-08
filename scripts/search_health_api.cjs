const fs = require('fs');

const content = fs.readFileSync('backend/health_api.py', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('language') && (line.includes('==') || line.includes('get(') || line.includes('="hi"') || line.includes("='hi'"))) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
