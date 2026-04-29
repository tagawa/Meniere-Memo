import { t } from './i18n.js';
import { getEpisodes } from './store.js';
import {
  calcAverageSeverity,
  calcAverageDuration,
  formatDuration,
  calcSymptomFrequency,
  filterByPeriod,
  formatEpisodeNotes,
  calcEpisodeDuration,
} from './stats.js';

let currentPeriod = '30';

function formatDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateRange(episodes) {
  if (!episodes.length) return '';
  const dates = episodes.map(e => new Date(e.startTime));
  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(min)} – ${fmt(max)}`;
}

const SYMPTOM_I18N = {
  tinnitus:        'doctor.tinnitus',
  earBlocked:      'doctor.earBlocked',
  shoulderAche:    'doctor.shoulderAche',
  coldExtremities: 'doctor.coldExtremities',
};

export function renderDoctor() {
  const view = document.getElementById('view-doctor');
  const allEpisodes = getEpisodes()
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const episodes = filterByPeriod(allEpisodes, currentPeriod);

  const avgSev = calcAverageSeverity(episodes);
  const avgDur = calcAverageDuration(episodes);
  const freq   = calcSymptomFrequency(episodes);
  const today  = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  view.innerHTML = `
    <div class="doctor-controls">
      <div style="display:flex; gap:6px;" role="group" aria-label="Report period">
        ${['30','90','all'].map(p => `
          <button class="pill chart-period-btn ${currentPeriod === p ? 'active' : ''}"
            data-period="${p}" aria-pressed="${currentPeriod === p}"
            style="flex:none; padding:6px 14px;">
            ${t(`doctor.${p === '30' ? '30d' : p === '90' ? '90d' : 'all'}`)}
          </button>`).join('')}
      </div>
      <button id="print-btn" class="btn-primary"
        style="width:auto; padding:8px 14px; font-size:0.85rem; min-height:40px;">
        ${t('doctor.print')}
      </button>
    </div>

    <!-- Printable report starts here -->
    <div id="report">
      <div style="text-align:center; padding-bottom:16px; border-bottom:2px solid var(--color-border); margin-bottom:20px;">
        <h2 style="font-size:1.4rem; font-weight:800; margin-bottom:4px;">${t('doctor.title')}</h2>
        <p style="font-size:0.85rem; color:var(--color-text-muted);">
          ${formatDateRange(episodes)} · ${episodes.length} episode${episodes.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${episodes.length}</div>
          <div class="stat-label">${t('doctor.episodes')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${avgSev ? t(`log.${avgSev}`) : '—'}</div>
          <div class="stat-label">${t('doctor.avgSeverity')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatDuration(avgDur)}</div>
          <div class="stat-label">${t('doctor.avgDuration')}</div>
        </div>
      </div>

      <h3 class="section-label" style="margin-bottom:8px;">${t('doctor.episodeLog')}</h3>

      ${episodes.length === 0
        ? `<p class="empty-state">${t('doctor.noEpisodes')}</p>`
        : `<table class="summary-table">
            <thead>
              <tr>
                <th>${t('doctor.dateTime')}</th>
                <th>${t('doctor.severity')}</th>
                <th>${t('doctor.duration')}</th>
                <th>${t('doctor.notes')}</th>
              </tr>
            </thead>
            <tbody>
              ${[...episodes].reverse().map(ep => `
                <tr>
                  <td style="white-space:nowrap; font-weight:600;">${formatDateTime(ep.startTime)}</td>
                  <td>
                    <span class="severity-badge ${ep.severity ? `severity-badge--${ep.severity}` : 'severity-badge--none'}">
                      ${ep.severity ? t(`log.${ep.severity}`) : t('log.noSeverity')}
                    </span>
                  </td>
                  <td style="white-space:nowrap;">${formatDuration(calcEpisodeDuration(ep))}</td>
                  <td style="font-size:0.8rem; color:var(--color-text-secondary);">${formatEpisodeNotes(ep)}</td>
                </tr>`).join('')}
            </tbody>
          </table>`
      }

      <h3 class="section-label" style="margin-top:20px; margin-bottom:8px;">${t('doctor.symptomFreq')}</h3>
      <div style="background:var(--color-surface); border-radius:var(--radius-md); padding:var(--space-md);">
        ${freq.map(f => `
          <div class="field" style="padding:6px 0; border-bottom:1px solid var(--color-border);">
            <span class="field-label">${t(SYMPTOM_I18N[f.key])}</span>
            <span style="font-weight:600; font-size:0.9rem;">
              ${f.recorded} / ${f.total}
            </span>
          </div>`).join('')}
      </div>

      <p style="font-size:0.75rem; color:var(--color-text-muted); text-align:center; margin-top:20px;">
        ${t('doctor.generated')} · ${today}
      </p>
    </div>
  `;

  // Period toggle
  view.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period;
      renderDoctor();
    });
  });

  document.getElementById('print-btn').addEventListener('click', () => window.print());
}
