import { initRouter }           from './router.js';
import { renderHome }           from './home.js';
import { t, getLang, setLang }  from './i18n.js';
import { initLog, openEditLog } from './log.js';
import { renderHistory }        from './history.js';
import { renderDoctor }         from './doctor.js';
import { addEpisode, createEpisode, updateEpisode, setWriteErrorHandler, migrateEpisodes, getEpisodes } from './store.js';
import { fetchAirPressure, initWeather, getCachedPressure } from './weather.js';
import { renderPressureStrip } from './pressure-strip.js';

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'alert');
  el.textContent = msg;
  document.body.appendChild(el);
  el.offsetHeight; // force layout so transition fires
  el.classList.add('toast--visible');
  setTimeout(() => {
    el.classList.remove('toast--visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, 4000);
}

// One-tap log: saves immediately with timestamp + cached pressure, no modal
function quickLog() {
  // #2 — debounce: prevent double-tap creating two episodes
  const btn = document.getElementById('log-btn');
  btn.disabled = true;
  setTimeout(() => { btn.disabled = false; }, 1000);

  const episode = createEpisode();
  episode.airPressure = getCachedPressure();
  addEpisode(episode);
  document.getElementById('status-msg').textContent = t('log.episodeSaved');
  renderView('home');

  // #6 — target the new card by ID rather than first-in-DOM-order
  document.querySelector(`[data-episode-id="${episode.id}"]`)?.classList.add('episode-card--new');

  // #3 — race guard: skip fresh-fetch update if user edited airPressure before it resolved
  const originalPressure = episode.airPressure;
  fetchAirPressure().then(airPressure => {
    if (airPressure === null) return;
    const current = getEpisodes().find(e => e.id === episode.id);
    if (!current) return; // episode was deleted before fetch resolved
    if (!Object.is(current.airPressure, originalPressure)) return; // user edited it
    updateEpisode(episode.id, { airPressure });
    renderView('home');
  }).catch(() => {});
}

function renderView(view) {
  const strip = document.getElementById('pressure-strip');
  switch (view) {
    case 'home':
      renderHome(quickLog, openEditLog);
      renderPressureStrip(); // shows sparkline when data available, loading state otherwise
      break;
    case 'history':
      renderHistory(openEditLog);
      strip.hidden = true;
      break;
    case 'doctor':
      renderDoctor();
      strip.hidden = true;
      break;
  }
}

function updateStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

function initLangToggle() {
  const btn = document.getElementById('lang-toggle');
  function updateBtn() {
    btn.textContent = getLang() === 'en' ? '日本語' : 'EN';
    btn.setAttribute('aria-label',
      getLang() === 'en' ? 'Switch to Japanese' : 'Switch to English');
  }
  updateBtn();
  btn.addEventListener('click', () => {
    setLang(getLang() === 'en' ? 'ja' : 'en');
    updateBtn();
    updateStaticI18n();
    const activeTab = document.querySelector('.tab.active');
    renderView(activeTab?.dataset.view ?? 'home');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  migrateEpisodes();
  initWeather().then(() => {
    const activeTab = document.querySelector('.tab.active');
    if ((activeTab?.dataset.view ?? 'home') === 'home') renderPressureStrip();
  });
  setWriteErrorHandler(() => showToast(t('store.writeError')));
  updateStaticI18n();
  initLog(() => {
    // re-render current view after save/delete
    const activeTab = document.querySelector('.tab.active');
    renderView(activeTab?.dataset.view ?? 'home');
  });
  initRouter(renderView);
  initLangToggle();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }
});
