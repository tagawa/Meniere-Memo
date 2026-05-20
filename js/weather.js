// Fetches current air pressure (hPa) from wttr.in using IP-based geolocation.
// Returns a number on success, null on any failure (network, parse, offline).
export async function fetchAirPressure() {
  try {
    const res = await fetch('https://wttr.in/?format=j1');
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.current_condition?.[0]?.pressure;
    const val = Number(raw);
    return Number.isFinite(val) ? val : null;
  } catch {
    return null;
  }
}

let cachedPressure = null;

export function getCachedPressure() {
  return cachedPressure;
}

// Call once on app load. Populates cachedPressure for synchronous use in quickLog().
export async function initWeather() {
  cachedPressure = await fetchAirPressure();
}
