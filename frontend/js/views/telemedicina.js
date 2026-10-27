import { getPendingCases } from '../services/historialService.js';
import { $, escapeHtml as esc, formatDate, severityClass, severityLabel, severityOf } from '../utils.js';
import { reportAge } from '../calendar-model.js';
import { showCaseDetail } from './resumen.js';

let reports = [];
let initialized = false;
function renderReports() {
  const query = $('#telemedicine-search').value.trim().toLocaleLowerCase('es');
  const filtered = reports.filter((item) => `${item.paciente_nombre} ${item.motivo} ${item.tutor_nombre}`.toLocaleLowerCase('es').includes(query));
  $('#telemedicine-list').innerHTML = filtered.length ? filtered.map((item) => {
    const photos = item.fotos ?? [item.foto_url].filter(Boolean);
    const photoCount = Array.isArray(photos) ? photos.length : photos ? 1 : 0;
    const risk = severityOf(item);
    const icon = { critica: '!', moderada: '△', leve: '○' }[risk] ?? '?';
    return `<article class="telemedicine-card"><div class="report-card-head"><span class="priority ${severityClass(risk)}">${icon} ${severityLabel(risk)}</span><span class="help-text" title="${esc(formatDate(item.fecha_consulta, true))}">${esc(reportAge(item.fecha_consulta))}</span></div><h3>${esc(item.paciente_nombre ?? 'Paciente')} <small>#${esc(item.paciente_id)}</small></h3><p>${esc(item.motivo ?? 'Sin motivo registrado')}</p><div class="report-card-foot"><span class="help-text">${photoCount ? `${photoCount} fotografías adjuntas` : 'Sin fotografías adjuntas'}</span><button type="button" class="secondary-button compact-button" data-report-id="${esc(item.id)}">Revisar reporte</button></div></article>`;
  }).join('') : `<div class="empty-state"><strong>${reports.length ? 'No hay reportes con esta búsqueda' : 'No hay reportes pendientes'}</strong><p>${reports.length ? 'Prueba con otro paciente o motivo.' : 'Los nuevos reportes aparecerán aquí para su revisión.'}</p></div>`;
  $('#telemedicine-list').querySelectorAll('[data-report-id]').forEach((button) => button.addEventListener('click', () => {
    const item = reports.find((report) => String(report.id) === button.dataset.reportId);
    if (item) showCaseDetail(item, () => loadTelemedicine());
  }));
}
export async function loadTelemedicine() {
  const target = $('#telemedicine-list');
  if (!reports.length) target.innerHTML = '<p class="loading-state" role="status">Cargando reportes para revisión…</p>';
  target.setAttribute('aria-busy', 'true');
  try {
    const result = await getPendingCases();
    reports = (Array.isArray(result) ? result : result.items ?? []).sort((a, b) => {
      const order = { critica: 0, moderada: 1, leve: 2 };
      return (order[severityOf(a)] ?? 3) - (order[severityOf(b)] ?? 3) || (b.puntaje_riesgo ?? 0) - (a.puntaje_riesgo ?? 0);
    });
    renderReports();
    return true;
  } catch (error) {
    if (reports.length) renderReports(); else target.innerHTML = '';
    target.insertAdjacentHTML('afterbegin', `<div class="error-state" role="alert">No se pudieron actualizar los reportes. ${esc(error.message)} ${reports.length ? 'Los datos visibles pueden estar desactualizados.' : ''} <button id="retry-telemedicine" type="button">Reintentar</button></div>`);
    $('#retry-telemedicine').addEventListener('click', loadTelemedicine);
    return false;
  } finally { target.setAttribute('aria-busy', 'false'); }
}
export function initTelemedicine() {
  if (initialized) return;
  initialized = true;
  $('#telemedicine-search').addEventListener('input', renderReports);
}
