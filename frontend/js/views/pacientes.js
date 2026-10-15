import { downloadPatientPdf, getPatientHistory, getPatients } from '../api.js';

const $ = (selector) => document.querySelector(selector);
let patients = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function showToast(message) {
  window.dispatchEvent(new CustomEvent('vet:toast', { detail: message }));
}

function triggerDownload({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderPatients() {
  const query = $('#patient-search').value.trim().toLocaleLowerCase('es');
  const filtered = patients.filter((patient) =>
    `${patient.nombre} ${patient.especie} ${patient.raza ?? ''} ${patient.tutor_nombre ?? ''}`.toLocaleLowerCase('es').includes(query));
  $('#patients-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'paciente' : 'pacientes'}`;
  $('#patients-empty').classList.toggle('hidden', filtered.length !== 0);
  $('#patients-table').classList.toggle('hidden', filtered.length === 0);
  $('#patients-table').innerHTML = filtered.map((patient) => `
    <tr>
      <td><div class="patient-cell"><span class="pet-avatar">♡</span><span class="patient-info"><strong>${escapeHtml(patient.nombre)}</strong><small>${escapeHtml(patient.tutor_nombre ?? 'Tutor')} · #${escapeHtml(patient.id)}</small></span></div></td>
      <td>${escapeHtml(patient.especie)}</td><td>${escapeHtml(patient.raza || '—')}</td>
      <td>${escapeHtml(patient.sexo || '—')}</td><td class="date-cell">${formatDate(patient.fecha_registro)}</td>
      <td><button class="row-action" data-patient-id="${escapeHtml(patient.id)}" aria-label="Ver historial de ${escapeHtml(patient.nombre)}" title="Ver historial">⋯</button></td>
    </tr>`).join('');
  $('#patients-table').querySelectorAll('[data-patient-id]').forEach((button) => {
    button.addEventListener('click', () => showPatientHistory(patients.find((item) => String(item.id) === button.dataset.patientId)));
  });
}

async function showPatientHistory(patient) {
  if (!patient) return;
  $('#detail-title').textContent = patient.nombre;
  $('#detail-kicker').textContent = `HISTORIAL · PACIENTE #${patient.id}`;
  $('#detail-content').innerHTML = '<div class="dialog-body"><p class="loading-cell">Cargando historial…</p></div>';
  $('#detail-dialog').showModal();
  try {
    const records = await getPatientHistory(patient.id);
    const history = Array.isArray(records) ? records : records.items ?? [];
    const body = history.length ? history.map((record) => `
      <article class="detail-block">
        <div class="detail-meta"><span class="priority ${escapeHtml(record.nivel_gravedad)}">${escapeHtml(record.nivel_gravedad)}</span><span class="score-chip">${escapeHtml(record.puntaje_riesgo ?? 0)} puntos</span></div>
        <small>${formatDate(record.fecha_consulta)}</small>
        <p>${escapeHtml(record.motivo)}</p>
        ${record.respuestas?.observaciones ? `<p>${escapeHtml(record.respuestas.observaciones)}</p>` : ''}
        ${record.notas_veterinario ? `<small>NOTAS DEL VETERINARIO</small><p>${escapeHtml(record.notas_veterinario)}</p>` : ''}
      </article>`).join('')
      : '<div class="empty-state"><span>♡</span><strong>Sin consultas registradas</strong><p>Este paciente aún no tiene entradas en su historial.</p></div>';
    $('#detail-content').innerHTML = `<div class="dialog-body"><div class="detail-actions"><button class="primary-button" id="download-patient-pdf">Descargar Historial Clínico (PDF)</button></div>${body}</div>`;
    $('#download-patient-pdf').addEventListener('click', async () => {
      const button = $('#download-patient-pdf');
      button.disabled = true;
      try {
        triggerDownload(await downloadPatientPdf(patient.id));
        showToast('PDF de demostración descargado.');
      } catch (error) {
        showToast(`No se pudo descargar el PDF: ${error.message}`);
      } finally {
        button.disabled = false;
      }
    });
  } catch (error) {
    $('#detail-content').innerHTML = `<div class="dialog-body"><div class="error-state">No se pudo cargar el historial: ${escapeHtml(error.message)}</div></div>`;
  }
}

export async function loadPatients() {
  try {
    const result = await getPatients();
    patients = Array.isArray(result) ? result : result.items ?? [];
    renderPatients();
    return patients.length;
  } catch (error) {
    $('#patients-table').innerHTML = `<tr><td colspan="6" class="error-state">No se pudieron cargar los pacientes: ${escapeHtml(error.message)}</td></tr>`;
    $('#patients-count').textContent = 'Error al cargar';
    showToast(`No se pudieron cargar los pacientes: ${error.message}`);
    return 0;
  }
}

export function initPacientes() {
  $('#patient-search').addEventListener('input', renderPatients);
}
