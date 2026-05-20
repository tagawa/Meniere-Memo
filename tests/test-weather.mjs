import assert from 'assert';

// Mock fetch before importing the module under test
function makeFetch(ok, body) {
  return async () => ({ ok, json: async () => body });
}

global.fetch = makeFetch(true, { current_condition: [{ pressure: '1013' }] });

const { fetchAirPressure } = await import('../js/weather.js');

// Happy path — pressure returned as a number
global.fetch = makeFetch(true, { current_condition: [{ pressure: '1013' }] });
assert.strictEqual(await fetchAirPressure(), 1013, 'returns pressure as number');
console.log('✓ returns pressure as number on success');

// Decimal pressure value
global.fetch = makeFetch(true, { current_condition: [{ pressure: '1013.5' }] });
assert.strictEqual(await fetchAirPressure(), 1013.5, 'handles decimal pressure');
console.log('✓ handles decimal pressure value');

// Non-ok HTTP response
global.fetch = makeFetch(false, {});
assert.strictEqual(await fetchAirPressure(), null, 'returns null on non-ok response');
console.log('✓ returns null on non-ok HTTP response');

// Network error (fetch throws)
global.fetch = async () => { throw new Error('network'); };
assert.strictEqual(await fetchAirPressure(), null, 'returns null on network error');
console.log('✓ returns null on network error');

// Missing current_condition in response
global.fetch = makeFetch(true, {});
assert.strictEqual(await fetchAirPressure(), null, 'returns null when structure missing');
console.log('✓ returns null when response structure is missing');

// Non-numeric pressure string
global.fetch = makeFetch(true, { current_condition: [{ pressure: 'N/A' }] });
assert.strictEqual(await fetchAirPressure(), null, 'returns null for non-numeric pressure');
console.log('✓ returns null for non-numeric pressure string');

// Empty current_condition array
global.fetch = makeFetch(true, { current_condition: [] });
assert.strictEqual(await fetchAirPressure(), null, 'returns null for empty current_condition');
console.log('✓ returns null for empty current_condition array');

// --- initWeather / getCachedPressure ---
const { getCachedPressure, initWeather } = await import('../js/weather.js');

// getCachedPressure returns null before initWeather is called
assert.strictEqual(getCachedPressure(), null, 'getCachedPressure returns null before initWeather');
console.log('✓ getCachedPressure returns null before initWeather is called');

// initWeather sets cachedPressure on success
global.fetch = makeFetch(true, { current_condition: [{ pressure: '1015' }] });
await initWeather();
assert.strictEqual(getCachedPressure(), 1015, 'initWeather sets cachedPressure on success');
console.log('✓ initWeather sets cachedPressure to fetched value on success');

// initWeather retains cachedPressure on failure (does not wipe last known value)
global.fetch = async () => { throw new Error('network'); };
await initWeather();
assert.strictEqual(getCachedPressure(), 1015, 'initWeather retains cachedPressure on fetch failure');
console.log('✓ initWeather retains cachedPressure on fetch failure');

console.log('\nAll weather tests passed.');
