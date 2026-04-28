import assert from 'assert';

// Mock localStorage before importing the module
const store = {};
global.localStorage = {
  getItem: k => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
};

const { t, setLang, getLang } = await import('../js/i18n.js');

assert.strictEqual(getLang(), 'en',       'default lang is en');
assert.strictEqual(t('log.mild'), 'Mild',  'returns EN string');
assert.strictEqual(t('nav.home'), 'Home',  'returns nav.home EN');

setLang('ja');
assert.strictEqual(getLang(), 'ja',        'getLang() returns ja after setLang');
assert.strictEqual(t('log.mild'), '軽度',   'returns JA string after setLang');

setLang('en');
assert.strictEqual(t('unknown.key'), 'unknown.key', 'missing key returns key itself');

console.log('All i18n tests passed.');
