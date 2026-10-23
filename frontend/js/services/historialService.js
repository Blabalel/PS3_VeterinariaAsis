/**
 * Historial Service - API calls related to clinical history/triaje.
 */
import { requestJson, apiUrl, mockApi, redirectToLogin } from '../api/client.js';
import { ROUTES } from '../api/endpoints.js';
import { MOCK_MODE } from '../config.js';
import { authHeaders } from '../session.js';

/**
 * Fetches pending cases (triaje queue).
 * @returns {Promise<Array>} List of pending cases
 */
export async function getPendingCases() {
  if (MOCK_MODE) return mockApi.getPendingCases();
  return requestJson(ROUTES.pendingCases);
}

/**
 * Marks a case as reviewed.
 * @param {number} historyId - History/Case ID
 * @param {Object} data - Review data { estado, notas_veterinario }
 * @returns {Promise<Object>} Updated case
 */
export async function markCaseReviewed(historyId, data) {
  if (MOCK_MODE) return mockApi.markCaseReviewed(historyId, data.notas_veterinario);
  return requestJson(ROUTES.reviewCase(historyId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Downloads patient PDF.
 * @param {number} patientId - Patient ID
 * @returns {Promise<Object>} { blob, filename }
 */
export async function downloadPatientPdf(patientId) {
  if (MOCK_MODE) return mockApi.downloadPatientPdf(patientId);
  const response = await fetch(apiUrl(ROUTES.patientHistoryPdf(patientId)), {
    headers: authHeaders({ Accept: 'application/pdf' }),
  });
  if (response.status === 401) {
    redirectToLogin();
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }
  if (!response.ok) throw new Error(`No se pudo descargar el PDF (${response.status}).`);
  return {
    blob: await response.blob(),
    filename: `historial-paciente-${patientId}.pdf`,
  };
}

export { ROUTES };