import { t, getLang } from './i18n.js';
import { getEpisodes } from './store.js';
import { formatDuration, calcEpisodeDuration } from './stats.js';

// Formats a date string for display: "Mon 28 Apr · 14:32" (locale-aware)
function formatDateTime(isoString) {
  const locale = getLang() === 'ja' ? 'ja-JP' : 'en';
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
  if (ep.tinnitus        && ep.tinnitus        !== 'none') parts.push(t('log.tinnitus'));
  if (ep.earBlocked      && ep.earBlocked      !== 'none') parts.push(t('log.earBlocked'));
  if (ep.headache        && ep.headache        !== 'none') parts.push(t('log.headache'));
  if (ep.shoulderAche    && ep.shoulderAche    !== 'none') parts.push(t('log.shoulderAche'));
  if (ep.coldExtremities && ep.coldExtremities !== 'none') parts.push(t('log.coldExtremities'));
  return parts.join(' · ') || '—';
}

function severityBadge(ep) {
  if (!ep.severity) return `<span class="severity-badge severity-badge--none">${t('log.noSeverity')}</span>`;
  return `<span class="severity-badge severity-badge--${ep.severity}">${t(`log.${ep.severity}`)}</span>`;
}

export function renderHome(onLogClick, onEpisodeClick) {
  const view = document.getElementById('view-home');
  // Sort all episodes newest-first; use the full list for count, slice for display
  const allEpisodes = getEpisodes()
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  const recent = allEpisodes.slice(0, 3);

  view.innerHTML = `
    <button class="btn-log" id="log-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
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

    ${allEpisodes.length > 3
      ? `<a href="#history" class="see-more-link">${t('home.seeAll')} →</a>`
      : ''
    }
  `;

  document.getElementById('log-btn').addEventListener('click', onLogClick);
  view.querySelectorAll('.episode-card[data-id]').forEach(card => {
    card.addEventListener('click', () => onEpisodeClick(card.dataset.id));
  });
}
