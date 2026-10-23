/**
 * HTTP Client wrapper for API requests.
 * Handles authentication headers, error handling, and MOCK_MODE.
 */
import { API_BASE_URL, API_ROUTES, MOCK_MODE } from '../config.js';
import { authHeaders, clearSession } from '../session.js';
import { ageFromBirthDate } from '../utils.js';

/**
 * Fallback routes in case config.js is cached with old routes.
 */
const FALLBACK_ROUTES = Object.freeze({
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

// Merge fallback routes with configured routes (config takes precedence)
const ROUTES = { ...FALLBACK_ROUTES };
for (const [name, value] of Object.entries(API_ROUTES ?? {})) {
  if (value !== undefined) ROUTES[name] = value;
}

const demoPhoto = new URL('../assets/mock-lesion.svg', import.meta.url).href;
const isoHoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const isoDaysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const isoDaysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

/**
 * Builds an absolute URL for an API path.
 */
export function apiUrl(path) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new Error('La ruta de la API no está configurada. Recarga el panel con Ctrl+Shift+R.');
  }
  return new URL(path, API_BASE_URL);
}

/**
 * Performs a JSON request with authentication and error handling.
 */
export async function requestJson(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      Accept: 'application/json',
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `La API respondió con el código ${response.status}.`;
    try { detail = (await response.json()).detail ?? detail; } catch { /* Keep the status message. */ }

    // Un 401 en el login significa credenciales incorrectas, no sesión expirada.
    const isLoginRequest = String(path).includes('/auth/login');
    if (response.status === 401 && !isLoginRequest) {
      redirectToLogin();
      detail = 'Tu sesión expiró. Inicia sesión nuevamente.';
    }
    throw new Error(detail);
  }
  return response.json();
}

/**
 * Redirects to login page when session expires.
 */
function redirectToLogin() {
  clearSession();
  const loginUrl = new URL('login.html', API_BASE_URL);
  loginUrl.searchParams.set('expired', '1');
  if (!window.location.pathname.endsWith('/login.html') && !window.location.pathname.endsWith('/login')) {
    window.location.replace(loginUrl);
  }
}

/**
 * Mock data for development/demo mode.
 */
const mockPatients = [
  { id: 1, tutor_id: 11, nombre: 'Luna', especie: 'Canino', raza: 'Labrador mestiza', sexo: 'Hembra', fecha_registro: isoDaysAgo(280), fecha_nacimiento: isoDaysAgo(1020), peso_kg: 28.4, alergias: 'Ninguna conocida', tutor_nombre: 'María Fernanda Rojas', tutor_email: 'maria.rojas@example.com', tutor_telefono: '70123456', tutor_direccion: 'Av. América #123, Cochabamba' },
  { id: 2, tutor_id: 12, nombre: 'Milo', especie: 'Felino', raza: 'Doméstico de pelo corto', sexo: 'Macho', fecha_registro: isoDaysAgo(192), fecha_nacimiento: isoDaysAgo(720), peso_kg: 4.8, alergias: 'Alergia a la proteína de pollo', tutor_nombre: 'Diego Alarcón', tutor_email: 'diego.alarcon@example.com', tutor_telefono: '71234567', tutor_direccion: 'Calle Sucre #45, Cochabamba' },
  { id: 3, tutor_id: 13, nombre: 'Canela', especie: 'Canino', raza: 'Cocker spaniel', sexo: 'Hembra', fecha_registro: isoDaysAgo(120), fecha_nacimiento: isoDaysAgo(540), peso_kg: 12.1, alergias: 'Sensibilidad cutánea estacional', tutor_nombre: 'Lucía Vargas', tutor_email: 'lucia.vargas@example.com', tutor_telefono: '72345678', tutor_direccion: 'Av. Villazón #890, Cochabamba' },
  { id: 4, tutor_id: 14, nombre: 'Nube', especie: 'Felino', raza: 'Mestizo', sexo: 'Hembra', fecha_registro: isoDaysAgo(44), fecha_nacimiento: isoDaysAgo(240), peso_kg: 3.6, alergias: null, tutor_nombre: 'Pablo Soria', tutor_email: 'pablo.soria@example.com', tutor_telefono: '73456789', tutor_direccion: 'Calle Junín #234, Cochabamba' },
];

const mockVaccinations = [
  { id: 501, paciente_id: 1, nombre_vacuna: 'Séxtuple canina', fecha_programada: isoDaysAgo(365), estado: 'aplicada', fecha_aplicada: isoDaysAgo(365), lote: 'L-2025-001', notas: 'Refuerzo anual.' },
  { id: 502, paciente_id: 1, nombre_vacuna: 'Rabia', fecha_programada: isoDaysFromNow(-12), estado: 'programada', fecha_aplicada: null, lote: null, notas: null },
  { id: 503, paciente_id: 2, nombre_vacuna: 'Triple felina', fecha_programada: isoDaysAgo(365), estado: 'aplicada', fecha_aplicada: isoDaysAgo(365), lote: 'L-2025-002', notas: null },
  { id: 504, paciente_id: 2, nombre_vacuna: 'Triple felina', fecha_programada: isoDaysFromNow(9), estado: 'programada', fecha_aplicada: null, lote: null, notas: null },
  { id: 505, paciente_id: 3, nombre_vacuna: 'Rabia', fecha_programada: isoDaysAgo(365), estado: 'aplicada', fecha_aplicada: isoDaysAgo(365), lote: 'L-2025-003', notas: null },
  { id: 506, paciente_id: 3, nombre_vacuna: 'Séxtuple canina', fecha_programada: isoDaysFromNow(70), estado: 'programada', fecha_aplicada: null, lote: null, notas: null },
  { id: 507, paciente_id: 4, nombre_vacuna: 'Triple felina', fecha_programada: isoDaysAgo(365), estado: 'aplicada', fecha_aplicada: isoDaysAgo(365), lote: 'L-2025-004', notas: null },
  { id: 508, paciente_id: 4, nombre_vacuna: 'Leucemia felina', fecha_programada: isoDaysFromNow(-5), estado: 'programada', fecha_aplicada: null, lote: null, notas: null },
];

const mockCases = [
  {
    id: 9001, paciente_id: 1, paciente_nombre: 'Luna', especie: 'Canino', tutor_nombre: 'María Fernanda Rojas',
    motivo: 'Herida profunda en la pata trasera con sangrado persistente.', fecha_consulta: isoHoursAgo(1),
    nivel_gravedad: 'critica', puntaje_riesgo: 94, estado: 'pendiente', revisado: false,
    respuestas: { sangrado_activo: true, apetito: 'no_come', actividad: 'inmovil', temperatura_c: 40.2, dolor_al_tacto: true, observaciones: 'Corte en la almohadilla. El sangrado no se ha detenido desde hace unos 20 minutos.' },
    fotos: [demoPhoto], notas_veterinario: '',
  },
  {
    id: 9002, paciente_id: 2, paciente_nombre: 'Milo', especie: 'Felino', tutor_nombre: 'Diego Alarcón',
    motivo: 'Está decaído y come menos desde ayer.', fecha_consulta: isoHoursAgo(5),
    nivel_gravedad: 'moderada', puntaje_riesgo: 56, estado: 'pendiente', revisado: false,
    respuestas: { sangrado_activo: false, apetito: 'reducido', actividad: 'aletargado', temperatura_c: 39.3, dolor_al_tacto: false, observaciones: 'Toma agua, pero dejó parte de su comida y está menos activo.' },
    fotos: [], notas_veterinario: '',
  },
  {
    id: 9003, paciente_id: 3, paciente_nombre: 'Canela', especie: 'Canino', tutor_nombre: 'Lucía Vargas',
    motivo: 'Irritación leve entre los dedos después del paseo.', fecha_consulta: isoHoursAgo(9),
    nivel_gravedad: 'leve', puntaje_riesgo: 12, estado: 'pendiente', revisado: false,
    respuestas: { sangrado_activo: false, apetito: 'normal', actividad: 'activo', temperatura_c: 38.5, dolor_al_tacto: false, observaciones: 'Pequeña irritación; come y juega con normalidad.' },
    fotos: [], notas_veterinario: '',
  },
];

const delay = (milliseconds = 160) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function decorateMockVaccine(vaccine) {
  let visual = 'programada';
  if (vaccine.estado === 'cancelada') visual = 'cancelada';
  else if (vaccine.estado === 'aplicada' || vaccine.fecha_aplicada) visual = 'aplicada';
  else if (vaccine.fecha_programada) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(vaccine.fecha_programada);
    target.setHours(0, 0, 0, 0);
    const days = Math.round((target - today) / (24 * 60 * 60 * 1000));
    visual = days < 0 ? 'vencida' : days <= 30 ? 'proxima' : 'programada';
  }
  const target = vaccine.fecha_programada ? new Date(vaccine.fecha_programada) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (target) target.setHours(0, 0, 0, 0);
  return {
    ...vaccine,
    estado_visual: visual,
    dias_restantes: target ? Math.round((target - today) / (24 * 60 * 60 * 1000)) : null,
  };
}

function mockPatientDetail(patient) {
  return {
    ...patient,
    tutor: {
      id: patient.tutor_id,
      nombre: patient.tutor_nombre,
      email: patient.tutor_email,
      telefono: patient.tutor_telefono,
      direccion: patient.tutor_direccion,
    },
    edad: patient.fecha_nacimiento ? { texto: ageFromBirthDate(patient.fecha_nacimiento) } : null,
  };
}

/**
 * Mock API implementations for development mode.
 * These mirror the real API functions but use local mock data.
 */
export const mockApi = {
  async getPendingCases() {
    await delay();
    return mockCases.filter((item) => !item.revisado).map((item) => ({ ...item, respuestas: { ...item.respuestas } }));
  },

  async getPatients() {
    await delay(120);
    return mockPatients.map((patient) => ({ ...patient }));
  },

  async getPatientHistory(patientId) {
    await delay(120);
    return mockCases.filter((item) => item.paciente_id === Number(patientId));
  },

  async getPatientDetail(patientId) {
    await delay(120);
    const patient = mockPatients.find((item) => item.id === Number(patientId));
    if (!patient) throw new Error('No encontramos este paciente de demostración.');
    return mockPatientDetail(patient);
  },

  async getPatientVaccinations(patientId) {
    await delay(120);
    return mockVaccinations
      .filter((item) => item.paciente_id === Number(patientId))
      .map(decorateMockVaccine);
  },

  async getVaccinationAlerts() {
    await delay(120);
    return mockVaccinations
      .map(decorateMockVaccine)
      .filter((item) => !['aplicada', 'cancelada'].includes(item.estado_visual))
      .map((item) => {
        const patient = mockPatients.find((record) => record.id === item.paciente_id);
        return {
          ...item,
          paciente_nombre: patient?.nombre ?? 'Desconocido',
          especie: patient?.especie ?? '—',
          tutor_nombre: patient?.tutor_nombre ?? 'Desconocido',
          tutor_telefono: patient?.tutor_telefono ?? null,
        };
      });
  },

  async createVaccination(payload) {
    await delay(180);
    const id = Math.max(0, ...mockVaccinations.map((item) => item.id)) + 1;
    const vaccine = {
      id,
      estado: 'programada',
      fecha_aplicada: null,
      lote: null,
      notas: null,
      ...payload,
    };
    mockVaccinations.push(vaccine);
    return decorateMockVaccine(vaccine);
  },

  async updateVaccination(vaccineId, payload) {
    await delay(160);
    const vaccine = mockVaccinations.find((item) => item.id === Number(vaccineId));
    if (!vaccine) throw new Error('No encontramos esta vacuna de demostración.');
    Object.assign(vaccine, payload);
    if (payload.estado === 'aplicada' && !vaccine.fecha_aplicada) {
      vaccine.fecha_aplicada = new Date().toISOString();
    }
    if (payload.estado === 'programada') vaccine.fecha_aplicada = null;
    return decorateMockVaccine(vaccine);
  },

  async deleteVaccination(vaccineId) {
    await delay(140);
    const index = mockVaccinations.findIndex((item) => item.id === Number(vaccineId));
    if (index < 0) throw new Error('No encontramos esta vacuna de demostración.');
    mockVaccinations.splice(index, 1);
    return { mensaje: 'Vacuna eliminada correctamente.' };
  },

  async markCaseReviewed(historyId, notes) {
    await delay(180);
    const item = mockCases.find((record) => record.id === Number(historyId));
    if (!item) throw new Error('No encontramos este caso de demostración.');
    item.revisado = true;
    item.estado = 'revisado';
    item.notas_veterinario = notes;
    return { ...item };
  },

  async downloadPatientPdf(patientId) {
    await delay(180);
    const patient = mockPatients.find((record) => record.id === Number(patientId));
    if (!patient) throw new Error('No encontramos este paciente de demostración.');
    const history = mockCases.filter((item) => item.paciente_id === patient.id);
    return {
      blob: makeDemoPdf(patient, history),
      filename: `historial-${patient.nombre.toLowerCase()}-demo.pdf`,
    };
  },
};

// Demo PDF generation (used by mockApi)
function pdfText(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/[\\()]/g, '\\$&');
}

function makeDemoPdf(patient, history) {
  const lines = [
    'VETERINARIA SAN FRANCISCO DE ASIS',
    'Historial clinico (reporte de demostracion)',
    `Paciente: ${patient.nombre} | ${patient.especie} | ${patient.raza}`,
    `Tutor: ${patient.tutor_nombre}`,
    `Generado: ${new Date().toLocaleString('es-BO')}`,
    '',
    ...history.flatMap((item, index) => [
      `Caso ${index + 1}: ${item.nivel_gravedad.toUpperCase()} - ${item.puntaje_riesgo} puntos`,
      `Fecha: ${new Date(item.fecha_consulta).toLocaleString('es-BO')}`,
      `Motivo: ${item.motivo}`,
      `Observaciones: ${item.respuestas.observaciones}`,
      `Notas veterinario: ${item.notas_veterinario || 'Sin notas registradas'}`,
      '',
    ]),
    'Documento generado localmente en modo de demostracion.',
  ];
  const commands = lines.map((line, index) =>
    `BT /F1 ${index < 2 ? 14 : 10} Tf 48 ${748 - index * 24} Td (${pdfText(line)}) Tj ET`,
  ).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

// Re-export for backward compatibility.
// apiUrl y requestJson ya se exportan en sus declaraciones; repetirlos aquí
// provoca "Duplicate export" y el navegador rechaza cargar todo el módulo.
export { MOCK_MODE, ROUTES, redirectToLogin };