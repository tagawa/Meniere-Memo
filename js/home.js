import { t, getLang } from './i18n.js';
import { getEpisodes } from './store.js';
import { formatDuration, calcEpisodeDuration } from './stats.js';

// Formats a date string for display: "Mon 28 Apr · 14:32" (locale-aware)
function formatDateTime(isoString) {
  const locale = getLang() === 'ja' ? 'ja-JP' : 'en-GB';
  const d = new Date(isoString);
  return d.toLocaleDateString(locale, {
    weekday: 'short', day: 'numeric', month: 'short'
  }) + ' · ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function episodeSummary(ep) {
  if (!ep.severity) return `<span class="episode-needs-details">${t('log.addDetails')}</span>`;
  const parts = [];
  const mins = calcEpisodeDuration(ep);
  if (mins !== null) parts.push(formatDuration(mins));
  if (ep.tinnitus)     parts.push(t('log.tinnitus'));
  if (ep.earBlocked)   parts.push(t('log.earBlocked'));
  if (ep.shoulderAche) parts.push(t('log.shoulderAche'));
  return parts.join(' · ') || '—';
}

function severityBadge(ep) {
  if (!ep.severity) return `<span class="severity-badge severity-badge--none">${t('log.noSeverity')}</span>`;
  return `<span class="severity-badge severity-badge--${ep.severity}">${t(`log.${ep.severity}`)}</span>`;
}

export function renderHome(onLogClick, onEpisodeClick) {
  const view = document.getElementById('view-home');
  const recent = getEpisodes()
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(0, 3);

  view.innerHTML = `
    <button class="btn-log" id="log-btn">
      ${t('home.logButton')}
    </button>

    <h2 class="section-label">${t('home.recentEpisodes')}</h2>

    ${recent.length === 0
      ? `<p class="empty-state">${t('home.noEpisodes')}</p>`
      : recent.map(ep => `
          <button class="episode-card" data-id="${ep.id}">
            ${severityBadge(ep)}
            <span class="episode-card-body">
              <span class="episode-card-date">${formatDateTime(ep.startTime)}</span>
              <span class="episode-card-summary">${episodeSummary(ep)}</span>
            </span>
            <span class="episode-card-arrow" aria-hidden="true">›</span>
          </button>`
        ).join('')
    }
  `;

  document.getElementById('log-btn').addEventListener('click', onLogClick);
  view.querySelectorAll('.episode-card[data-id]').forEach(card => {
    card.addEventListener('click', () => onEpisodeClick(card.dataset.id));
  });
}
