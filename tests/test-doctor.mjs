import assert from 'assert';

// Mock localStorage before any imports that touch it
const store = {};
global.localStorage = {
  getItem:    k      => store[k] ?? null,
  setItem:    (k, v) => { store[k] = v; },
  removeItem: k      => { delete store[k]; },
};

const { setLang } = await import('../js/i18n.js');
const { formatEpisodeNotes } = await import('../js/doctor.js');

// --- English ---
setLang('en');

const ep = {
  tinnitus: 'mild', earBlocked: null, headache: 'moderate', shoulderAche: 'severe', coldExtremities: null,
  bloodPressure: '120/80', pulse: 72, temperature: 36.5, airPressure: null,
  notes: 'Felt tired',
};
const noteStr = formatEpisodeNotes(ep);
assert.ok(noteStr.includes('Tinnitus'),       'EN: includes tinnitus label');
assert.ok(noteStr.includes('Mild'),           'EN: includes tinnitus severity (Mild)');
assert.ok(!noteStr.includes('Ear blocked'),   'EN: omits null earBlocked');
assert.ok(noteStr.includes('Headache'),       'EN: includes headache label');
assert.ok(noteStr.includes('Moderate'),       'EN: includes headache severity (Moderate)');
assert.ok(noteStr.includes('Shoulder ache'),  'EN: includes shoulderAche label');
assert.ok(noteStr.includes('Severe'),         'EN: includes shoulderAche severity (Severe)');
assert.ok(noteStr.includes('120/80'),         'EN: includes blood pressure value');
assert.ok(noteStr.includes('Felt tired'),     'EN: includes free-text notes');
assert.ok(!noteStr.includes('Air pressure'),  'EN: omits null airPressure');
console.log('✓ formatEpisodeNotes — English labels and values');

// cold extremities included when set
const epCold = { ...ep, coldExtremities: 'moderate' };
assert.ok(formatEpisodeNotes(epCold).includes('Fingers'),  'EN: includes coldExtremities label');
assert.ok(formatEpisodeNotes(epCold).includes('Moderate'), 'EN: includes coldExtremities severity');
console.log('✓ formatEpisodeNotes — cold extremities included when set');

// all null → em dash
assert.strictEqual(formatEpisodeNotes({
  tinnitus: null, earBlocked: null, headache: null, shoulderAche: null, coldExtremities: null,
  bloodPressure: null, pulse: null, temperature: null, airPressure: null, notes: null,
}), '—', 'all null → em dash');
console.log('✓ formatEpisodeNotes — all null → em dash');

// XSS escaping on free-text fields
const epXss = { ...ep, bloodPressure: '<script>alert(1)</script>', notes: '<b>bold</b>',
                tinnitus: null, headache: null, shoulderAche: null };
const xssStr = formatEpisodeNotes(epXss);
assert.ok(!xssStr.includes('<script>'), 'bloodPressure: < and > escaped');
assert.ok(!xssStr.includes('<b>'),      'notes: < and > escaped');
console.log('✓ formatEpisodeNotes — XSS escaping');

// --- Japanese ---
setLang('ja');

const jaStr = formatEpisodeNotes({
  tinnitus: 'mild', earBlocked: null, headache: 'severe', shoulderAche: null, coldExtremities: null,
  bloodPressure: null, pulse: null, temperature: null, airPressure: null, notes: null,
});
assert.ok(jaStr.includes('耳鳴り'), 'JA: tinnitus label in Japanese');
assert.ok(jaStr.includes('軽度'),   'JA: mild severity in Japanese');
assert.ok(jaStr.includes('頭痛'),   'JA: headache label in Japanese');
assert.ok(jaStr.includes('重度'),   'JA: severe severity in Japanese');
console.log('✓ formatEpisodeNotes — Japanese labels and values');

console.log('\nAll doctor tests passed.');
