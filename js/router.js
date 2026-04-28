// Activates the correct view section and tab when a tab is clicked.
// onViewChange() is called after each switch so the active view can re-render.
export function initRouter(onViewChange) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const viewId = `view-${tab.dataset.view}`;

      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.removeAttribute('aria-current');
      });
      document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        v.hidden = true;
      });

      tab.classList.add('active');
      tab.setAttribute('aria-current', 'page');
      const view = document.getElementById(viewId);
      view.classList.add('active');
      view.hidden = false;

      onViewChange(tab.dataset.view);
    });
  });
}
