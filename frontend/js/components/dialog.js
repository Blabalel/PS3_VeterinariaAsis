/**
 * Dialog component for detail modals.
 */
import { $, closeDetail as closeClinicalDetail, openDetail as openClinicalDetail } from '../utils.js';

/**
 * Opens a detail dialog.
 * @param {string} title - Dialog title
 * @param {string} kicker - Section kicker/label
 * @param {string} content - HTML content for the dialog body
 */
export function openDetail(title, kicker, content) {
  return openClinicalDetail(title, kicker, content);
}

/**
 * Closes the detail dialog.
 */
export function closeDetail() {
  return closeClinicalDetail();
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

  function dismiss() {
    if (!closeDetail()) return;
    const route = getCurrentView?.();
    if (route && (route.caseId || route.id)) setRouteSilently(route.view ?? 'resumen');
    onClose?.();
  }
  $('#close-dialog').addEventListener('click', dismiss);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); dismiss(); });
  
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
  });
  
}
