const KEY = 'meniere_episodes';

// UUID v4 using Math.random() — no crypto.randomUUID needed, IDs are local-only
export function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

let writeErrorHandler = null;
export function setWriteErrorHandler(fn) { writeErrorHandler = fn; }

export function getEpisodes() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

// Returns true on success, false on write failure (quota exceeded, storage disabled, etc.)
function saveAll(episodes) {
  try {
    localStorage.setItem(KEY, JSON.stringify(episodes));
    return true;
  } catch {
    writeErrorHandler?.();
    return false;
  }
}

export function addEpisode(episode) {
  const episodes = getEpisodes();
  episodes.push(episode);
  return saveAll(episodes);
}

export function updateEpisode(id, updates) {
  const episodes = getEpisodes();
  const idx = episodes.findIndex(e => e.id === id);
  if (idx === -1) return false;
  episodes[idx] = { ...episodes[idx], ...updates };
  return saveAll(episodes);
}

export function deleteEpisode(id) {
  return saveAll(getEpisodes().filter(e => e.id !== id));
}

// Combines a start ISO string with an HH:MM end time string.
// If the resulting end time is before or equal to start, adds 24h (overnight episode).
// Returns an ISO string, or null if timeStr is empty.
export function calcEndTime(startIso, timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const end = new Date(startIso);
  end.setHours(h, m, 0, 0);
  if (end <= new Date(startIso)) end.setDate(end.getDate() + 1);
  return end.toISOString();
}

// Returns null if newStart is strictly after currentEnd (conflict); otherwise currentEnd unchanged.
export function resolveEndTime(newStartTime, currentEndTime) {
  if (!currentEndTime) return null;
  return new Date(newStartTime) > new Date(currentEndTime) ? null : currentEndTime;
}

export function createEpisode(fields = {}) {
  return {
    id:              generateUuid(),
    schemaVersion:   2,
    startTime:       new Date().toISOString(),
    endTime:         null,
    severity:        null,
    tinnitus:        null,
    earBlocked:      null,
    headache:        null,
    shoulderAche:    null,
    coldExtremities: null,
    bloodPressure:   null,
    pulse:           null,
    temperature:     null,
    airPressure:     null,
    humidity:        null,
    notes:           null,
    ...fields,
  };
}

export function migrateEpisodes() {
  const episodes = getEpisodes();
  if (episodes.every(ep => ep.schemaVersion === 2)) return;
  saveAll(episodes.map(ep => {
    if (ep.schemaVersion === 2) return ep;
    return { ...ep, schemaVersion: 2, humidity: ep.humidity ?? null };
  }));
}
