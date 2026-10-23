/**
 * Table utilities for rendering data tables.
 */
import { $ } from '../utils.js';

/**
 * Renders a loading state in a table.
 * @param {string} tableId - Table body element ID
 * @param {string} message - Loading message
 */
export function renderLoading(tableId, message = 'Cargando…') {
  const tbody = $(`#${tableId}`);
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">${message}</td></tr>`;
}

/**
 * Renders an error state in a table.
 * @param {string} tableId - Table body element ID
 * @param {string} message - Error message
 * @param {Function} onRetry - Retry callback
 */
export function renderError(tableId, message, onRetry) {
  const tbody = $(`#${tableId}`);
  if (!tbody) return;
  const retryBtn = onRetry ? '<button type="button" class="retry-button">Reintentar</button>' : '';
  tbody.innerHTML = `<tr><td colspan="6" class="error-state">${message} ${retryBtn}</td></tr>`;
  if (onRetry) {
    tbody.querySelector('.retry-button')?.addEventListener('click', onRetry);
  }
}

/**
 * Renders an empty state in a table.
 * @param {string} tableId - Table body element ID
 * @param {string} emptyId - Empty state element ID
 * @param {number} count - Number of items (0 = show empty)
 */
export function toggleEmptyState(tableId, emptyId, count) {
  const tbody = $(`#${tableId}`);
  const empty = $(`#${emptyId}`);
  if (tbody) tbody.classList.toggle('hidden', count === 0);
  if (empty) empty.classList.toggle('hidden', count !== 0);
}

/**
 * Updates a count display element.
 * @param {string} countId - Count element ID
 * @param {number} count - Count value
 * @param {Object} labels - { singular, plural } label strings
 */
export function updateCount(countId, count, labels) {
  const element = $(`#${countId}`);
  if (!element) return;
  element.textContent = `${count} ${count === 1 ? labels.singular : labels.plural}`;
}

/**
 * Creates a row action button.
 * @param {string} dataAttribute - Data attribute name (e.g., 'case-id')
 * @param {string} value - Data attribute value
 * @param {string} ariaLabel - ARIA label
 * @param {string} title - Tooltip title
 * @param {string} icon - Button icon/content
 * @returns {string} HTML for the button
 */
export function createRowAction(dataAttribute, value, ariaLabel, title, icon = '⋯') {
  return `<button class="row-action" data-${dataAttribute}="${value}" aria-label="${ariaLabel}" title="${title}">${icon}</button>`;
}