const i18n = require('../src/i18n/index.js').default;
const { translations } = require('../src/i18n/translations.js');

console.log('translations.te["schemes"]:', translations.te?.['schemes']);
console.log('translations.hi["schemes"]:', translations.hi?.['schemes']);

// What does i18n.getResource return?
console.log('i18n getResource te schemes:', i18n.getResource('te', 'translation', 'schemes'));
console.log('i18n getResource hi schemes:', i18n.getResource('hi', 'translation', 'schemes'));

