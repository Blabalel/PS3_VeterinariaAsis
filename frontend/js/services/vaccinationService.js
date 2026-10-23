/**
 * Vaccination Service - API calls related to vaccinations.
 */
import { requestJson, mockApi } from '../api/client.js';
import { ROUTES } from '../api/endpoints.js';
import { MOCK_MODE } from '../config.js';

/**
 * Fetches vaccination alerts (all pending vaccinations).
 * @returns {Promise<Array>} List of vaccination alerts
 */
export async function getVaccinationAlerts() {
  if (MOCK_MODE) return mockApi.getVaccinationAlerts();
  return requestJson(ROUTES.vaccinationAlerts);
}

/**
 * Fetches vaccinations for a specific patient.
 * @param {number} patientId - Patient ID
 * @returns {Promise<Array>} Patient vaccinations
 */
export async function getPatientVaccinations(patientId) {
  if (MOCK_MODE) return mockApi.getPatientVaccinations(patientId);
  const result = await requestJson(ROUTES.patientVaccinations(patientId));
  return Array.isArray(result) ? result : result.items ?? [];
}

/**
 * Creates a new vaccination.
 * @param {Object} payload - Vaccination data
 * @returns {Promise<Object>} Created vaccination
 */
export async function createVaccination(payload) {
  if (MOCK_MODE) return mockApi.createVaccination(payload);
  return requestJson(ROUTES.vaccinationCreate, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Updates a vaccination.
 * @param {number} vaccineId - Vaccination ID
 * @param {Object} payload - Update data
 * @returns {Promise<Object>} Updated vaccination
 */
export async function updateVaccination(vaccineId, payload) {
  if (MOCK_MODE) return mockApi.updateVaccination(vaccineId, payload);
  return requestJson(ROUTES.vaccinationUpdate(vaccineId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Deletes a vaccination.
 * @param {number} vaccineId - Vaccination ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteVaccination(vaccineId) {
  if (MOCK_MODE) return mockApi.deleteVaccination(vaccineId);
  return requestJson(ROUTES.vaccinationDelete(vaccineId), { method: 'DELETE' });
}

export { ROUTES };