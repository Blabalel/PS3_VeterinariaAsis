// Keep MOCK_MODE enabled to demo the frontend without PostgreSQL/FastAPI data routes.
const MOCK_MODE = true;
const API_BASE_URL = window.VET_API_BASE_URL || window.location.origin;

const API_ROUTES = Object.freeze({
  pendingCases: '/api/historial/pendientes',
  patients: '/api/pacientes/?skip=0&limit=500',
  patientHistory: (patientId) => `/api/historial/${patientId}`,
  reviewCase: (historyId) => `/api/historial/${historyId}/revisar`,
  patientHistoryPdf: (patientId) => `/api/historial/paciente/${patientId}/pdf`,
});

export { MOCK_MODE, API_BASE_URL, API_ROUTES };
