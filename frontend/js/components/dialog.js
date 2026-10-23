/**
 * Dialog component for detail modals.
 */
import { $ } from '../utils.js';

/**
 * Opens a detail dialog.
 * @param {string} title - Dialog title
 * @param {string} kicker - Section kicker/label
 * @param {string} content - HTML content for the dialog body
 */
export function openDetail(title, kicker, content) {
  const dialog = $('#detail-dialog');
  if (!dialog) return;
  $('#detail-title').textContent = title;
  $('#detail-kicker').textContent = kicker;
  $('#detail-content').innerHTML = `<div class="dialog-body">${content}</div>`;
  if (dialog.open) dialog.close();
  dialog.showModal();
}

/**
 * Closes the detail dialog.
 */
export function closeDetail() {
  const dialog = $('#detail-dialog');
  if (dialog?.open) dialog.close();
}

/**
 * Binds dialog event listeners.
 * @param {Function} onClose - Callback when dialog closes with a route
 * @param {Function} getCurrentView - Function to get current view
 * @param {Function} setRouteSilently - Function to set route without navigation
 */
export function bindDialogEvents(onClose, getCurrentView, setRouteSilently) {
  const dialog = $('#detail-dialog');
  if (!dialog) return;

  $('#close-dialog').addEventListener('click', closeDetail);
  
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDetail();
  });
  
  dialog.addEventListener('close', () => {
    const route = getCurrentView ? getCurrentView() : null;
    if (route && (route.caseId || route.id)) {
      setRouteSilently(route.view ?? 'resumen');
    }
    if (onClose) onClose();
  });
}