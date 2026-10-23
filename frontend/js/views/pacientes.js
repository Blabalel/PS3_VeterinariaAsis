/**
 * Pacientes view - Patient directory and detail.
 */
import {
  deleteVaccination,
  downloadPatientPdf,
  getPatientDetail,
  getPatientHistory,
  getPatientVaccinations,
  getPatients,
  MOCK_MODE,
} from '../api.js';
import {
  $,
  ageFromBirthDate,
  escapeHtml,
  formatDate,
  initials,
  openDetail,
  resolvePhotoUrl,
  severityClass,
  severityLabel,
  severityOf,
  toast,
  triggerDownload,
  vaccineStatusClass,
  vaccineStatusLabel,
} from '../utils.js';
import { setRouteSilently } from '../router.js';
import {
  openApplyVaccineDialog,
  openScheduleVaccineDialog,
} from '../vaccine-actions.js';

let patients = [];
let initialized = false;
let activePatientTab = 'consultas';

function normalizeList(result) {
  if (Array.isArray(result)) return result;
  return result?.items ?? [];
}

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
      <td><button class="row-action" data-patient-id="${escapeHtml(patient.id)}" aria-label="Ver ficha de ${escapeHtml(patient.nombre)}" title="Ver ficha">⋯</button></td>
    </tr>`).join('');

  $('#patients-table').querySelectorAll('[data-patient-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const patient = patients.find((item) => String(item.id) === button.dataset.patientId);
      if (!patient) return;
      showPatientDetail(patient);
      setRouteSilently(`pacientes/${patient.id}`);
    });
  });
}

function photoMarkup(detail) {
  const url = resolvePhotoUrl(detail.foto_url);
  if (url) {
    return `<img class="profile-photo" src="${escapeHtml(url)}" alt="Foto de ${escapeHtml(detail.nombre)}">`;
  }
  return `<span class="profile-avatar">${escapeHtml(initials(detail.nombre))}</span>`;
}

function historyMarkup(history) {
  if (!history.length) {
    return '<div class="empty-state"><span>♡</span><strong>Sin consultas registradas</strong><p>Este paciente aún no tiene entradas en su historial.</p></div>';
  }

  return `<div class="consultation-list">${history.map((record) => {
    const risk = severityOf(record);
    return `
      <article class="detail-block">
        <div class="detail-meta">
          <span class="priority ${severityClass(risk)}">${severityLabel(risk)}</span>
          <span class="score-chip">${escapeHtml(record.puntaje_riesgo ?? 0)} puntos</span>
          ${record.estado ? `<span class="score-chip">${escapeHtml(record.estado)}</span>` : ''}
        </div>
        <small>${formatDate(record.fecha_consulta ?? record.fecha, true)}</small>
        <p>${escapeHtml(record.motivo)}</p>
        ${record.respuestas?.observaciones ? `<p>${escapeHtml(record.respuestas.observaciones)}</p>` : ''}
        ${record.notas_veterinario ? `<small>NOTAS DEL VETERINARIO</small><p>${escapeHtml(record.notas_veterinario)}</p>` : ''}
      </article>`;
  }).join('')}</div>`;
}

function vaccineMarkup(item) {
  const visual = item.estado_visual ?? item.estado ?? 'programada';
  const status = vaccineStatusClass(visual);
  const relative = relativeDays(item);
  const canApply = !['aplicada', 'cancelada'].includes(visual);
  return `
    <article class="vaccine-item">
      <div class="vaccine-item-main">
        <div class="vaccine-item-title">
          <strong>${escapeHtml(item.nombre_vacuna)}</strong>
          <span class="vaccine-status ${status}">${vaccineStatusLabel(visual)}</span>
        </div>
        <small class="vaccine-meta">Programada: ${formatDate(item.fecha_programada)}${relative ? ` · ${escapeHtml(relative)}` : ''}</small>
        ${item.fecha_aplicada ? `<small class="vaccine-meta">Aplicada: ${formatDate(item.fecha_aplicada)}${item.lote ? ` · Lote ${escapeHtml(item.lote)}` : ''}</small>` : ''}
        ${item.notas ? `<p class="vaccine-notes">${escapeHtml(item.notas)}</p>` : ''}
      </div>
      <div class="vaccine-item-actions">
        ${canApply ? `<button class="secondary-button table-action" data-apply-vaccine="${escapeHtml(item.id)}" type="button">Aplicar</button>` : ''}
        <button class="row-delete" data-delete-vaccine="${escapeHtml(item.id)}" type="button" aria-label="Eliminar vacuna" title="Eliminar vacuna">×</button>
      </div>
    </article>`;
}

function renderPatientTab(detail, history, vaccinations) {
  document.querySelectorAll('[data-patient-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.patientTab === activePatientTab);
  });

  const container = $('#patient-tab-content');
  if (!container) return;

  if (activePatientTab === 'vacunas') {
    container.innerHTML = `
      <div class="tab-toolbar">
        <p>${vaccinations.length} ${vaccinations.length === 1 ? 'vacuna registrada' : 'vacunas registradas'} en la ficha.</p>
        <button class="primary-button compact-button" id="schedule-patient-vaccine" type="button">＋ Programar refuerzo</button>
      </div>
      ${vaccinations.length
        ? `<div class="vaccine-list">${vaccinations.map(vaccineMarkup).join('')}</div>`
        : '<div class="empty-state compact-empty"><span>✚</span><strong>Sin vacunas registradas</strong><p>Programa el primer refuerzo de este paciente.</p></div>'}`;

    $('#schedule-patient-vaccine')?.addEventListener('click', () => {
      openScheduleVaccineDialog({
        patientId: detail.id,
        patientName: detail.nombre,
        onSaved: () => reloadPatient(detail),
        closeOnSave: false,
      });
    });

    container.querySelectorAll('[data-apply-vaccine]').forEach((button) => {
      button.addEventListener('click', () => {
        const vaccine = vaccinations.find((item) => String(item.id) === button.dataset.applyVaccine);
        if (!vaccine) return;
        openApplyVaccineDialog(
          { ...vaccine, paciente_nombre: detail.nombre },
          () => reloadPatient(detail),
          { closeOnSave: false },
        );
      });
    });

    container.querySelectorAll('[data-delete-vaccine]').forEach((button) => {
      button.addEventListener('click', () => removePatientVaccine(button.dataset.deleteVaccine, detail));
    });
    return;
  }

  container.innerHTML = historyMarkup(history);
}

function bindPdfButton(detail) {
  $('#download-patient-pdf')?.addEventListener('click', async () => {
    const button = $('#download-patient-pdf');
    button.disabled = true;
    button.textContent = 'Preparando…';
    try {
      triggerDownload(await downloadPatientPdf(detail.id));
      toast(MOCK_MODE ? 'PDF de demostración descargado.' : 'Historial clínico descargado.');
    } catch (error) {
      toast(`No se pudo descargar el PDF: ${error.message}`);
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = 'PDF';
      }
    }
  });
}

function renderPatientDialog(detail, history, vaccinations) {
  const tutor = detail.tutor ?? {};
  $('#detail-title').textContent = detail.nombre;
  $('#detail-kicker').textContent = `FICHA · PACIENTE #${detail.id}`;
  const age = detail.edad?.texto || ageFromBirthDate(detail.fecha_nacimiento) || 'Edad no registrada';
  const weight = detail.peso_kg !== null && detail.peso_kg !== undefined ? `${detail.peso_kg} kg` : 'Peso no registrado';
  const subtitle = [detail.especie, detail.raza, detail.sexo].filter(Boolean).map((value) => escapeHtml(value)).join(' · ') || 'Sin datos clínicos';

  $('#detail-content').innerHTML = `
    <div class="dialog-body patient-profile">
      <div class="profile-hero">
        ${photoMarkup(detail)}
        <div class="profile-main">
          <div class="profile-title-row"><h3>${escapeHtml(detail.nombre)}</h3><span class="score-chip">#${escapeHtml(detail.id)}</span></div>
          <p class="profile-subtitle">${subtitle}</p>
          <div class="profile-chips">
            <span class="profile-chip">${escapeHtml(age)}</span>
            <span class="profile-chip">${escapeHtml(weight)}</span>
            <span class="profile-chip">${escapeHtml(tutor.nombre ?? 'Sin tutor')}</span>
          </div>
        </div>
        <div class="profile-actions"><button class="secondary-button compact-button" id="download-patient-pdf" type="button">PDF</button></div>
      </div>

      <div class="profile-grid">
        <article class="profile-card">
          <small>TUTOR</small>
          <strong>${escapeHtml(tutor.nombre ?? 'Sin tutor registrado')}</strong>
          <p>${escapeHtml(tutor.email ?? 'Sin correo')}</p>
          <p>${escapeHtml(tutor.telefono ?? 'Sin teléfono')}</p>
          <p>${escapeHtml(tutor.direccion ?? 'Sin dirección')}</p>
        </article>
        <article class="profile-card">
          <small>ALERGIAS</small>
          <p class="allergy-text">${escapeHtml(detail.alergias?.trim() || 'Ninguna registrada')}</p>
        </article>
        <article class="profile-card">
          <small>NACIMIENTO</small>
          <p>${escapeHtml(formatDate(detail.fecha_nacimiento))}</p>
          <small>REGISTRO</small>
          <p>${escapeHtml(formatDate(detail.fecha_registro))}</p>
        </article>
      </div>

      <div class="detail-tabs" role="tablist" aria-label="Ficha del paciente">
        <button class="detail-tab" data-patient-tab="consultas" type="button">Consultas <span>${history.length}</span></button>
        <button class="detail-tab" data-patient-tab="vacunas" type="button">Vacunas <span>${vaccinations.length}</span></button>
      </div>
      <div id="patient-tab-content"></div>
    </div>`;

  bindPdfButton(detail);
  document.querySelectorAll('[data-patient-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activePatientTab = button.dataset.patientTab;
      renderPatientTab(detail, history, vaccinations);
    });
  });
  renderPatientTab(detail, history, vaccinations);
}

async function fetchPatientBundle(patient) {
  const [detailResult, historyResult, vaccinesResult] = await Promise.allSettled([
    getPatientDetail(patient.id),
    getPatientHistory(patient.id),
    getPatientVaccinations(patient.id),
  ]);

  if (detailResult.status === 'rejected') throw detailResult.reason;

  const errors = [];
  if (historyResult.status === 'rejected') errors.push('consultas');
  if (vaccinesResult.status === 'rejected') errors.push('vacunas');

  return {
    detail: detailResult.value,
    history: historyResult.status === 'fulfilled' ? normalizeList(historyResult.value) : [],
    vaccinations: vaccinesResult.status === 'fulfilled' ? normalizeList(vaccinesResult.value) : [],
    errors,
  };
}

async function showPatientDetail(patient) {
  activePatientTab = 'consultas';
  openDetail(patient.nombre, `FICHA · PACIENTE #${patient.id}`, '<p class="loading-cell">Cargando ficha del paciente…</p>');

  try {
    const bundle = await fetchPatientBundle(patient);
    renderPatientDialog(bundle.detail, bundle.history, bundle.vaccinations);
    if (bundle.errors.length) {
      toast(`No se pudieron cargar: ${bundle.errors.join(', ')}.`);
    }
  } catch (error) {
    $('#detail-content').innerHTML = `<div class="dialog-body"><div class="error-state">No se pudo cargar la ficha: ${escapeHtml(error.message)} <button type="button" id="retry-patient">Reintentar</button></div></div>`;
    $('#retry-patient')?.addEventListener('click', () => showPatientDetail(patient));
  }
}

async function reloadPatient(detail) {
  try {
    const bundle = await fetchPatientBundle(detail);
    renderPatientDialog(bundle.detail, bundle.history, bundle.vaccinations);
    if (bundle.errors.length) {
      toast(`No se pudieron cargar: ${bundle.errors.join(', ')}.`);
    }
  } catch (error) {
    toast(`No se pudo actualizar la ficha: ${error.message}`);
  }
}

async function removePatientVaccine(vaccineId, detail) {
  if (!window.confirm('¿Eliminar esta vacuna de la ficha del paciente?')) return;
  try {
    await deleteVaccination(vaccineId);
    toast('Vacuna eliminada.');
    await reloadPatient(detail);
  } catch (error) {
    toast(`No se pudo eliminar la vacuna: ${error.message}`);
  }
}

export async function loadPatients() {
  try {
    $('#patients-table').classList.remove('hidden');
    const result = await getPatients();
    patients = normalizeList(result);
    renderPatients();
    return patients.length;
  } catch (error) {
    $('#patients-table').innerHTML = `<tr><td colspan="6" class="error-state">No se pudieron cargar los pacientes: ${escapeHtml(error.message)} <button type="button" id="retry-patients">Reintentar</button></td></tr>`;
    $('#retry-patients')?.addEventListener('click', loadPatients);
    $('#patients-count').textContent = 'Error al cargar';
    toast(`No se pudieron cargar los pacientes: ${error.message}`);
    return 0;
  }
}

export async function openPatientById(patientId) {
  if (!patients.length) await loadPatients();
  const patient = patients.find((item) => String(item.id) === String(patientId)) ?? {
    id: Number(patientId),
    nombre: 'Paciente',
  };
  await showPatientDetail(patient);
}

export function initPacientes() {
  if (initialized) return;
  initialized = true;
  $('#patient-search').addEventListener('input', renderPatients);
}