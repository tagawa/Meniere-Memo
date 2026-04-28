import { t } from './i18n.js';
import { createEpisode, addEpisode, updateEpisode, deleteEpisode, getEpisodes } from './store.js';

let onSaved;      // callback to re-render the current view after save
let editingId = null; // null = new episode, string = editing existing

// --- Pill group helper ---
function makePillGroup(name, labels, currentValue) {
  // labels: [{ value, i18nKey }]
  return `
    <div class="pill-group" role="group" aria-label="${t(name)}">
      ${labels.map(({ value, i18nKey }) => `
        <button type="button"
          class="pill pill--${value}"
          data-value="${value}"
          aria-pressed="${currentValue === value ? 'true' : 'false'}">
          ${t(i18nKey)}
        </button>
      `).join('')}
    </div>
  `;
}

function bindPillGroup(container, selector, onSelect) {
  container.querySelectorAll(selector).forEach(pill => {
    pill.addEventListener('click', () => {
      const group = pill.closest('.pill-group');
      const wasPressed = pill.getAttribute('aria-pressed') === 'true';
      // deselect all in group
      group.querySelectorAll('.pill').forEach(p => p.setAttribute('aria-pressed', 'false'));
      // toggle this one (tap again to deselect)
      pill.setAttribute('aria-pressed', wasPressed ? 'false' : 'true');
      onSelect(wasPressed ? null : pill.dataset.value);
    });
  });
}

const SEVERITY_LABELS = [
  { value: 'mild',     i18nKey: 'log.mild' },
  { value: 'moderate', i18nKey: 'log.moderate' },
  { value: 'severe',   i18nKey: 'log.severe' },
];

// --- Modal open/close ---
function openModal() {
  const modal = document.getElementById('log-modal');
  modal.hidden = false;
  modal.querySelector('#modal-sheet').focus();
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('log-modal');
  modal.hidden = true;
  document.body.style.overflow = '';
  editingId = null;
}

// --- Render modal content ---
function renderModal(episode) {
  const isEdit = editingId !== null;
  const startDate = new Date(episode.startTime);
  const dateStr = startDate.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = startDate.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });

  document.getElementById('modal-content').innerHTML = `
    <div style="padding: 0 16px 24px;">
      <h2 id="log-modal-title" style="font-size:1.25rem; font-weight:700; margin-bottom:4px;">
        ${t(isEdit ? 'log.editTitle' : 'log.title')}
      </h2>
      <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:24px;">
        ${dateStr} · ${timeStr}
      </p>

      <p class="section-label">${t('log.severity')}</p>
      <div id="severity-group">
        ${makePillGroup('log.severity', SEVERITY_LABELS, episode.severity)}
      </div>

      <div style="margin-top: 24px;">
        <button class="btn-primary" id="modal-save">${t('log.save')}</button>
      </div>

      <div class="divider" style="margin-top: 24px;">
        <button id="optional-toggle" aria-expanded="false"
          style="color:var(--color-accent); font-size:0.85rem; font-weight:600; white-space:nowrap;">
          ${t('log.optionalDetails')} ▾
        </button>
      </div>

      <div id="optional-section" hidden>
        <!-- populated in Task 8 -->
      </div>

      ${isEdit ? `
        <button id="modal-delete"
          style="display:block; width:100%; margin-top:16px; padding:12px;
                 color:var(--color-severe); font-size:0.9rem; font-weight:600;
                 border:1.5px solid var(--color-severe); border-radius:var(--radius-md);">
          ${t('log.delete')}
        </button>
      ` : ''}
    </div>
  `;

  // Severity pills
  let severity = episode.severity;
  const severityGroup = document.getElementById('severity-group');
  bindPillGroup(severityGroup, '.pill', v => {
    if (!v) {
      // Severity is required — keep first pill selected
      severityGroup.querySelectorAll('.pill')[0].setAttribute('aria-pressed', 'true');
      severity = 'mild';
    } else {
      severity = v;
    }
  });

  // Optional toggle
  document.getElementById('optional-toggle').addEventListener('click', e => {
    const section = document.getElementById('optional-section');
    const isOpen = !section.hidden;
    section.hidden = isOpen;
    e.currentTarget.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    e.currentTarget.textContent = t('log.optionalDetails') + (isOpen ? ' ▾' : ' ▴');
  });

  // Save
  document.getElementById('modal-save').addEventListener('click', () => {
    const updates = { severity, ...collectOptionalFields() };
    if (editingId) {
      updateEpisode(editingId, updates);
    } else {
      addEpisode(createEpisode(updates));
    }
    closeModal();
    onSaved?.();
  });

  // Delete (edit mode only)
  document.getElementById('modal-delete')?.addEventListener('click', () => {
    if (confirm(t('log.confirmDelete'))) {
      deleteEpisode(editingId);
      closeModal();
      onSaved?.();
    }
  });
}

// Stub — returns empty object until Task 8 fills in the optional section
function collectOptionalFields() {
  return {};
}

// --- Public API ---
export function initLog(onSavedCallback) {
  onSaved = onSavedCallback;

  // Close on backdrop click
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);

  // Close on Escape key (WCAG requirement for role="dialog")
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('log-modal').hidden) closeModal();
  });
}

export function openNewLog() {
  editingId = null;
  openModal();
  renderModal(createEpisode());
}

export function openEditLog(id) {
  const episode = getEpisodes().find(e => e.id === id);
  if (!episode) return;
  editingId = id;
  openModal();
  renderModal(episode);
}
