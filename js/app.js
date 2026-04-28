import { initRouter }           from './router.js';
import { renderHome }           from './home.js';
import { t, getLang, setLang }  from './i18n.js';
import { initLog, openNewLog, openEditLog } from './log.js';

function renderView(view) {
  switch (view) {
    case 'home':    renderHome(openNewLog, openEditLog); break;
    case 'history': /* Task 9 */ break;
    case 'doctor':  /* Task 11 */ break;
  }
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
    const activeTab = document.querySelector('.tab.active');
    renderView(activeTab?.dataset.view ?? 'home');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLog(() => {
    // re-render current view after save/delete
    const activeTab = document.querySelector('.tab.active');
    renderView(activeTab?.dataset.view ?? 'home');
  });
  initRouter(renderView);
  initLangToggle();
  renderView('home');
});
