/**
 * Resumen view - Triaje queue dashboard.
 */
import {
  downloadPatientPdf,
  getPendingCases,
  markCaseReviewed,
  MOCK_MODE,
} from '../api.js';
import { loadPatients } from './pacientes.js';
import {
  $,
  closeDetail,
  escapeHtml,
  formatDate,
  openDetail,
  resolvePhotoUrl,
  score,
  severityClass,
  severityLabel,
  severityOf,
  toast,
  triggerDownload,
} from '../utils.js';
import { setRouteSilently } from '../router.js';

let cases = [];
let initialized = false;

function patientFor(item) {
  return {
    id: item.paciente_id ?? item.paciente?.id,
    nombre: item.paciente_nombre ?? item.paciente?.nombre ?? 'Paciente',
    especie: item.especie ?? item.paciente?.especie ?? '—',
  };
}

function tutorFor(item) {
  return item.tutor_nombre ?? item.paciente?.tutor?.nombre ?? item.tutor?.nombre ?? '—';
}

function answersFor(item) {
  const answers = item.respuestas ?? item.respuestas_cuestionario ?? {};
  if (typeof answers === 'string') {
    try { return JSON.parse(answers); } catch { return { respuestas: answers }; }
  }
  return answers && typeof answers === 'object' ? answers : {};
}

function answerLabel(key) {
  return ({
    sangrado_activo: 'Sangrado activo', apetito: 'Apetito', actividad: 'Actividad',
    temperatura_c: 'Temperatura (°C)', dolor_al_tacto: 'Dolor al tacto', observaciones: 'Observaciones',
  })[key] ?? key.replaceAll('_', ' ');
}

function answerValue(value) {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (value == null || value === '') return '—';
  const labels = {
    normal: 'Normal', reducido: 'Reduce apetito', no_come: 'No come nada',
    activo: 'Activo', aletargado: 'Aletargado', inmovil: 'Inmóvil',
  };
  return labels[value] ?? String(value);
}

function photoMarkup(item) {
  const photos = item.fotos ?? item.imagenes ?? [item.foto_url ?? item.imagen_url ?? item.url_imagen].filter(Boolean);
  const list = Array.isArray(photos) ? photos : [photos];
  return list.map((photo) => {
    const source = typeof photo === 'string' ? photo : photo?.url ?? photo?.foto_url;
    const url = resolvePhotoUrl(source);
    if (!url) return '';
    return `<a class="case-photo" href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(url)}" alt="Fotografía adjunta al reporte"></a>`;
  }).join('');
}

function detailBlock(label, value) {
  return `<div class="detail-block"><small>${escapeHtml(label)}</small><p>${escapeHtml(value || 'Sin información registrada.')}</p></div>`;
}

export async function refreshDashboard() {
  $('#cases-table').classList.remove('hidden');
  $('#cases-table').innerHTML = '<tr><td colspan="6" class="loading-cell">Cargando casos pendientes…</td></tr>';

  const [caseResult, patientCount] = await Promise.allSettled([getPendingCases(), loadPatients()]);

  if (caseResult.status === 'rejected') {
    $('#cases-table').innerHTML = `<tr><td colspan="6" class="error-state">No se pudieron cargar los casos: ${escapeHtml(caseResult.reason?.message)} <button type="button" id="retry-cases">Reintentar</button></td></tr>`;
    $('#retry-cases')?.addEventListener('click', refreshDashboard);
    toast(`No se pudieron cargar los casos: ${caseResult.reason?.message}`);
    return;
  }

  cases = Array.isArray(caseResult.value) ? caseResult.value : caseResult.value.items ?? [];
  const order = { critica: 0, moderada: 1, leve: 2 };
  cases.sort((left, right) =>
    (order[severityOf(left)] ?? 3) - (order[severityOf(right)] ?? 3) || score(right) - score(left));

  $('#stat-total').textContent = cases.length;
  $('#stat-critical').textContent = cases.filter((item) => severityOf(item) === 'critica').length;
  $('#stat-moderate').textContent = cases.filter((item) => severityOf(item) === 'moderada').length;
  $('#stat-patients').textContent = patientCount.status === 'fulfilled' ? patientCount.value : '—';
  renderCases();
}

function renderCases() {
  const query = $('#case-search').value.trim().toLocaleLowerCase('es');
  const filtered = cases.filter((item) => {
    const patient = patientFor(item);
    return `${patient.nombre} ${tutorFor(item)} ${item.motivo ?? ''}`.toLocaleLowerCase('es').includes(query);
  });

  $('#cases-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'caso pendiente' : 'casos pendientes'}`;
  $('#cases-empty').classList.toggle('hidden', filtered.length !== 0);
  $('#cases-table').classList.toggle('hidden', filtered.length === 0);

  $('#cases-table').innerHTML = filtered.map((item) => {
    const patient = patientFor(item);
    const risk = severityOf(item);
    const riskClass = severityClass(risk);
    const motive = String(item.motivo ?? item.motivo_consulta ?? '—');
    return `<tr>
      <td><div class="patient-cell"><span class="pet-avatar">♡</span><span class="patient-info"><strong>${escapeHtml(patient.nombre)}</strong><small>${escapeHtml(patient.especie)} · #${escapeHtml(patient.id)}</small></span></div></td>
      <td>${escapeHtml(tutorFor(item))}</td>
      <td title="${escapeHtml(motive)}">${escapeHtml(motive.length > 38 ? `${motive.slice(0, 38)}…` : motive)}</td>
      <td><span class="priority ${riskClass}">${severityLabel(risk)}</span></td>
      <td class="date-cell">${escapeHtml(score(item))} pts</td>
      <td><button class="row-action" data-case-id="${escapeHtml(item.id)}" aria-label="Ver detalle de ${escapeHtml(patient.nombre)}" title="Ver detalle">⋯</button></td>
    </tr>`;
  }).join('');

  $('#cases-table').querySelectorAll('[data-case-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = cases.find((record) => String(record.id) === button.dataset.caseId);
      if (!item) return;
      showCaseDetail(item);
      setRouteSilently(`caso/${item.id}`);
    });
  });
}

function showCaseDetail(item) {
  const patient = patientFor(item);
  const risk = severityOf(item);
  const answers = answersFor(item);
  const answerBlocks = Object.entries(answers)
    .map(([key, value]) => detailBlock(answerLabel(key), answerValue(value)))
    .join('');
  const photos = photoMarkup(item);

  const content = `<div class="detail-meta"><span class="priority ${severityClass(risk)}">${severityLabel(risk)}</span><span class="score-chip">${escapeHtml(score(item))} puntos de riesgo</span><span class="detail-date">${formatDate(item.fecha_consulta ?? item.fecha, true)}</span></div>
    ${detailBlock('PACIENTE', `${patient.nombre} · ${patient.especie}`)}
    ${detailBlock('TUTOR', tutorFor(item))}
    ${detailBlock('MOTIVO', item.motivo ?? item.motivo_consulta)}
    ${Object.keys(answers).length ? `<h3 class="detail-section-title">Respuestas del cuestionario</h3>${answerBlocks}` : '<div class="detail-block"><small>CUESTIONARIO</small><p>No hay respuestas registradas.</p></div>'}
    ${photos ? `<h3 class="detail-section-title">Fotografías adjuntas</h3><div class="case-photos">${photos}</div>` : ''}
    <label class="notes-label" for="vet-notes">Notas del veterinario</label>
    <textarea id="vet-notes" rows="4" maxlength="2000" placeholder="Escribe tus observaciones de revisión…">${escapeHtml(item.notas_veterinario ?? '')}</textarea>
    <div class="detail-actions"><button class="secondary-button" id="download-pdf">Descargar Historial Clínico (PDF)</button><button class="primary-button" id="mark-reviewed">Marcar como Revisado</button></div>`;

  openDetail('Detalle del caso', `CASO #${item.id}`, content);
  $('#download-pdf').addEventListener('click', () => downloadPdf(patient.id));
  $('#mark-reviewed').addEventListener('click', () => reviewCase(item.id));
}

export function openCaseById(caseId) {
  const item = cases.find((record) => String(record.id) === String(caseId));
  if (item) showCaseDetail(item);
}

async function reviewCase(historyId) {
  const button = $('#mark-reviewed');
  button.disabled = true;
  button.textContent = 'Guardando…';
  try {
    await markCaseReviewed(historyId, {
      estado: 'revisado',
      notas_veterinario: $('#vet-notes').value.trim(),
    });
    closeDetail();
    setRouteSilently('resumen');
    toast('Caso marcado como revisado.');
    await refreshDashboard();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Marcar como Revisado';
    toast(`No se pudo actualizar el caso: ${error.message}`);
  }
}

async function downloadPdf(patientId) {
  const button = $('#download-pdf');
  if (button) { button.disabled = true; button.textContent = 'Preparando PDF…'; }
  try {
    triggerDownload(await downloadPatientPdf(patientId));
    toast(MOCK_MODE ? 'PDF de demostración descargado.' : 'Historial clínico descargado.');
  } catch (error) {
    toast(`No se pudo descargar el PDF: ${error.message}`);
  } finally {
    if (button?.isConnected) { button.disabled = false; button.textContent = 'Descargar Historial Clínico (PDF)'; }
  }
}

export function initResumen() {
  if (initialized) return;
  initialized = true;
  $('#case-search').addEventListener('input', renderCases);
}