// true = demo local sin backend; false = usa la API real en el mismo origen.
const MOCK_MODE = false;
const API_BASE_URL = window.VET_API_BASE_URL || window.location.origin;

const API_ROUTES = Object.freeze({
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

export { MOCK_MODE, API_BASE_URL, API_ROUTES };
