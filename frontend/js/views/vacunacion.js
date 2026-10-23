/**
 * Vacunación view - Vaccination calendar and alerts.
 */
import { deleteVaccination, getVaccinationAlerts } from '../api.js';
import {
  $,
  escapeHtml,
  formatDate,
  toast,
  vaccineStatusClass,
  vaccineStatusLabel,
} from '../utils.js';
import {
  openApplyVaccineDialog,
  openScheduleVaccineDialog,
} from '../vaccine-actions.js';

let alerts = [];
let initialized = false;

function relativeDays(item) {
  const days = item.dias_restantes;
  if (days === null || days === undefined) return '';
  if (days === 0) return 'Hoy';
  if (days < 0) {
    const count = Math.abs(days);
    return `Hace ${count} ${count === 1 ? 'día' : 'días'}`;
  }
  return `En ${days} ${days === 1 ? 'día' : 'días'}`;
}

function renderVaccinations() {
  const query = $('#vaccine-search').value.trim().toLocaleLowerCase('es');
  const filtered = alerts.filter((item) =>
    `${item.paciente_nombre} ${item.tutor_nombre} ${item.especie} ${item.nombre_vacuna}`
      .toLocaleLowerCase('es')
      .includes(query));

  $('#vaccines-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'refuerzo' : 'refuerzos'} en seguimiento`;
  $('#vaccines-empty').classList.toggle('hidden', filtered.length !== 0);
  $('#vaccines-table').classList.toggle('hidden', filtered.length === 0);

  $('#vaccines-table').innerHTML = filtered.map((item) => {
    const status = vaccineStatusClass(item.estado_visual);
    const relative = relativeDays(item);
    return `
      <tr>
        <td>
          <div class="patient-cell">
            <span class="pet-avatar">♡</span>
            <span class="patient-info">
              <strong>${escapeHtml(item.paciente_nombre)}</strong>
              <small>${escapeHtml(item.especie)} · #${escapeHtml(item.paciente_id)}</small>
            </span>
          </div>
        </td>
        <td>${escapeHtml(item.tutor_nombre)}</td>
        <td>${escapeHtml(item.nombre_vacuna)}</td>
        <td class="date-cell">
          ${formatDate(item.fecha_programada)}
          ${relative ? `<small class="date-relative">${escapeHtml(relative)}</small>` : ''}
        </td>
        <td><span class="vaccine-status ${status}">${vaccineStatusLabel(item.estado_visual)}</span></td>
        <td>
          <div class="row-actions">
            <button class="secondary-button table-action" data-apply-id="${escapeHtml(item.id)}" type="button">Aplicar</button>
            <button class="row-delete" data-delete-id="${escapeHtml(item.id)}" type="button" aria-label="Eliminar refuerzo" title="Eliminar refuerzo">×</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  $('#vaccines-table').querySelectorAll('[data-apply-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = alerts.find((record) => String(record.id) === button.dataset.applyId);
      if (item) openApplyVaccineDialog(item, loadVaccinations);
    });
  });

  $('#vaccines-table').querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', () => removeVaccine(button.dataset.deleteId));
  });
}

export async function loadVaccinations() {
  $('#vaccines-table').classList.remove('hidden');
  $('#vaccines-table').innerHTML = '<tr><td colspan="6" class="loading-cell">Cargando calendario de vacunación…</td></tr>';

  try {
    const result = await getVaccinationAlerts();
    alerts = Array.isArray(result) ? result : result.items ?? [];

    const overdue = alerts.filter((item) => item.estado_visual === 'vencida').length;
    const soon = alerts.filter((item) => item.estado_visual === 'proxima').length;
    const scheduled = alerts.filter((item) => item.estado_visual === 'programada').length;

    $('#vaccine-overdue').textContent = overdue;
    $('#vaccine-soon').textContent = soon;
    $('#vaccine-scheduled').textContent = scheduled;
    $('#vaccine-total').textContent = alerts.length;
    renderVaccinations();
    return alerts.length;
  } catch (error) {
    $('#vaccines-table').innerHTML = `<tr><td colspan="6" class="error-state">No se pudo cargar el calendario: ${escapeHtml(error.message)} <button type="button" id="retry-vaccines">Reintentar</button></td></tr>`;
    $('#retry-vaccines')?.addEventListener('click', loadVaccinations);
    $('#vaccines-count').textContent = 'Error al cargar';
    toast(`No se pudo cargar el calendario: ${error.message}`);
    return 0;
  }
}

async function removeVaccine(vaccineId) {
  if (!window.confirm('¿Eliminar este refuerzo del calendario?')) return;
  try {
    await deleteVaccination(vaccineId);
    toast('Refuerzo eliminado.');
    await loadVaccinations();
  } catch (error) {
    toast(`No se pudo eliminar el refuerzo: ${error.message}`);
  }
}

export function initVacunacion() {
  if (initialized) return;
  initialized = true;
  $('#vaccine-search').addEventListener('input', renderVaccinations);
  $('#new-vaccine-button').addEventListener('click', () => {
    openScheduleVaccineDialog({ onSaved: loadVaccinations });
  });
}