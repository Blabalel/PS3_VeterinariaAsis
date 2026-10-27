/**
 * Resumen view - Triaje queue dashboard.
 */
import {
  downloadPatientPdf,
  getPendingCases,
  getPatientHistory,
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
import { reportAge } from '../calendar-model.js';
import { setDetailDirty, setDetailBusy } from '../utils.js';

let cases = [];
let initialized = false;
let afterReview = null;

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
  $('#cases-empty').classList.add('hidden');
  $('#cases-table').classList.remove('hidden');
  $('#queue-error')?.remove();
  if (!cases.length) $('#cases-table').innerHTML = '<tr><td colspan="6" class="loading-cell">Cargando casos pendientes…</td></tr>';
  $('#summary-view').setAttribute('aria-busy', 'true');

  const [caseResult, patientCount] = await Promise.allSettled([getPendingCases(), loadPatients()]);

  if (caseResult.status === 'rejected') {
    if (cases.length) renderCases(); else $('#cases-table').innerHTML = '';
    $('.cases-card', $('#summary-view')).insertAdjacentHTML('afterbegin', `<div id="queue-error" class="error-state" role="alert">No se pudieron actualizar los casos. ${escapeHtml(caseResult.reason?.message)} ${cases.length ? 'Los casos visibles pueden estar desactualizados.' : ''} <button type="button" id="retry-cases">Reintentar</button></div>`);
    $('#retry-cases').addEventListener('click', refreshDashboard);
    $('#summary-view').setAttribute('aria-busy', 'false');
    return false;
  }

  cases = Array.isArray(caseResult.value) ? caseResult.value : caseResult.value.items ?? [];
  const order = { critica: 0, moderada: 1, leve: 2 };
  cases.sort((left, right) =>
    (order[severityOf(left)] ?? 3) - (order[severityOf(right)] ?? 3) || score(right) - score(left));

  $('#stat-total').textContent = cases.length;
  $('#stat-critical').textContent = cases.filter((item) => severityOf(item) === 'critica').length;
  $('#stat-moderate').textContent = cases.filter((item) => severityOf(item) === 'moderada').length;
  $('#stat-patients').textContent = patientCount.status === 'fulfilled' && patientCount.value !== null ? patientCount.value : '—';
  renderCases();
  $('#summary-view').setAttribute('aria-busy', 'false');
  return true;
}

function renderCases() {
  const query = $('#case-search').value.trim().toLocaleLowerCase('es');
  const filtered = cases.filter((item) => {
    const patient = patientFor(item);
    const priority = $('#case-priority').value;
    return (!priority || severityOf(item) === priority) && `${patient.nombre} ${tutorFor(item)} ${item.motivo ?? ''}`.toLocaleLowerCase('es').includes(query);
  });

  const hiddenCritical = cases.filter((item) => severityOf(item) === 'critica').length - filtered.filter((item) => severityOf(item) === 'critica').length;
  $('#critical-filter-warning').classList.toggle('hidden', !hiddenCritical);
  $('#critical-filter-warning').textContent = hiddenCritical ? `Hay ${hiddenCritical} ${hiddenCritical === 1 ? 'caso crítico fuera' : 'casos críticos fuera'} de estos filtros. Limpia la búsqueda y selecciona Todas las prioridades para verlos.` : '';
  $('#cases-empty strong').textContent = cases.length ? 'No hay casos con estos filtros' : 'No hay casos pendientes';
  $('#cases-empty p').textContent = cases.length ? 'Prueba con otro nombre o selecciona otra prioridad.' : 'Los nuevos reportes aparecerán aquí para su revisión.';
  $('#cases-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'caso pendiente' : 'casos pendientes'}`;
  $('#cases-empty').classList.toggle('hidden', filtered.length !== 0);
  $('#cases-table').classList.toggle('hidden', filtered.length === 0);

  $('#cases-table').innerHTML = filtered.map((item) => {
    const patient = patientFor(item);
    const risk = severityOf(item);
    const riskClass = severityClass(risk);
    const motive = String(item.motivo ?? item.motivo_consulta ?? '—');
    return `<tr class="${risk === 'critica' ? 'queue-row-critical' : ''}">
      <td><span class="priority ${riskClass}"><span aria-hidden="true">${({ critica: '!', moderada: '△', leve: '○' })[risk] ?? '?'}</span> ${severityLabel(risk)}</span></td>
      <td><div class="patient-cell"><span class="patient-info"><strong>${escapeHtml(patient.nombre)}</strong><small>${escapeHtml(patient.especie)} · #${escapeHtml(patient.id)}</small><small>${escapeHtml(tutorFor(item))}</small></span></div></td>
      <td class="queue-motive">${escapeHtml(motive)}</td>
      <td class="date-cell"><strong data-report-date="${escapeHtml(item.fecha_consulta ?? item.fecha ?? '')}">${escapeHtml(reportAge(item.fecha_consulta ?? item.fecha))}</strong><small>${formatDate(item.fecha_consulta ?? item.fecha, true)}</small></td>
      <td class="date-cell">${escapeHtml(score(item))} pts</td>
      <td><button class="secondary-button table-action" data-case-id="${escapeHtml(item.id)}" aria-label="Revisar caso de ${escapeHtml(patient.nombre)}">Revisar caso</button></td>
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

export function showCaseDetail(item, onReviewed = null) {
  afterReview = onReviewed;
  const patient = patientFor(item);
  const risk = severityOf(item);
  const answers = answersFor(item);
  const answerBlocks = Object.entries(answers)
    .map(([key, value]) => detailBlock(answerLabel(key), answerValue(value)))
    .join('');
  const photos = photoMarkup(item);

  const content = `<div class="detail-meta"><span class="priority ${severityClass(risk)}">${({ critica: '!', moderada: '△', leve: '○' })[risk] ?? '?'} ${severityLabel(risk)}</span><span class="score-chip">${escapeHtml(score(item))} puntos de riesgo</span><span class="detail-date">${formatDate(item.fecha_consulta ?? item.fecha, true)}</span></div>
    ${detailBlock('PACIENTE', `${patient.nombre} · ${patient.especie}`)}
    ${detailBlock('TUTOR', tutorFor(item))}
    ${detailBlock('MOTIVO', item.motivo ?? item.motivo_consulta)}
    ${Object.keys(answers).length ? `<h3 class="detail-section-title">Respuestas del cuestionario</h3>${answerBlocks}` : '<div class="detail-block"><small>CUESTIONARIO</small><p>No hay respuestas registradas.</p></div>'}
    ${photos ? `<h3 class="detail-section-title">Fotografías adjuntas</h3><div class="case-photos">${photos}</div>` : ''}
    <label class="notes-label" for="vet-notes">Notas del veterinario</label>
    <textarea id="vet-notes" aria-describedby="notes-help" rows="4" maxlength="2000" placeholder="Escribe tus observaciones de revisión…">${escapeHtml(item.notas_veterinario ?? '')}</textarea>
    <p class="help-text" id="notes-help">Las notas se guardan al confirmar la revisión del caso.</p><p class="form-error hidden" id="review-error" role="alert"></p><div class="detail-actions"><button class="secondary-button" id="case-history" type="button" aria-expanded="false" aria-controls="case-history-preview">Ver historial</button><button class="secondary-button" id="download-pdf">Descargar Historial Clínico (PDF)</button><button class="primary-button" id="mark-reviewed">Guardar revisión</button></div><section class="hidden" id="case-history-preview" aria-label="Historial del paciente"></section>`;

  if (openDetail('Revisar reporte', `CASO #${item.id}`, content) === false) return;
  $('#case-history').addEventListener('click', async () => {
    const target = $('#case-history-preview');
    const button = $('#case-history');
    const visible = target.classList.toggle('hidden') === false;
    button.setAttribute('aria-expanded', String(visible));
    if (!visible) return;
    target.innerHTML = '<p class="loading-state" role="status">Cargando historial…</p>';
    try {
      const result = await getPatientHistory(patient.id);
      if (!target.isConnected) return;
      const records = Array.isArray(result) ? result : result.items ?? [];
      target.innerHTML = records.length ? `<h3>Historial clínico</h3>${records.map((record) => `<article class="detail-block"><small>${formatDate(record.fecha_consulta, true)}</small><p>${escapeHtml(record.motivo)}</p>${record.notas_veterinario ? `<p>${escapeHtml(record.notas_veterinario)}</p>` : ''}</article>`).join('')}` : '<p>Sin consultas registradas.</p>';
    } catch {
      if (target.isConnected) target.innerHTML = '<p class="form-error" role="alert">No se pudo cargar el historial. Tus notas se conservan. Vuelve a pulsar Ver historial para reintentar.</p>';
    }
  });
  $('#vet-notes').addEventListener('input', () => setDetailDirty($('#vet-notes').value !== (item.notas_veterinario ?? '')));
  $('#download-pdf').addEventListener('click', () => downloadPdf(patient.id));
  $('#mark-reviewed').addEventListener('click', () => reviewCase(item.id));
}

export function openCaseById(caseId) {
  const item = cases.find((record) => String(record.id) === String(caseId));
  if (item) showCaseDetail(item);
}

async function reviewCase(historyId) {
  const button = $('#mark-reviewed');
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = 'Guardando…';
  setDetailBusy(true);
  $('#vet-notes').disabled = true;
  $('#review-error').classList.add('hidden');
  try {
    await markCaseReviewed(historyId, {
      estado: 'revisado',
      notas_veterinario: $('#vet-notes').value.trim(),
    });
    setDetailDirty(false);
    setDetailBusy(false);
    closeDetail();
    if (!afterReview) setRouteSilently('resumen');
    toast('Revisión guardada correctamente.');
    if (afterReview) await afterReview(); else await refreshDashboard();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Guardar revisión';
    $('#review-error').textContent = `No se pudo guardar la revisión. ${error.message} Tus notas se conservan; puedes reintentar.`;
    $('#review-error').classList.remove('hidden');
  } finally {
    setDetailBusy(false);
    if ($('#vet-notes')) $('#vet-notes').disabled = false;
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
  $('#case-priority').addEventListener('change', renderCases);
  setInterval(() => {
    if (!document.hidden) document.querySelectorAll('[data-report-date]').forEach((node) => { node.textContent = reportAge(node.dataset.reportDate); });
  }, 60000);
}
