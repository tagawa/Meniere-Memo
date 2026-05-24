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

// headache symptom keys
setLang('en');
assert.strictEqual(t('log.headache'),    'Headache', 'EN: log.headache');
assert.strictEqual(t('doctor.headache'), 'Headache', 'EN: doctor.headache');
setLang('ja');
assert.strictEqual(t('log.headache'),    '頭痛', 'JA: log.headache');
assert.strictEqual(t('doctor.headache'), '頭痛', 'JA: doctor.headache');
console.log('✓ log.headache / doctor.headache — EN and JA');

// common keys — episode count
setLang('en');
assert.strictEqual(t('common.episode'),  'episode',  'EN: common.episode');
assert.strictEqual(t('common.episodes'), 'episodes', 'EN: common.episodes');
setLang('ja');
assert.strictEqual(t('common.episode'),  '発作', 'JA: common.episode');
assert.strictEqual(t('common.episodes'), '発作', 'JA: common.episodes');
console.log('✓ common.episode / common.episodes — EN and JA');

// store write error key
setLang('en');
assert.ok(t('store.writeError').length > 0,  'EN: store.writeError is non-empty');
setLang('ja');
assert.ok(t('store.writeError').length > 0,  'JA: store.writeError is non-empty');
console.log('✓ store.writeError — EN and JA');

// pressure.today key
setLang('en');
assert.strictEqual(t('pressure.today'), 'Today', 'EN: pressure.today');
setLang('ja');
assert.strictEqual(t('pressure.today'), '今日',  'JA: pressure.today');
console.log('✓ pressure.today — EN and JA');

// home.seeAll key
setLang('en');
assert.strictEqual(t('home.seeAll'), 'See all episodes', 'EN: home.seeAll');
setLang('ja');
assert.strictEqual(t('home.seeAll'), 'すべてのエピソードを見る', 'JA: home.seeAll');
console.log('✓ home.seeAll — EN and JA');

setLang('en');
console.log('All i18n tests passed.');
