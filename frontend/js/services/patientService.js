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
  const patients = [];
  const seen = new Set();
  for (let skip = 0; ; skip += 500) {
    const url = new URL(ROUTES.patients, window.location.origin);
    url.searchParams.set('skip', skip);
    url.searchParams.set('limit', 500);
    const result = await requestJson(url.pathname + url.search);
    const batch = Array.isArray(result) ? result : result.items ?? [];
    for (const patient of batch) {
      if (seen.has(patient.id)) throw new Error('No se pudo completar el directorio de pacientes. Reintenta la carga.');
      seen.add(patient.id);
      patients.push(patient);
    }
    if (batch.length < 500) return patients;
  }
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

/** Register both entities atomically; passwords are never stored in browser storage. */
export async function createPatientWithTutor(payload) {
  if (MOCK_MODE) return mockApi.createPatientWithTutor(payload);
  return requestJson('/api/pacientes/registro-con-tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export { ROUTES };