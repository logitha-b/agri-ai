const fs = require('fs');
const content = fs.readFileSync('src/pages/VoiceAssistant.jsx', 'utf8');
content.split('\n').forEach((l, idx) => {
  if (l.includes("'hi'") || l.includes('"hi"') || l.includes('language ===')) {
    console.log((idx+1) + ': ' + l.trim());
  }
});
