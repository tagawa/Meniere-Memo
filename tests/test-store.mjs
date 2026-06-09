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
        generateUuid, setWriteErrorHandler, migrateEpisodes }
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

// --- schemaVersion ---

assert.strictEqual(createEpisode().schemaVersion, 2, 'createEpisode sets schemaVersion: 2');
console.log('✓ createEpisode sets schemaVersion: 2');

assert.strictEqual(createEpisode().humidity, null, 'createEpisode sets humidity: null');
console.log('✓ createEpisode sets humidity: null');

// Inject two unversioned episodes into storage for migration tests
global.localStorage.setItem('meniere_episodes', JSON.stringify([
  { id: 'migrate-a', startTime: '2026-01-01T00:00:00.000Z', severity: null },
  { id: 'migrate-b', startTime: '2026-01-02T00:00:00.000Z', severity: 'mild' },
]));

migrateEpisodes();
const afterMigrate = getEpisodes();
assert.ok(afterMigrate.every(ep => ep.schemaVersion === 2),
  'migrateEpisodes stamps all unversioned records with schemaVersion: 2');
assert.ok(afterMigrate.every(ep => ep.humidity === null),
  'migrateEpisodes adds humidity: null to unversioned records');
console.log('✓ migrateEpisodes stamps unversioned records and adds humidity');

// v1 → v2 migration: adds humidity field to schemaVersion 1 episodes
global.localStorage.setItem('meniere_episodes', JSON.stringify([
  { id: 'v1-a', schemaVersion: 1, startTime: '2026-01-01T00:00:00.000Z' },
  { id: 'v1-b', schemaVersion: 1, startTime: '2026-01-02T00:00:00.000Z', humidity: 72 },
]));
migrateEpisodes();
const afterV1Migration = getEpisodes();
assert.strictEqual(afterV1Migration[0].schemaVersion, 2, 'v1 episode migrated to schemaVersion 2');
assert.strictEqual(afterV1Migration[0].humidity, null, 'v1 episode gets humidity: null when absent');
assert.strictEqual(afterV1Migration[1].schemaVersion, 2, 'v1 episode with humidity migrated to schemaVersion 2');
assert.strictEqual(afterV1Migration[1].humidity, 72, 'v1 episode retains existing humidity value');
console.log('✓ migrateEpisodes migrates v1 episodes to v2, adding humidity if absent');

// Idempotency — calling twice on already-v2 records produces the same result
migrateEpisodes();
assert.deepStrictEqual(getEpisodes(), afterV1Migration, 'migrateEpisodes is idempotent on v2 records');
console.log('✓ migrateEpisodes is idempotent on v2 records');

// Mixed store — unversioned, v1 (no humidity), v1 (with humidity), and v2 all present together
global.localStorage.setItem('meniere_episodes', JSON.stringify([
  { id: 'mix-unversioned', startTime: '2026-01-01T00:00:00.000Z' },
  { id: 'mix-v1-no-hum',  schemaVersion: 1, startTime: '2026-01-02T00:00:00.000Z' },
  { id: 'mix-v1-hum',     schemaVersion: 1, startTime: '2026-01-03T00:00:00.000Z', humidity: 85 },
  { id: 'mix-v2',         schemaVersion: 2, startTime: '2026-01-04T00:00:00.000Z', humidity: null },
]));
migrateEpisodes();
const afterMixed = getEpisodes();
assert.strictEqual(afterMixed[0].schemaVersion, 2,    'mixed: unversioned migrated to v2');
assert.strictEqual(afterMixed[0].humidity,      null, 'mixed: unversioned gets humidity: null');
assert.strictEqual(afterMixed[1].schemaVersion, 2,    'mixed: v1 (no humidity) migrated to v2');
assert.strictEqual(afterMixed[1].humidity,      null, 'mixed: v1 without humidity gets humidity: null');
assert.strictEqual(afterMixed[2].schemaVersion, 2,    'mixed: v1 (with humidity) migrated to v2');
assert.strictEqual(afterMixed[2].humidity,      85,   'mixed: v1 with humidity retains its value');
assert.strictEqual(afterMixed[3].schemaVersion, 2,    'mixed: v2 episode left unchanged');
assert.strictEqual(afterMixed[3].humidity,      null, 'mixed: v2 episode humidity unchanged');
console.log('✓ migrateEpisodes handles mixed store (unversioned + v1 + v2) correctly');

// No-op when all records are already at v2
global.localStorage.setItem('meniere_episodes', JSON.stringify([
  { id: 'versioned', schemaVersion: 2, startTime: '2026-01-01T00:00:00.000Z', humidity: null },
]));
migrateEpisodes();
assert.strictEqual(getEpisodes()[0].schemaVersion, 2, 'no-op when all records at v2');
console.log('✓ migrateEpisodes is a no-op when all records already at v2');

// saveAll failure — error handler fires, storage left untouched
let migrationErrorFired = false;
setWriteErrorHandler(() => { migrationErrorFired = true; });
global.localStorage.setItem('meniere_episodes', JSON.stringify([
  { id: 'unversioned-for-fail', startTime: '2026-01-01T00:00:00.000Z' },
]));
const origSetItemForMigration = global.localStorage.setItem;
global.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
migrateEpisodes();
assert.strictEqual(migrationErrorFired, true, 'writeErrorHandler called on migration failure');
global.localStorage.setItem = origSetItemForMigration;
assert.strictEqual(getEpisodes()[0].schemaVersion, undefined,
  'storage left untouched after failed migration');
console.log('✓ migrateEpisodes calls writeErrorHandler and leaves storage untouched on failure');
setWriteErrorHandler(null);

console.log('\nAll store tests passed.');
