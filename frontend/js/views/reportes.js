import { getPatients } from '../services/patientService.js';
import { downloadPatientPdf } from '../services/historialService.js';
import { $, escapeHtml as esc, triggerDownload } from '../utils.js';

let selected = '';
export async function loadReports() {
  const root = $('#reports-content');
  root.innerHTML = '<p class="loading-state" role="status">Cargando pacientes para generar el historial…</p>';
  try {
    const patients = await getPatients();
    if (!patients.length) { root.innerHTML = '<div class="empty-state"><strong>No hay pacientes registrados</strong><p>Los historiales PDF estarán disponibles cuando existan pacientes en el directorio.</p></div>'; return true; }
    root.innerHTML = `<form id="report-form"><label class="filter-field">Paciente<select id="report-patient" required><option value="">Selecciona un paciente</option>${patients.map((patient) => `<option value="${esc(patient.id)}">${esc(patient.nombre)} · ${esc(patient.especie)} · #${esc(patient.id)}</option>`).join('')}</select></label><p class="help-text">Incluye las consultas y notas que el servicio de historial incorpora al PDF.</p><button class="primary-button compact-button" type="submit" id="generate-report">Descargar historial PDF</button><p id="report-status" role="status"></p></form>`;
    if (patients.some((p) => String(p.id) === selected)) $('#report-patient').value = selected;
    $('#report-patient').addEventListener('change', () => { selected = $('#report-patient').value; });
    $('#report-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = $('#generate-report');
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Preparando PDF…';
      $('#report-status').textContent = 'Generando el historial del paciente. Espera un momento.';
      try {
        triggerDownload(await downloadPatientPdf($('#report-patient').value));
        if ($('#report-status')) $('#report-status').textContent = 'Historial descargado correctamente.';
      } catch (error) {
        if ($('#report-status')) $('#report-status').textContent = `No se pudo generar el PDF. ${error.message} Puedes reintentar.`;
      } finally {
        if (button.isConnected) { button.disabled = false; button.textContent = 'Descargar historial PDF'; }
      }
    });
    return true;
  } catch (error) {
    root.innerHTML = `<div class="error-state" role="alert">No se pudo cargar el directorio. ${esc(error.message)} <button id="retry-reports" type="button">Reintentar</button></div>`;
    $('#retry-reports').addEventListener('click', loadReports);
    return false;
  }
}
