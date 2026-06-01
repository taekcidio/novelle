// ═══════════════════════════════════════
// NOVELLE — Toast Component
// ═══════════════════════════════════════

import { $ } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { CONFIG } from '../config.js';
import { escapeHtml } from '../utils/helpers.js';

const ICONS = {
  success: icon('check'),
  error: icon('x'),
  warning: icon('star'),
  info: icon('sparkles'),
};

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration - ms
 */
export function showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
  const container = $('#toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${ICONS[type] || ''}</span>
    <div class="toast__content">
      <p class="toast__message">${escapeHtml(message)}</p>
    </div>
    <button class="toast__close">${icon('x')}</button>
  `;

  container.appendChild(toast);

  // Close button
  toast.querySelector('.toast__close').addEventListener('click', () => removeToast(toast));

  // Auto-dismiss
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 300);
}
