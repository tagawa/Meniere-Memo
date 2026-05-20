import { initRouter }           from './router.js';
import { renderHome }           from './home.js';
import { t, getLang, setLang }  from './i18n.js';
import { initLog, openEditLog } from './log.js';
import { renderHistory }        from './history.js';
import { renderDoctor }         from './doctor.js';
import { addEpisode, createEpisode, updateEpisode, setWriteErrorHandler } from './store.js';
import { fetchAirPressure, initWeather, getCachedPressure } from './weather.js';

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
  const episode = createEpisode();
  episode.airPressure = getCachedPressure(); // synchronous — committed with the episode
  addEpisode(episode);
  document.getElementById('status-msg').textContent = t('log.episodeSaved');
  renderView('home');
  // Flash the new card so the user sees it was added
  document.querySelector('#view-home .episode-card')?.classList.add('episode-card--new');
  // Best-effort fresh fetch — overwrites with more current reading if it resolves
  fetchAirPressure().then(airPressure => {
    if (airPressure === null) return;
    updateEpisode(episode.id, { airPressure });
    renderView('home');
  });
}

function renderView(view) {
  switch (view) {
    case 'home':    renderHome(quickLog, openEditLog); break;
    case 'history': renderHistory(openEditLog); break;
    case 'doctor':  renderDoctor(); break;
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
  initWeather(); // fire-and-forget: pre-populates cachedPressure before user taps log
  setWriteErrorHandler(() => showToast(t('store.writeError')));
  updateStaticI18n();
  initLog(() => {
    // re-render current view after save/delete
    const activeTab = document.querySelector('.tab.active');
    renderView(activeTab?.dataset.view ?? 'home');
  });
  initRouter(renderView);
  initLangToggle();
  renderView('home');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }
});
