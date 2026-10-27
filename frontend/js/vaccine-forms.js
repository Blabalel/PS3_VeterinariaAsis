import { createVaccination, getPatients, updateVaccination } from './services/index.js';
import { $, closeDetail, escapeHtml as esc, formatDate, openDetail, toast } from './utils.js';
import { addDays, clinicToday, dateKey, scheduledISO } from './calendar-model.js';
import { bindClinicalForm } from './components/form.js';

function actions(label) {
  return `<p class="help-text full">Los campos con * son obligatorios. El registro se guarda al confirmar.</p><div class="form-actions full"><button class="secondary-button" type="button" id="cancel-vaccine">Cancelar</button><button class="primary-button" type="submit">${label}</button></div>`;
}
function bindCancel() { $('#cancel-vaccine').addEventListener('click', closeDetail); }
async function saved(done, message, onSaved, closeOnSave) {
  done();
  window.dispatchEvent(new Event('vaccinations:changed'));
  if (closeOnSave) closeDetail();
  toast(message);
  // A refresh failure must not imply that a successful write failed.
  try { await onSaved?.(); } catch { toast('El cambio se guardó, pero no se pudo actualizar la vista. Pulsa Actualizar.'); }
}

export function openApplyVaccineDialog(item, onSaved, { closeOnSave = true } = {}) {
  const today = clinicToday();
  if (openDetail('Registrar aplicación', `VACUNA #${item.id}`, `
    <div class="detail-block"><strong>${esc(item.paciente_nombre ?? 'Paciente')} · ${esc(item.nombre_vacuna)}</strong><p>Programada: ${formatDate(item.fecha_programada)}</p></div>
    <form id="apply-vaccine-form" class="form-grid">
      <label class="form-field"><span>Fecha de aplicación *</span><input id="apply-date" name="fecha" type="date" value="${today}" max="${today}" required></label>
      <label class="form-field"><span>Lote</span><input id="apply-lote" name="lote" maxlength="50" value="${esc(item.lote ?? '')}" placeholder="Ej. L-2026-014"></label>
      <label class="form-field full"><span>Observaciones</span><textarea id="apply-notes" name="notas" rows="3" maxlength="1000">${esc(item.notas ?? '')}</textarea></label>${actions('Confirmar aplicación')}
    </form>`) === false) return;
  bindCancel();
  bindClinicalForm($('#apply-vaccine-form'), {
    'apply-date': (value) => !value ? 'Selecciona la fecha de aplicación.' : value > today ? 'La fecha de aplicación no puede ser futura.' : '',
  }, async (done) => {
    await updateVaccination(item.id, { estado: 'aplicada', fecha_aplicada: scheduledISO($('#apply-date').value), lote: $('#apply-lote').value.trim() || null, notas: $('#apply-notes').value.trim() || null });
    await saved(done, 'Aplicación registrada correctamente.', onSaved, closeOnSave);
  });
}

export async function openScheduleVaccineDialog({ patientId = null, patientName = null, onSaved, closeOnSave = true } = {}) {
  let patients = [];
  if (!patientId) {
    try { patients = await getPatients(); }
    catch (error) { toast(`No se pudo cargar el directorio. ${error.message}`); return; }
    if (!patients.length) { toast('No hay pacientes registrados. Registra un paciente antes de programar una vacuna.'); return; }
  }
  const patient = patientId
    ? `<div class="detail-block full"><strong>${esc(patientName ?? 'Paciente')} · #${esc(patientId)}</strong></div>`
    : `<label class="form-field full"><span>Paciente *</span><select id="vaccine-patient" name="paciente" required><option value="">Selecciona un paciente</option>${patients.map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)} · ${esc(p.especie)} · #${esc(p.id)}</option>`).join('')}</select></label>`;
  if (openDetail('Programar refuerzo', 'VACUNACIÓN', `<form id="new-vaccine-form" class="form-grid">${patient}
    <label class="form-field"><span>Vacuna *</span><input id="vaccine-name" name="vacuna" maxlength="100" list="vaccine-suggestions" placeholder="Ej. Rabia" required><datalist id="vaccine-suggestions"><option value="Rabia"><option value="Séxtuple canina"><option value="Triple felina"><option value="Leucemia felina"><option value="Parvovirus"><option value="Bordetella"></datalist></label>
    <label class="form-field"><span>Fecha programada *</span><input id="vaccine-date" name="fecha" type="date" min="${clinicToday()}" required></label>
    <p class="help-text full">Elige la fecha según la valoración veterinaria. No se calcula automáticamente un intervalo de refuerzo.</p>
    <label class="form-field full"><span>Observaciones</span><textarea id="vaccine-notes" name="notas" rows="3" maxlength="1000" placeholder="Registra la dosis o el refuerzo si se conoce y las observaciones clínicas."></textarea></label>${actions('Programar refuerzo')}</form>`) === false) return;
  bindCancel();
  const validators = {
    'vaccine-name': (value) => !value ? 'Introduce el nombre de la vacuna.' : '',
    'vaccine-date': (value) => !value ? 'Selecciona la fecha programada.' : value < clinicToday() ? 'Selecciona hoy o una fecha futura.' : '',
  };
  if (!patientId) validators['vaccine-patient'] = (value) => !value ? 'Selecciona un paciente.' : '';
  bindClinicalForm($('#new-vaccine-form'), validators, async (done) => {
    await createVaccination({ paciente_id: patientId ?? Number($('#vaccine-patient').value), nombre_vacuna: $('#vaccine-name').value.trim(), fecha_programada: scheduledISO($('#vaccine-date').value), estado: 'programada', notas: $('#vaccine-notes').value.trim() || null });
    await saved(done, 'Refuerzo programado correctamente.', onSaved, closeOnSave);
  });
}

export function openRescheduleVaccineDialog(item, onSaved) {
  const today = clinicToday();
  if (openDetail('Reprogramar refuerzo', `VACUNA #${item.id}`, `<div class="detail-block"><strong>${esc(item.paciente_nombre)} · ${esc(item.nombre_vacuna)}</strong><p>Fecha actual: ${formatDate(item.fecha_programada)}</p></div>
    <form id="reschedule-form" class="form-grid"><label class="form-field full"><span>Nueva fecha *</span><input id="reschedule-date" name="fecha" type="date" min="${today}" value="${dateKey(item.fecha_programada) >= today ? dateKey(item.fecha_programada) : addDays(today, 1)}" required></label><label class="form-field full"><span>Observaciones</span><textarea id="reschedule-notes" name="notas" maxlength="1000" rows="3">${esc(item.notas ?? '')}</textarea></label>${actions('Confirmar nueva fecha')}</form>`) === false) return;
  bindCancel();
  bindClinicalForm($('#reschedule-form'), {
    'reschedule-date': (value) => !value ? 'Selecciona la nueva fecha.' : value < clinicToday() ? 'Selecciona hoy o una fecha futura.' : '',
  }, async (done) => {
    await updateVaccination(item.id, { fecha_programada: scheduledISO($('#reschedule-date').value), estado: 'programada', notas: $('#reschedule-notes').value.trim() || null });
    await saved(done, 'Refuerzo reprogramado correctamente.', onSaved, true);
  });
}
