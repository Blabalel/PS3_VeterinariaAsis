/**
 * Toast notification component.
 */
import { $ } from '../utils.js';

let toastTimer;

/**
 * Shows a toast notification.
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export function toast(message, duration = 4000) {
  const element = $('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.add('hidden'), duration);
}

/**
 * Hides the toast notification.
 */
export function hideToast() {
  const element = $('#toast');
  if (!element) return;
  element.classList.add('hidden');
  clearTimeout(toastTimer);
}