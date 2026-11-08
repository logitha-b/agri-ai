const fs = require('fs');

const tomatoBuf = fs.readFileSync('public/sample_images/tomato_rot_sample.jpg');
const tomatoB64 = 'data:image/jpeg;base64,' + tomatoBuf.toString('base64');

const paddyBuf = fs.readFileSync('public/sample_images/paddy_produce_sample.jpg');
const paddyB64 = 'data:image/jpeg;base64,' + paddyBuf.toString('base64');

const content = `export const SAMPLE_TOMATO_IMAGE_PATH = "/sample_images/tomato_rot_sample.jpg";
export const SAMPLE_TOMATO_IMAGE_B64 = ${JSON.stringify(tomatoB64)};

export const SAMPLE_PADDY_PRODUCE_PATH = "/sample_images/paddy_produce_sample.jpg";
export const SAMPLE_PADDY_PRODUCE_B64 = ${JSON.stringify(paddyB64)};
`;

fs.writeFileSync('src/data/sampleImages.js', content, 'utf8');
console.log('sampleImages.js updated with both tomato and paddy sample images!');
