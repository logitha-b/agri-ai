const fs = require('fs');
const te = JSON.parse(fs.readFileSync('src/i18n/locales/te/translation.json', 'utf8'));
const hi = JSON.parse(fs.readFileSync('src/i18n/locales/hi/translation.json', 'utf8'));
console.log('te core:', te['core']);
console.log('hi core:', hi['core']);
console.log('te schemes:', te['schemes']);
console.log('hi schemes:', hi['schemes']);

