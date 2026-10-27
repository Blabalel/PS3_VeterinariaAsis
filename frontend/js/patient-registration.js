import { $, closeDetail, openDetail, toast } from './utils.js';
import { clinicToday } from './calendar-model.js';
import { bindClinicalForm } from './components/form.js';
import { createPatientWithTutor } from './services/patientService.js';
import { getUser } from './session.js';

export function openPatientRegistration(onSaved) {
  if (!['admin', 'veterinario'].includes(getUser()?.rol)) {
    toast('Solo el personal veterinario y los administradores pueden registrar pacientes.');
    return;
  }
  const today = clinicToday();
  if (openDetail('Nuevo paciente y tutor', 'REGISTRO EN LA CLÍNICA', `
    <p class="help-text">Completa la ficha de la mascota y los datos de su tutor. Los campos con * son obligatorios.</p>
    <form id="patient-registration-form" class="form-grid">
      <fieldset class="registration-group full"><legend>1. Datos del paciente</legend><div class="form-grid">
        <label class="form-field"><span>Nombre de la mascota *</span><input id="new-patient-name" name="nombre" maxlength="100" autocomplete="off" required></label>
        <label class="form-field"><span>Especie *</span><select id="new-patient-species" name="especie" required><option value="">Selecciona una especie</option><option>Canino</option><option>Felino</option><option>Ave</option><option>Conejo</option><option>Otro</option></select></label>
        <label class="form-field"><span>Raza</span><input id="new-patient-breed" name="raza" maxlength="50" placeholder="Ej. Mestizo"></label>
        <label class="form-field"><span>Sexo</span><select id="new-patient-sex" name="sexo"><option value="">Sin registrar</option><option>Macho</option><option>Hembra</option></select></label>
        <label class="form-field"><span>Fecha de nacimiento</span><input id="new-patient-birth" name="nacimiento" type="date" max="${today}"></label>
        <label class="form-field"><span>Peso (kg)</span><input id="new-patient-weight" name="peso" type="number" min="0.001" step="any" inputmode="decimal" placeholder="Ej. 12,5"></label>
        <label class="form-field full"><span>Alergias u observaciones sobre alergias</span><textarea id="new-patient-allergies" name="alergias" maxlength="2000" rows="2" placeholder="Dejar vacío si no hay información registrada."></textarea></label>
      </div></fieldset>
      <fieldset class="registration-group full"><legend>2. Nuevo tutor</legend><div class="form-grid">
        <label class="form-field full"><span>Nombre completo *</span><input id="new-tutor-name" name="tutor_nombre" maxlength="100" autocomplete="name" required></label>
        <label class="form-field full"><span>Correo electrónico *</span><input id="new-tutor-email" name="tutor_email" type="email" maxlength="100" autocomplete="email" aria-describedby="new-tutor-email-help" required><small class="help-text" id="new-tutor-email-help">Será el correo de acceso del tutor a la app móvil. Debe ser un correo sin registrar.</small></label>
        <label class="form-field"><span>Teléfono</span><input id="new-tutor-phone" name="tutor_telefono" type="tel" maxlength="30" autocomplete="tel"></label>
        <label class="form-field"><span>Dirección</span><input id="new-tutor-address" name="tutor_direccion" maxlength="255" autocomplete="street-address"></label>
        <label class="form-field"><span>Contraseña inicial *</span><input id="new-tutor-password" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" aria-describedby="password-help" required><small class="help-text" id="password-help">Al menos 8 caracteres. Comunica al tutor sus datos de acceso.</small></label>
        <label class="form-field"><span>Confirmar contraseña *</span><input id="new-tutor-confirm" name="password_confirm" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label>
      </div></fieldset>
      <p class="help-text full">Al guardar se crearán el tutor y el paciente vinculados. Si el correo ya está registrado, el sistema solicitará revisarlo.</p>
      <div class="form-actions full"><button type="button" class="secondary-button" id="cancel-patient-registration">Cancelar</button><button class="primary-button" type="submit">Guardar paciente y tutor</button></div>
    </form>`) === false) return;
  $('#cancel-patient-registration').addEventListener('click', closeDetail);
  const form = $('#patient-registration-form');
  const optional = (id) => $(id).value.trim() || null;
  bindClinicalForm(form, {
    'new-patient-name': (v) => !v ? 'Introduce el nombre de la mascota.' : '',
    'new-patient-species': (v) => !v ? 'Selecciona una especie.' : '',
    'new-patient-birth': (v) => v && v > clinicToday() ? 'La fecha de nacimiento no puede ser futura.' : '',
    'new-patient-weight': (v) => v && (!Number.isFinite(Number(v)) || Number(v) <= 0) ? 'Introduce un peso mayor que cero.' : '',
    'new-tutor-name': (v) => v.length < 2 ? 'Introduce el nombre completo del tutor (al menos 2 caracteres).' : '',
    'new-tutor-email': (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Introduce un correo electrónico válido.' : '',
    'new-tutor-password': () => $('#new-tutor-password').value.length < 8 ? 'La contraseña debe tener al menos 8 caracteres.' : '',
    'new-tutor-confirm': () => $('#new-tutor-confirm').value !== $('#new-tutor-password').value || !$('#new-tutor-confirm').value ? 'Las contraseñas deben coincidir.' : '',
  }, async (done) => {
    const patient = await createPatientWithTutor({
      paciente: { nombre: $('#new-patient-name').value.trim(), especie: $('#new-patient-species').value, raza: optional('#new-patient-breed'), sexo: optional('#new-patient-sex'), fecha_nacimiento: optional('#new-patient-birth'), peso_kg: optional('#new-patient-weight') === null ? null : Number($('#new-patient-weight').value), alergias: optional('#new-patient-allergies') },
      tutor: { nombre: $('#new-tutor-name').value.trim(), email: $('#new-tutor-email').value.trim().toLowerCase(), telefono: optional('#new-tutor-phone'), direccion: optional('#new-tutor-address'), password: $('#new-tutor-password').value },
    });
    done();
    $('#new-tutor-password').value = '';
    $('#new-tutor-confirm').value = '';
    closeDetail();
    window.dispatchEvent(new Event('vaccinations:changed'));
    toast('Paciente y tutor registrados correctamente.');
    try { await onSaved?.(patient); }
    catch { toast('El paciente y el tutor se guardaron. Actualiza el directorio para consultar la ficha.'); }
  });
}
