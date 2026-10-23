/**
 * Patient Service - API calls related to patients.
 */
import { requestJson, mockApi } from '../api/client.js';
import { ROUTES } from '../api/endpoints.js';
import { MOCK_MODE } from '../config.js';

/**
 * Fetches all patients.
 * @returns {Promise<Array>} List of patients
 */
export async function getPatients() {
  if (MOCK_MODE) return mockApi.getPatients();
  return requestJson(ROUTES.patients);
}

/**
 * Fetches a single patient by ID.
 * @param {number} patientId - Patient ID
 * @returns {Promise<Object>} Patient detail with tutor info
 */
export async function getPatientDetail(patientId) {
  if (MOCK_MODE) return mockApi.getPatientDetail(patientId);
  return requestJson(ROUTES.patientDetail(patientId));
}

/**
 * Updates a patient.
 * @param {number} patientId - Patient ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated patient
 */
export async function updatePatient(patientId, data) {
  if (MOCK_MODE) {
    // In mock mode, just return the data as if it was updated
    return { id: patientId, ...data };
  }
  return requestJson(ROUTES.patientUpdate(patientId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Fetches patient history (clinical cases).
 * @param {number} patientId - Patient ID
 * @returns {Promise<Array>} Patient history
 */
export async function getPatientHistory(patientId) {
  if (MOCK_MODE) return mockApi.getPatientHistory(patientId);
  return requestJson(ROUTES.patientHistory(patientId));
}

export { ROUTES };