const fs = require('fs');
const paddyBuf = fs.readFileSync('public/sample_images/paddy_produce_sample.jpg');
const paddyB64 = 'data:image/jpeg;base64,' + paddyBuf.toString('base64');
let current = fs.readFileSync('src/data/sampleImages.js', 'utf8');
if (!current.includes('SAMPLE_PADDY_PRODUCE_PATH')) {
  current += '\nexport const SAMPLE_PADDY_PRODUCE_PATH = "/sample_images/paddy_produce_sample.jpg";\nexport const SAMPLE_PADDY_PRODUCE_B64 = "' + paddyB64 + '";\n';
  fs.writeFileSync('src/data/sampleImages.js', current);
  console.log('Appended SAMPLE_PADDY_PRODUCE_PATH and B64 successfully');
} else {
  console.log('Already present in sampleImages.js');
}
