import assert from 'assert';

const {
  calcAverageSeverity,
  calcAverageDuration,
  formatDuration,
  calcSymptomFrequency,
  filterByPeriod,
  formatEpisodeNotes,
} = await import('../js/stats.js');

// calcAverageSeverity
assert.strictEqual(calcAverageSeverity([]), null, 'empty → null');
assert.strictEqual(
  calcAverageSeverity([{ severity: null }, { severity: null }]),
  null, 'all null severity → null'
);
assert.strictEqual(
  calcAverageSeverity([{ severity: 'mild' }, { severity: 'mild' }]),
  'mild', 'two mild → mild'
);
assert.strictEqual(
  calcAverageSeverity([{ severity: 'mild' }, { severity: 'severe' }]),
  'moderate', 'mild + severe → moderate'
);
assert.strictEqual(
  calcAverageSeverity([{ severity: 'severe' }, { severity: 'severe' }]),
  'severe', 'two severe → severe'
);
assert.strictEqual(
  calcAverageSeverity([{ severity: null }, { severity: 'severe' }, { severity: 'severe' }]),
  'severe', 'null severity episodes skipped in average'
);
console.log('✓ calcAverageSeverity');

// calcAverageDuration
const ep1     = { startTime: '2026-04-29T10:00:00Z', endTime: '2026-04-29T10:30:00Z' }; // 30m
const ep2     = { startTime: '2026-04-29T11:00:00Z', endTime: '2026-04-29T12:30:00Z' }; // 90m
const epNoEnd = { startTime: '2026-04-29T10:00:00Z', endTime: null };
assert.strictEqual(calcAverageDuration([]), null, 'empty → null');
assert.strictEqual(calcAverageDuration([epNoEnd]), null, 'no end times → null');
assert.strictEqual(calcAverageDuration([ep1, ep2]), 60, 'avg of 30m and 90m = 60m');
assert.strictEqual(calcAverageDuration([ep1, epNoEnd]), 30, 'ignores episodes without endTime');
console.log('✓ calcAverageDuration');

// formatDuration
assert.strictEqual(formatDuration(null), '—',      'null → em dash');
assert.strictEqual(formatDuration(0),    '0m',     '0 → 0m');
assert.strictEqual(formatDuration(45),   '45m',    '45 → 45m');
assert.strictEqual(formatDuration(60),   '1h',     '60 → 1h');
assert.strictEqual(formatDuration(90),   '1h 30m', '90 → 1h 30m');
console.log('✓ formatDuration');

// calcSymptomFrequency
const episodes = [
  { tinnitus: 'mild',   earBlocked: null,       shoulderAche: 'severe', coldExtremities: null },
  { tinnitus: null,     earBlocked: 'moderate', shoulderAche: 'mild',   coldExtremities: null },
  { tinnitus: 'severe', earBlocked: null,       shoulderAche: null,     coldExtremities: 'mild' },
];
const freq = calcSymptomFrequency(episodes);
assert.strictEqual(freq.find(f => f.key === 'tinnitus').recorded,        2, 'tinnitus 2/3');
assert.strictEqual(freq.find(f => f.key === 'earBlocked').recorded,      1, 'earBlocked 1/3');
assert.strictEqual(freq.find(f => f.key === 'shoulderAche').recorded,    2, 'shoulderAche 2/3');
assert.strictEqual(freq.find(f => f.key === 'coldExtremities').recorded, 1, 'coldExtremities 1/3');
assert.strictEqual(freq[0].total, 3, 'total = 3');
console.log('✓ calcSymptomFrequency');

// filterByPeriod
const old    = { startTime: new Date(Date.now() - 100 * 86400000).toISOString() };
const mid    = { startTime: new Date(Date.now() -  60 * 86400000).toISOString() };
const recent = { startTime: new Date(Date.now() -  10 * 86400000).toISOString() };
assert.strictEqual(filterByPeriod([old, mid, recent], 'all').length, 3, 'all → 3');
assert.strictEqual(filterByPeriod([old, mid, recent], '30').length,  1, '30d → 1');
assert.strictEqual(filterByPeriod([old, mid, recent], '90').length,  2, '90d → 2');
console.log('✓ filterByPeriod');

// formatEpisodeNotes
const ep = {
  tinnitus: 'mild', earBlocked: null, shoulderAche: 'severe', coldExtremities: null,
  bloodPressure: '120/80', pulse: 72, temperature: 36.5, airPressure: null,
  notes: 'Felt tired',
};
const noteStr = formatEpisodeNotes(ep);
assert.ok(noteStr.includes('Tinnitus: mild'),        'includes tinnitus');
assert.ok(!noteStr.includes('earBlocked'),            'omits null earBlocked');
assert.ok(noteStr.includes('Shoulder ache: severe'), 'includes shoulderAche');
assert.ok(noteStr.includes('BP: 120/80'),            'includes bloodPressure');
assert.ok(noteStr.includes('Felt tired'),            'includes free-text notes');
console.log('✓ formatEpisodeNotes');

assert.strictEqual(formatEpisodeNotes({
  tinnitus: null, earBlocked: null, shoulderAche: null, coldExtremities: null,
  bloodPressure: null, pulse: null, temperature: null, airPressure: null, notes: null,
}), '—', 'all null → em dash');
console.log('✓ formatEpisodeNotes all null');

console.log('\nAll stats tests passed.');
