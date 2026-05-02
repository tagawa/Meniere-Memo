import { t, getLang } from './i18n.js';

function severityBadge(ep) {
  if (!ep.severity) return `<span class="severity-badge severity-badge--none">${t('log.noSeverity')}</span>`;
  return `<span class="severity-badge severity-badge--${ep.severity}">${t(`log.${ep.severity}`)}</span>`;
}
import { getEpisodes } from './store.js';
import { formatDuration, calcEpisodeDuration } from './stats.js';


let onEpisodeClick; // set by renderHistory caller
let currentPeriod = '4wk';

function formatDateTime(isoString) {
  const locale = getLang() === 'ja' ? 'ja-JP' : 'en';
  const d = new Date(isoString);
  return d.toLocaleDateString(locale, {
    weekday: 'short', day: 'numeric', month: 'short',
  }) + ' · ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function episodeSummary(ep) {
  if (!ep.severity) return `<span class="episode-needs-details">${t('log.addDetails')}</span>`;
  const parts = [];
  const dur = calcEpisodeDuration(ep);
  if (dur !== null) parts.push(formatDuration(dur));
  if (ep.tinnitus        && ep.tinnitus        !== 'none') parts.push(t('log.tinnitus'));
  if (ep.earBlocked      && ep.earBlocked      !== 'none') parts.push(t('log.earBlocked'));
  if (ep.headache        && ep.headache        !== 'none') parts.push(t('log.headache'));
  if (ep.shoulderAche    && ep.shoulderAche    !== 'none') parts.push(t('log.shoulderAche'));
  if (ep.coldExtremities && ep.coldExtremities !== 'none') parts.push(t('log.coldExtremities'));
  return parts.join(' · ') || '—';
}

function buildChart(episodes, period) {
  const weeksCount = period === '4wk' ? 4 : period === '12wk' ? 12 : null;
  const now = new Date();
  // Snap to most recent Monday
  const daysToMonday = (now.getDay() + 6) % 7;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  // Compute locale once before bucket creation
  const locale = getLang() === 'ja' ? 'ja-JP' : 'en';

  let buckets;
  if (weeksCount) {
    buckets = Array.from({ length: weeksCount }, (_, i) => {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() - (weeksCount - 1 - i) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { start, end, count: 0, label: `${start.getDate()} ${start.toLocaleString(locale, { month: 'short' })}` };
    });
  } else {
    // All time: group into weeks dynamically
    if (!episodes.length) return '<p class="empty-state">—</p>';
    const earliest = new Date(episodes[episodes.length - 1].startTime);
    // Snap earliest back to its Monday
    const daysToMon = (earliest.getDay() + 6) % 7;
    earliest.setDate(earliest.getDate() - daysToMon);
    earliest.setHours(0, 0, 0, 0);
    const totalWeeks = Math.ceil((thisMonday - earliest) / (7 * 86400000)) + 1;
    buckets = Array.from({ length: totalWeeks }, (_, i) => {
      const start = new Date(earliest);
      start.setDate(earliest.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { start, end, count: 0, label: `${start.getDate()} ${start.toLocaleString(locale, { month: 'short' })}` };
    });
  }

  episodes.forEach(ep => {
    const ts = new Date(ep.startTime).getTime();
    const b = buckets.find(b => ts >= b.start.getTime() && ts < b.end.getTime());
    if (b) b.count++;
  });

  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const SVG_W = 360;
  const barWidth = SVG_W / buckets.length;
  const chartHeight = 60;
  // Only show every Nth label to avoid crowding when there are many bars
  const labelEvery = buckets.length <= 6 ? 1 : buckets.length <= 13 ? 2 : Math.ceil(buckets.length / 6);

  const bars = buckets.map((b, i) => {
    const barH = b.count === 0 ? 2 : Math.round((b.count / maxCount) * chartHeight);
    const x = i * barWidth;
    return `
      <g role="img" aria-label="${b.label}: ${b.count} ${t(b.count === 1 ? 'common.episode' : 'common.episodes')}">
        <rect x="${x + barWidth * 0.1}" y="${chartHeight - barH}"
          width="${barWidth * 0.8}" height="${barH}"
          fill="var(--color-accent)" rx="3" opacity="${b.count === 0 ? 0.2 : 1}" />
        ${i % labelEvery === 0 ? `<text x="${x + barWidth / 2}" y="${chartHeight + 14}"
          text-anchor="middle" font-size="11" fill="var(--color-text-muted)"
          font-family="var(--font-sans)">
          ${b.label}
        </text>` : ''}
      </g>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${SVG_W} ${chartHeight + 20}" preserveAspectRatio="none"
      style="width:100%; height:${chartHeight + 20}px; display:block;"
      aria-label="${t('history.perWeek')}">
      ${bars}
    </svg>`;
}

export function renderHistory(onClickCallback) {
  onEpisodeClick = onClickCallback;
  const view = document.getElementById('view-history');
  const allEpisodes = getEpisodes()
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  view.innerHTML = `
    <div class="chart-container">
      <div class="chart-header">
        <span class="chart-title">${t('history.perWeek')}</span>
        <div class="chart-period-btns" role="group" aria-label="Chart period">
          ${['4wk','12wk','all'].map(p => `
            <button class="chart-period-btn ${currentPeriod === p ? 'active' : ''}"
              data-period="${p}" aria-pressed="${currentPeriod === p}">
              ${t(`history.${p}`)}
            </button>`).join('')}
        </div>
      </div>
      <div id="chart-svg">${buildChart(allEpisodes, currentPeriod)}</div>
    </div>

    <h2 class="section-label" style="margin-bottom:0;">${t('history.allEpisodes')}</h2>

    ${allEpisodes.length === 0
      ? `<p class="empty-state">${t('history.noEpisodes')}</p>`
      : allEpisodes.map(ep => `
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

  // Period toggle
  view.querySelectorAll('.chart-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period;
      view.querySelectorAll('.chart-period-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      document.getElementById('chart-svg').innerHTML = buildChart(allEpisodes, currentPeriod);
    });
  });

  // Episode tap
  view.querySelectorAll('.episode-card[data-id]').forEach(card => {
    card.addEventListener('click', () => onEpisodeClick?.(card.dataset.id));
  });
}
