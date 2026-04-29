const SEVERITY_SCORE = { mild: 1, moderate: 2, severe: 3 };
// Index 0 unused; round(1)=mild, round(2)=moderate, round(3)=severe
const SCORE_SEVERITY = ['mild', 'mild', 'moderate', 'severe'];

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function calcAverageSeverity(episodes) {
  // 'none' and null are excluded — only scored severities count
  const withSeverity = episodes.filter(e => e.severity && e.severity !== 'none');
  if (!withSeverity.length) return null;
  const sum = withSeverity.reduce((acc, e) => acc + SEVERITY_SCORE[e.severity], 0);
  return SCORE_SEVERITY[Math.round(sum / withSeverity.length)];
}

export function calcAverageDuration(episodes) {
  const withDuration = episodes.filter(e => e.endTime);
  if (!withDuration.length) return null;
  const totalMs = withDuration.reduce(
    (acc, e) => acc + (new Date(e.endTime) - new Date(e.startTime)), 0
  );
  return Math.round(totalMs / withDuration.length / 60000);
}

// Returns duration in minutes for a single episode, or null if no endTime
export function calcEpisodeDuration(episode) {
  if (!episode.endTime) return null;
  return Math.round((new Date(episode.endTime) - new Date(episode.startTime)) / 60000);
}

export function formatDuration(minutes) {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function calcSymptomFrequency(episodes) {
  const keys = ['tinnitus', 'earBlocked', 'shoulderAche', 'coldExtremities'];
  return keys.map(key => ({
    key,
    // Count only episodes where the symptom was present (mild/moderate/severe), not 'none' or null
    recorded: episodes.filter(e => e[key] && e[key] !== 'none').length,
    total:    episodes.length,
  }));
}

export function filterByPeriod(episodes, period) {
  if (period === 'all') return episodes;
  const days = period === '30' ? 30 : 90;
  const cutoff = Date.now() - days * 86400000;
  return episodes.filter(e => new Date(e.startTime).getTime() >= cutoff);
}

export function formatEpisodeNotes(episode) {
  const parts = [];
  if (episode.tinnitus)        parts.push(`Tinnitus: ${episode.tinnitus}`);
  if (episode.earBlocked)      parts.push(`Ear blocked: ${episode.earBlocked}`);
  if (episode.shoulderAche)    parts.push(`Shoulder ache: ${episode.shoulderAche}`);
  if (episode.coldExtremities) parts.push(`Cold extremities: ${episode.coldExtremities}`);
  if (episode.bloodPressure)   parts.push(`BP: ${escHtml(episode.bloodPressure)}`);
  if (episode.pulse)           parts.push(`Pulse: ${episode.pulse}`);
  if (episode.temperature)     parts.push(`Temp: ${episode.temperature}°C`);
  if (episode.airPressure)     parts.push(`Air: ${episode.airPressure}hPa`);
  if (episode.notes)           parts.push(escHtml(episode.notes));
  return parts.join(' · ') || '—';
}
