import assert from 'assert';

// Mock localStorage and crypto before importing store
const storage = {};
global.localStorage = {
  getItem:    k      => storage[k] ?? null,
  setItem:    (k, v) => { storage[k] = v; },
  removeItem: k      => { delete storage[k]; },
};
// crypto.randomUUID() is available natively in Node 19+
const { getEpisodes, addEpisode, updateEpisode, deleteEpisode, createEpisode, resolveEndTime,
        generateUuid, setWriteErrorHandler }
  = await import('../js/store.js');

// getEpisodes — empty store
assert.deepStrictEqual(getEpisodes(), [], 'returns [] when nothing stored');
console.log('✓ getEpisodes returns [] when empty');

// createEpisode — default shape
const epDefault = createEpisode();
assert.ok(epDefault.id,                           'has id');
assert.ok(epDefault.startTime,                    'has startTime');
assert.strictEqual(epDefault.severity,   null, 'severity null by default');
assert.strictEqual(epDefault.tinnitus,   null, 'tinnitus null by default');
assert.strictEqual(epDefault.headache,   null, 'headache null by default');
assert.strictEqual(epDefault.notes,      null, 'notes null by default');
console.log('✓ createEpisode defaults — severity, headache null by default');

const ep = createEpisode({ severity: 'moderate' });
assert.strictEqual(ep.severity, 'moderate', 'severity overridden by arg');
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

// calcEndTime — combines a start ISO string with an HH:MM end time string
const { calcEndTime } = await import('../js/store.js');

const startSameDay  = '2026-05-01T23:00:00.000Z'; // 23:00 UTC
const startMorning  = '2026-05-01T08:00:00.000Z'; // 08:00 UTC

// End time after start on the same day — no overnight adjustment
const endLater = calcEndTime(startMorning, '10:30');
assert.ok(endLater !== null, 'calcEndTime returns a value');
const endLaterDate = new Date(endLater);
assert.strictEqual(endLaterDate.getHours(), 10, 'same-day: hours correct');
assert.strictEqual(endLaterDate.getMinutes(), 30, 'same-day: minutes correct');
console.log('✓ calcEndTime — same-day end time');

// End time before start time — overnight: adds 24 hours
const endOvernight = calcEndTime(startSameDay, '01:30');
assert.ok(endOvernight !== null, 'calcEndTime overnight returns a value');
const endOvernightDate = new Date(endOvernight);
assert.ok(new Date(endOvernight) > new Date(startSameDay), 'overnight: end is after start');
assert.strictEqual(endOvernightDate.getHours(), 1, 'overnight: hours correct');
assert.strictEqual(endOvernightDate.getMinutes(), 30, 'overnight: minutes correct');
console.log('✓ calcEndTime — overnight end time auto-adjusted to next day');

// Empty end time string — returns null
assert.strictEqual(calcEndTime(startMorning, ''), null, 'empty end time returns null');
console.log('✓ calcEndTime — empty string returns null');

// resolveEndTime — endTime conflict resolution
const t1 = '2026-04-30T08:00:00.000Z';
const t2 = '2026-04-30T09:00:00.000Z';
const t3 = '2026-04-30T10:00:00.000Z';

assert.strictEqual(resolveEndTime(t3, t2), null,
  'clears endTime when newStart is after currentEnd');
console.log('✓ resolveEndTime clears endTime when start is after end');

assert.strictEqual(resolveEndTime(t1, t2), t2,
  'preserves endTime when newStart is before currentEnd');
console.log('✓ resolveEndTime preserves endTime when start is before end');

assert.strictEqual(resolveEndTime(t2, t2), t2,
  'preserves endTime when newStart equals currentEnd (equal is not a conflict)');
console.log('✓ resolveEndTime preserves endTime when start equals end');

assert.strictEqual(resolveEndTime(t3, null), null,
  'returns null when currentEndTime is null');
console.log('✓ resolveEndTime returns null when no endTime set');

// generateUuid — valid UUID v4 format
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
assert.match(generateUuid(), UUID_RE, 'generateUuid produces UUID v4 format');
console.log('✓ generateUuid produces UUID v4 format');

assert.ok(generateUuid() !== generateUuid(), 'generateUuid produces unique values');
console.log('✓ generateUuid produces unique values');

assert.match(createEpisode().id, UUID_RE, 'createEpisode id is UUID v4 format');
console.log('✓ createEpisode id is UUID v4 format');

// Write error handling — mock setItem to throw
let handlerCalled = false;
setWriteErrorHandler(() => { handlerCalled = true; });

const origSetItem = global.localStorage.setItem;
global.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };

handlerCalled = false;
assert.strictEqual(addEpisode(createEpisode()), false, 'addEpisode returns false on write failure');
assert.strictEqual(handlerCalled, true, 'error handler called on addEpisode failure');
console.log('✓ addEpisode returns false and calls error handler on write failure');

handlerCalled = false;
assert.strictEqual(updateEpisode(ep2.id, { severity: 'severe' }), false, 'updateEpisode returns false on write failure');
assert.strictEqual(handlerCalled, true, 'error handler called on updateEpisode failure');
console.log('✓ updateEpisode returns false and calls error handler on write failure');

handlerCalled = false;
assert.strictEqual(deleteEpisode(ep2.id), false, 'deleteEpisode returns false on write failure');
assert.strictEqual(handlerCalled, true, 'error handler called on deleteEpisode failure');
console.log('✓ deleteEpisode returns false and calls error handler on write failure');

global.localStorage.setItem = origSetItem;

console.log('\nAll store tests passed.');
