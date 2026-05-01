import { t } from './i18n.js';
import { createEpisode, addEpisode, updateEpisode, deleteEpisode, getEpisodes, resolveEndTime } from './store.js';

let onSaved;      // callback to re-render the current view after save
let editingId = null; // null = new episode, string = editing existing
let currentEpisodeStart = null;
let triggerElement = null; // element that triggered modal open — restore focus on close (WCAG 2.4.3)
// Optional field state — reset each time modal opens
let tinnitus, earBlocked, shoulderAche, coldExtremities;

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
      group.querySelectorAll('.pill').forEach(p => p.setAttribute('aria-pressed', 'false'));
      if (wasPressed) {
        // Tapping the already-selected pill deselects back to null (not recorded)
        onSelect(null);
      } else {
        pill.setAttribute('aria-pressed', 'true');
        onSelect(pill.dataset.value); // 'none', 'mild', 'moderate', or 'severe'
      }
    });
  });
}

const SEVERITY_LABELS = [
  { value: 'none',     i18nKey: 'log.none' },
  { value: 'mild',     i18nKey: 'log.mild' },
  { value: 'moderate', i18nKey: 'log.moderate' },
  { value: 'severe',   i18nKey: 'log.severe' },
];

// --- Modal open/close ---
function openModal() {
  triggerElement = document.activeElement;
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
  triggerElement?.focus();
  triggerElement = null;
}

// Converts an ISO string to the YYYY-MM-DDTHH:MM format required by datetime-local inputs.
function toDatetimeLocal(isoString) {
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// --- Render modal content ---
function renderModal(episode) {
  currentEpisodeStart  = episode.startTime;
  tinnitus             = episode.tinnitus;
  earBlocked           = episode.earBlocked;
  shoulderAche         = episode.shoulderAche;
  coldExtremities      = episode.coldExtremities;

  const isEdit = editingId !== null;

  document.getElementById('modal-content').innerHTML = `
    <div style="padding: 0 16px 24px;">
      <h2 id="log-modal-title" style="font-size:1.25rem; font-weight:700; margin-bottom:4px;">
        ${t(isEdit ? 'log.editTitle' : 'log.title')}
      </h2>

      <div class="field" style="flex-direction:column; align-items:flex-start; gap:6px; margin-bottom:24px;">
        <label class="field-label" for="start-time">${t('log.startTime')}</label>
        <input type="datetime-local" id="start-time" class="field-input"
          style="width:100%; text-align:left;"
          value="${toDatetimeLocal(episode.startTime)}" />
      </div>

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
        <div style="display:flex; flex-direction:column; gap:20px; padding-top:4px;">

          <!-- End time -->
          <div class="field">
            <label class="field-label" for="end-time">${t('log.endTime')}</label>
            <input type="time" id="end-time" class="field-input"
              value="${episode.endTime
                ? new Date(episode.endTime).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
                : ''}" />
          </div>

          <!-- Tinnitus -->
          <div>
            <p class="section-label">${t('log.tinnitus')}</p>
            <div id="tinnitus-group">
              ${makePillGroup('log.tinnitus', SEVERITY_LABELS, episode.tinnitus)}
            </div>
          </div>

          <!-- Ear blocked -->
          <div>
            <p class="section-label">${t('log.earBlocked')}</p>
            <div id="ear-group">
              ${makePillGroup('log.earBlocked', SEVERITY_LABELS, episode.earBlocked)}
            </div>
          </div>

          <!-- Shoulder ache -->
          <div>
            <p class="section-label">${t('log.shoulderAche')}</p>
            <div id="shoulder-group">
              ${makePillGroup('log.shoulderAche', SEVERITY_LABELS, episode.shoulderAche)}
            </div>
          </div>

          <!-- Fingers & toes cold -->
          <div>
            <p class="section-label">${t('log.coldExtremities')}</p>
            <div id="cold-group">
              ${makePillGroup('log.coldExtremities', SEVERITY_LABELS, episode.coldExtremities)}
            </div>
          </div>

          <!-- Medical readings -->
          <div style="border-top:1px solid var(--color-border); padding-top:16px;">
            <p class="section-label" style="margin-bottom:12px;">${t('log.medicalReadings')}</p>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div class="field">
                <label class="field-label" for="bp">${t('log.bloodPressure')}</label>
                <input type="text" id="bp" class="field-input"
                  placeholder="${t('log.bpPlaceholder')}"
                  value="${episode.bloodPressure ?? ''}" inputmode="text" />
              </div>
              <div class="field">
                <label class="field-label" for="pulse">${t('log.pulse')}</label>
                <input type="number" id="pulse" class="field-input"
                  placeholder="—" value="${episode.pulse ?? ''}" inputmode="numeric" />
              </div>
              <div class="field">
                <label class="field-label" for="temp">${t('log.temperature')}</label>
                <input type="number" id="temp" class="field-input" step="0.1"
                  placeholder="—" value="${episode.temperature ?? ''}" inputmode="decimal" />
              </div>
              <div class="field">
                <label class="field-label" for="air">${t('log.airPressure')}</label>
                <input type="number" id="air" class="field-input"
                  placeholder="—" value="${episode.airPressure ?? ''}" inputmode="numeric" />
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div style="border-top:1px solid var(--color-border); padding-top:16px;">
            <label class="section-label" for="notes">${t('log.notes')}</label>
            <textarea id="notes" class="field-input"
              placeholder="${t('log.notesPlaceholder')}"
              style="margin-top:8px;">${episode.notes ?? ''}</textarea>
          </div>

          <button class="btn-primary" id="modal-save-bottom" style="margin-top:8px;">${t('log.save')}</button>

        </div>
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

  // Severity pills — null is allowed (not yet recorded)
  let severity = episode.severity;
  const severityGroup = document.getElementById('severity-group');
  bindPillGroup(severityGroup, '.pill', v => { severity = v; });

  // Optional toggle
  document.getElementById('optional-toggle').addEventListener('click', e => {
    const section = document.getElementById('optional-section');
    const isOpen = !section.hidden;
    section.hidden = isOpen;
    e.currentTarget.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    e.currentTarget.textContent = t('log.optionalDetails') + (isOpen ? ' ▾' : ' ▴');
  });

  // Optional symptom pill groups
  bindPillGroup(document.getElementById('tinnitus-group'), '.pill', v => { tinnitus = v; });
  bindPillGroup(document.getElementById('ear-group'),      '.pill', v => { earBlocked = v; });
  bindPillGroup(document.getElementById('shoulder-group'), '.pill', v => { shoulderAche = v; });
  bindPillGroup(document.getElementById('cold-group'),     '.pill', v => { coldExtremities = v; });

  // Save — shared handler for both save buttons
  function handleSave() {
    const updates = { severity, ...collectOptionalFields() };
    // Capture before closeModal resets editingId
    const statusKey = editingId ? 'log.episodeUpdated' : 'log.episodeSaved';
    if (editingId) {
      updateEpisode(editingId, updates);
    } else {
      addEpisode(createEpisode(updates));
    }
    closeModal();
    document.getElementById('status-msg').textContent = t(statusKey);
    onSaved?.();
  }
  document.getElementById('modal-save').addEventListener('click', handleSave);
  document.getElementById('modal-save-bottom').addEventListener('click', handleSave);

  // Delete (edit mode only)
  document.getElementById('modal-delete')?.addEventListener('click', () => {
    if (confirm(t('log.confirmDelete'))) {
      deleteEpisode(editingId);
      document.getElementById('status-msg').textContent = t('log.episodeDeleted');
      closeModal();
      onSaved?.();
    }
  });
}

function collectOptionalFields() {
  // Read new start time — may differ from original if user edited it
  const startTimeInput = document.getElementById('start-time');
  const newStartTime = startTimeInput?.value
    ? new Date(startTimeInput.value).toISOString()
    : currentEpisodeStart;

  // End time: combine new start date with the selected time value
  const endTimeInput = document.getElementById('end-time');
  let endTime = null;
  if (endTimeInput?.value) {
    const [h, m] = endTimeInput.value.split(':').map(Number);
    const base = new Date(newStartTime);
    base.setHours(h, m, 0, 0);
    endTime = base.toISOString();
  }

  // Silently clear endTime if start is now after end
  endTime = resolveEndTime(newStartTime, endTime);

  const pulse         = parseFloat(document.getElementById('pulse')?.value) || null;
  const temperature   = parseFloat(document.getElementById('temp')?.value)  || null;
  const airPressure   = parseFloat(document.getElementById('air')?.value)   || null;
  const bloodPressure = document.getElementById('bp')?.value.trim() || null;
  const notes         = document.getElementById('notes')?.value.trim() || null;

  return { startTime: newStartTime, endTime, tinnitus, earBlocked, shoulderAche, coldExtremities,
           bloodPressure, pulse, temperature, airPressure, notes };
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

export function openEditLog(id) {
  const episode = getEpisodes().find(e => e.id === id);
  if (!episode) return;
  editingId = id;
  openModal();
  renderModal(episode);
}
