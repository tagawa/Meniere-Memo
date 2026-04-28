const KEY = 'meniere_episodes';

export function getEpisodes() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveAll(episodes) {
  localStorage.setItem(KEY, JSON.stringify(episodes));
}

export function addEpisode(episode) {
  const episodes = getEpisodes();
  episodes.push(episode);
  saveAll(episodes);
}

export function updateEpisode(id, updates) {
  const episodes = getEpisodes();
  const idx = episodes.findIndex(e => e.id === id);
  if (idx === -1) return false;
  episodes[idx] = { ...episodes[idx], ...updates };
  saveAll(episodes);
  return true;
}

export function deleteEpisode(id) {
  saveAll(getEpisodes().filter(e => e.id !== id));
}

export function createEpisode(fields = {}) {
  return {
    id:              crypto.randomUUID(),
    startTime:       new Date().toISOString(),
    endTime:         null,
    severity:        'mild',
    tinnitus:        null,
    earBlocked:      null,
    shoulderAche:    null,
    coldExtremities: null,
    bloodPressure:   null,
    pulse:           null,
    temperature:     null,
    airPressure:     null,
    notes:           null,
    ...fields,
  };
}
