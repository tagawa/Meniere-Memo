import assert from 'assert';

// Mock localStorage and crypto before importing store
const storage = {};
global.localStorage = {
  getItem:    k      => storage[k] ?? null,
  setItem:    (k, v) => { storage[k] = v; },
  removeItem: k      => { delete storage[k]; },
};
// crypto.randomUUID() is available natively in Node 19+
const { getEpisodes, addEpisode, updateEpisode, deleteEpisode, createEpisode }
  = await import('../js/store.js');

// getEpisodes — empty store
assert.deepStrictEqual(getEpisodes(), [], 'returns [] when nothing stored');
console.log('✓ getEpisodes returns [] when empty');

// createEpisode — default shape
const ep = createEpisode({ severity: 'moderate' });
assert.ok(ep.id,                              'has id');
assert.ok(ep.startTime,                       'has startTime');
assert.strictEqual(ep.severity,    'moderate', 'severity set from arg');
assert.strictEqual(ep.tinnitus,    null,        'tinnitus null by default');
assert.strictEqual(ep.earBlocked,  null,        'earBlocked null by default');
assert.strictEqual(ep.notes,       null,        'notes null by default');
console.log('✓ createEpisode has correct shape');

// addEpisode — stored and retrievable
addEpisode(ep);
assert.strictEqual(getEpisodes().length, 1,    'one episode after addEpisode');
assert.strictEqual(getEpisodes()[0].id, ep.id, 'correct episode stored');
console.log('✓ addEpisode stores episode');

// updateEpisode — modifies correct record, preserves others
const ep2 = createEpisode({ severity: 'mild' });
addEpisode(ep2);
const ok = updateEpisode(ep.id, { severity: 'severe', notes: 'updated' });
assert.strictEqual(ok, true, 'updateEpisode returns true on success');
const updated = getEpisodes().find(e => e.id === ep.id);
assert.strictEqual(updated.severity, 'severe',  'severity updated');
assert.strictEqual(updated.notes,    'updated',  'notes updated');
assert.strictEqual(getEpisodes().find(e => e.id === ep2.id).severity, 'mild',
  'other episode unchanged');
console.log('✓ updateEpisode modifies correct record');

// updateEpisode — returns false for missing id
assert.strictEqual(updateEpisode('no-such-id', {}), false, 'returns false for missing id');
console.log('✓ updateEpisode returns false for missing id');

// deleteEpisode — removes correct record
deleteEpisode(ep.id);
assert.strictEqual(getEpisodes().length, 1, 'one episode after delete');
assert.ok(!getEpisodes().find(e => e.id === ep.id), 'deleted episode gone');
console.log('✓ deleteEpisode removes correct record');

console.log('\nAll store tests passed.');
