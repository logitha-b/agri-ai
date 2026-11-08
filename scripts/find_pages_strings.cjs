const fs = require('fs');
const content = fs.readFileSync('src/pages.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('<Card title="') || line.includes('<PageHeader title="') || line.includes('eyebrow="')) {
    console.log(i + 1, line.trim());
  }
});

