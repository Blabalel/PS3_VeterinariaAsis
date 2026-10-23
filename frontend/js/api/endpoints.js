/**
 * API Endpoint definitions.
 * Centralized location for all API routes.
 */
import { API_ROUTES } from '../config.js';

/**
 * Default API routes used when config.js doesn't provide them.
 */
const DEFAULT_ROUTES = Object.freeze({
  login: '/api/auth/login',
  pendingCases: '/api/historial/pendientes',
  patients: '/api/pacientes/?skip=0&limit=500',
  patientDetail: (patientId) => `/api/pacientes/${patientId}`,
  patientUpdate: (patientId) => `/api/pacientes/${patientId}`,
  patientHistory: (patientId) => `/api/historial/${patientId}`,
  reviewCase: (historyId) => `/api/historial/${historyId}/revisar`,
  patientHistoryPdf: (patientId) => `/api/historial/paciente/${patientId}/pdf`,
  patientVaccinations: (patientId) => `/api/vacunacion/paciente/${patientId}`,
  vaccinationAlerts: '/api/vacunacion/alertas',
  vaccinationCreate: '/api/vacunacion/',
  vaccinationUpdate: (vaccineId) => `/api/vacunacion/${vaccineId}`,
  vaccinationDelete: (vaccineId) => `/api/vacunacion/${vaccineId}`,
});

/**
 * Merges default routes with configured routes (config takes precedence).
 */
const ROUTES = { ...DEFAULT_ROUTES };
for (const [name, value] of Object.entries(API_ROUTES ?? {})) {
  if (value !== undefined) ROUTES[name] = value;
}

export { ROUTES, DEFAULT_ROUTES };