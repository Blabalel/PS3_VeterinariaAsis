/**
 * Vaccine action dialogs - Apply and Schedule vaccination dialogs.
 * Uses the new service layer for API calls.
 */
import {
  createVaccination,
  getPatients,
  updateVaccination,
} from './services/index.js';
import {
  $,
  closeDetail,
  escapeHtml,
  formatDate,
  openDetail,
  toast,
} from './utils.js';

function localDateValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function todayValue() {
  return localDateValue(new Date());
}

function dateValueIn(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateValue(date);
}

export function openApplyVaccineDialog(item, onSaved, { closeOnSave = true } = {}) {
  const content = `
    <div class="detail-block">
      <small>REFUERZO</small>
      <p><strong>${escapeHtml(item.nombre_vacuna)}</strong> · ${escapeHtml(item.paciente_nombre ?? 'Paciente')}</p>
      <p>Fecha programada: ${formatDate(item.fecha_programada)}</p>
    </div>
    <form id="apply-vaccine-form" class="form-grid">
      <label class="form-field"><span>Fecha de aplicación</span><input id="apply-date" type="date" value="${todayValue()}" required></label>
      <label class="form-field"><span>Lote</span><input id="apply-lote" type="text" maxlength="50" placeholder="Ej. L-2026-014"></label>
      <label class="form-field full"><span>Notas</span><textarea id="apply-notes" rows="3" maxlength="1000" placeholder="Observaciones de la aplicación…">${escapeHtml(item.notas ?? '')}</textarea></label>
      <div class="form-actions full">
        <button class="secondary-button" type="button" id="cancel-apply">Cancelar</button>
        <button class="primary-button" type="submit" id="save-apply">Registrar aplicación</button>
      </div>
    </form>`;

  openDetail('Registrar aplicación', `VACUNA #${item.id}`, content);
  $('#cancel-apply').addEventListener('click', closeDetail);
  $('#apply-vaccine-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const dateInput = $('#apply-date');
    if (!dateInput.value) {
      toast('Selecciona la fecha de aplicación.');
      dateInput.focus();
      return;
    }

    const button = $('#save-apply');
    button.disabled = true;
    button.textContent = 'Guardando…';
    try {
      await updateVaccination(item.id, {
        estado: 'aplicada',
        fecha_aplicada: new Date(`${dateInput.value}T12:00:00`).toISOString(),
        lote: $('#apply-lote').value.trim() || null,
        notas: $('#apply-notes').value.trim() || null,
      });
      if (closeOnSave) closeDetail();
      toast('Aplicación registrada correctamente.');
      await onSaved?.();
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Registrar aplicación';
      toast(`No se pudo registrar la aplicación: ${error.message}`);
    }
  });
}

export async function openScheduleVaccineDialog({ patientId = null, patientName = null, onSaved, closeOnSave = true } = {}) {
  let patients = [];
  if (!patientId) {
    try {
      const result = await getPatients();
      patients = Array.isArray(result) ? result : result.items ?? [];
    } catch (error) {
      toast(`No se pudieron cargar los pacientes: ${error.message}`);
      return;
    }
    if (!patients.length) {
      toast('No hay pacientes registrados para programar un refuerzo.');
      return;
    }
  }

  const patientField = patientId
    ? `<div class="detail-block"><small>PACIENTE</small><p><strong>${escapeHtml(patientName ?? 'Paciente')}</strong> · #${escapeHtml(patientId)}</p></div>`
    : `<label class="form-field full"><span>Paciente</span><select id="vaccine-patient">${patients
        .map((patient) => `<option value="${escapeHtml(patient.id)}">${escapeHtml(patient.nombre)} · ${escapeHtml(patient.tutor_nombre ?? 'Tutor')} (#${escapeHtml(patient.id)})</option>`)
        .join('')}</select></label>`;

  const content = `
    <form id="new-vaccine-form" class="form-grid">
      ${patientField}
      <label class="form-field"><span>Vacuna</span><input id="vaccine-name" type="text" maxlength="100" placeholder="Ej. Rabia" list="vaccine-suggestions" required><datalist id="vaccine-suggestions"><option value="Rabia"><option value="Séxtuple canina"><option value="Triple felina"><option value="Leucemia felina"><option value="Parvovirus"><option value="Bordetella"></datalist></label>
      <label class="form-field"><span>Fecha programada</span><input id="vaccine-date" type="date" value="${dateValueIn(30)}" required></label>
      <label class="form-field full"><span>Notas</span><textarea id="vaccine-notes" rows="3" maxlength="1000" placeholder="Indicaciones o recordatorio para el tutor…"></textarea></label>
      <div class="form-actions full">
        <button class="secondary-button" type="button" id="cancel-new-vaccine">Cancelar</button>
        <button class="primary-button" type="submit" id="save-new-vaccine">Programar refuerzo</button>
      </div>
    </form>`;

  openDetail('Programar refuerzo', 'NUEVA VACUNA', content);
  $('#cancel-new-vaccine').addEventListener('click', closeDetail);
  $('#new-vaccine-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = $('#vaccine-name').value.trim();
    const date = $('#vaccine-date').value;
    if (!name || !date) {
      toast('Completa el nombre de la vacuna y la fecha.');
      return;
    }

    const selectedPatientId = patientId ?? Number($('#vaccine-patient').value);
    const button = $('#save-new-vaccine');
    button.disabled = true;
    button.textContent = 'Guardando…';
    try {
      await createVaccination({
        paciente_id: selectedPatientId,
        nombre_vacuna: name,
        fecha_programada: new Date(`${date}T12:00:00`).toISOString(),
        estado: 'programada',
        notas: $('#vaccine-notes').value.trim() || null,
      });
      if (closeOnSave) closeDetail();
      toast('Refuerzo programado correctamente.');
      await onSaved?.();
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Programar refuerzo';
      toast(`No se pudo programar el refuerzo: ${error.message}`);
    }
  });
}