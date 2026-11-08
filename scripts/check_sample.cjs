const fs = require('fs');
const s = fs.readFileSync('src/data/sampleImages.js', 'utf8');
console.log('Includes SAMPLE_PADDY_PRODUCE_PATH:', s.includes('SAMPLE_PADDY_PRODUCE_PATH'));
console.log('Includes SAMPLE_PADDY_PRODUCE_B64:', s.includes('SAMPLE_PADDY_PRODUCE_B64'));
