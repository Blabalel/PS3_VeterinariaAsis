import { API_BASE_URL, API_ROUTES, MOCK_MODE } from './config.js';

const demoPhoto = new URL('../assets/mock-lesion.svg', import.meta.url).href;
const isoHoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const isoDaysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const mockPatients = [
  { id: 1, tutor_id: 11, nombre: 'Luna', especie: 'Canino', raza: 'Labrador mestiza', sexo: 'Hembra', fecha_registro: isoDaysAgo(280), tutor_nombre: 'María Fernanda Rojas' },
  { id: 2, tutor_id: 12, nombre: 'Milo', especie: 'Felino', raza: 'Doméstico de pelo corto', sexo: 'Macho', fecha_registro: isoDaysAgo(192), tutor_nombre: 'Diego Alarcón' },
  { id: 3, tutor_id: 13, nombre: 'Canela', especie: 'Canino', raza: 'Cocker spaniel', sexo: 'Hembra', fecha_registro: isoDaysAgo(120), tutor_nombre: 'Lucía Vargas' },
  { id: 4, tutor_id: 14, nombre: 'Nube', especie: 'Felino', raza: 'Mestizo', sexo: 'Hembra', fecha_registro: isoDaysAgo(44), tutor_nombre: 'Pablo Soria' },
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

async function requestJson(path, options = {}) {
  const response = await fetch(new URL(path, API_BASE_URL), {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers ?? {}) },
  });
  if (!response.ok) {
    let detail = `La API respondió con el código ${response.status}.`;
    try { detail = (await response.json()).detail ?? detail; } catch { /* Keep the status message. */ }
    throw new Error(detail);
  }
  return response.json();
}

export async function getPendingCases() {
  if (MOCK_MODE) {
    await delay();
    return mockCases.filter((item) => !item.revisado).map((item) => ({ ...item, respuestas: { ...item.respuestas } }));
  }
  return requestJson(API_ROUTES.pendingCases);
}

export async function getPatients() {
  if (MOCK_MODE) {
    await delay(120);
    return mockPatients.map((patient) => ({ ...patient }));
  }
  return requestJson(API_ROUTES.patients);
}

export async function getPatientHistory(patientId) {
  if (MOCK_MODE) {
    await delay(120);
    return mockCases.filter((item) => item.paciente_id === Number(patientId));
  }
  return requestJson(API_ROUTES.patientHistory(patientId));
}

export async function markCaseReviewed(historyId, notes) {
  if (MOCK_MODE) {
    await delay(180);
    const item = mockCases.find((record) => record.id === Number(historyId));
    if (!item) throw new Error('No encontramos este caso de demostración.');
    item.revisado = true;
    item.estado = 'revisado';
    item.notas_veterinario = notes;
    return { ...item };
  }
  return requestJson(API_ROUTES.reviewCase(historyId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'revisado', notas_veterinario: notes }),
  });
}

export async function downloadPatientPdf(patientId) {
  if (MOCK_MODE) {
    await delay(180);
    const patient = mockPatients.find((record) => record.id === Number(patientId));
    if (!patient) throw new Error('No encontramos este paciente de demostración.');
    const history = mockCases.filter((item) => item.paciente_id === patient.id);
    return {
      blob: makeDemoPdf(patient, history),
      filename: `historial-${patient.nombre.toLowerCase()}-demo.pdf`,
    };
  }
  const response = await fetch(new URL(API_ROUTES.patientHistoryPdf(patientId), API_BASE_URL), {
    headers: { Accept: 'application/pdf' },
  });
  if (!response.ok) throw new Error(`No se pudo descargar el PDF (${response.status}).`);
  return {
    blob: await response.blob(),
    filename: `historial-paciente-${patientId}.pdf`,
  };
}

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

export { MOCK_MODE };
