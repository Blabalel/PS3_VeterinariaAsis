import { getCalendarData } from '../services/calendarService.js';
import { getPatientHistory } from '../services/patientService.js';
import { $, escapeHtml as esc, formatDate, openDetail, vaccineStatusLabel, toast } from '../utils.js';
import { clinicToday, doseLabel, eventDate, isUpcoming, vaccineState } from '../calendar-model.js';
import { openApplyVaccineDialog, openRescheduleVaccineDialog, openScheduleVaccineDialog } from '../vaccine-actions.js';
import { navigate } from '../router.js';

let calendar;
let data = null;
let initialized = false;
let loadVersion = 0;
let detailVersion = 0;
let viewPreference;
try { viewPreference = localStorage.getItem('vet.calendar.view'); } catch { /* Storage may be disabled. */ }
const glyph = { programada: '◷', proxima: '◴', vencida: '!', aplicada: '✓', cancelada: '×' };

function status(item) {
  const state = vaccineState(item);
  return `<span class="vaccine-status ${state}">${glyph[state]} ${vaccineStatusLabel(state)}</span>`;
}
function eventLabel(item) {
  return `${item.paciente_nombre ?? 'Paciente'} · ${item.nombre_vacuna} · ${doseLabel(item)} · ${formatDate(eventDate(item))} · ${vaccineStatusLabel(vaccineState(item))}`;
}
function eventButton(item) {
  return `<button type="button" class="agenda-item" data-vaccine-id="${esc(item.id)}"><span><strong>${esc(item.paciente_nombre ?? 'Paciente')} · ${esc(item.nombre_vacuna)}</strong><small>${esc(doseLabel(item))} · ${formatDate(eventDate(item))}</small></span>${status(item)}</button>`;
}
function selectedItems() {
  if (!data) return [];
  const patient = $('#vaccine-patient-filter').value;
  const type = $('#vaccine-type-filter').value;
  const state = $('#vaccine-status-filter').value;
  return data.items.filter((item) => vaccineState(item) !== 'cancelada' && (!patient || String(item.paciente_id) === patient) && (!type || item.nombre_vacuna === type) && (!state || vaccineState(item) === state));
}
function bindEvents(root) {
  root.querySelectorAll('[data-vaccine-id]').forEach((button) => button.addEventListener('click', () => {
    const item = data.items.find((entry) => String(entry.id) === button.dataset.vaccineId);
    if (item) openVaccine(item);
  }));
}
function setOptions(select, options, label) {
  const previous = select.value;
  select.innerHTML = `<option value="">${label}</option>${options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('')}`;
  if (options.some(([value]) => String(value) === previous)) select.value = previous;
}
function populateFilters() {
  const patients = new Map(data.patients.map((p) => [String(p.id), `${p.nombre} · #${p.id}`]));
  data.items.forEach((item) => patients.set(String(item.paciente_id), `${item.paciente_nombre ?? 'Paciente'} · #${item.paciente_id}`));
  setOptions($('#vaccine-patient-filter'), [...patients].sort((a, b) => a[1].localeCompare(b[1], 'es')), 'Todas las mascotas');
  setOptions($('#vaccine-type-filter'), [...new Set(data.items.map((item) => item.nombre_vacuna))].sort((a, b) => a.localeCompare(b, 'es')).map((name) => [name, name]), 'Todas las vacunas');
}
function updateVisibleCount() {
  if (!calendar || !data) return;
  const start = calendar.view.activeStart.toISOString().slice(0, 10);
  const end = calendar.view.activeEnd.toISOString().slice(0, 10);
  const count = selectedItems().filter((item) => eventDate(item) >= start && eventDate(item) < end).length;
  const empty = $('#calendar-empty');
  empty.classList.toggle('hidden', count > 0);
  const filtered = ['#vaccine-patient-filter', '#vaccine-type-filter', '#vaccine-status-filter'].some((id) => $(id).value);
  empty.textContent = count ? '' : filtered ? 'No hay vacunas en este período con los filtros seleccionados. Prueba con otros filtros o cambia de fecha.' : 'No hay vacunas en este período. Cambia de fecha o programa un refuerzo.';
  $('#vaccines-count').textContent = `${count} ${count === 1 ? 'evento visible' : 'eventos visibles'} · ${selectedItems().length} registros con estos filtros`;
}
function ensureCalendar() {
  if (calendar) return true;
  if (!window.FullCalendar) return false;
  calendar = new window.FullCalendar.Calendar($('#vaccination-calendar'), {
    locale: 'es', firstDay: 1, timeZone: 'UTC',
    initialView: ['dayGridMonth', 'dayGridWeek', 'listMonth'].includes(viewPreference) ? viewPreference : 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,listMonth' },
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', list: 'Lista' },
    buttonHints: { prev: 'Período anterior', next: 'Período siguiente', today: 'Ir a hoy' },
    now: clinicToday(), height: 'auto', fixedWeekCount: false, dayMaxEvents: 2,
    displayEventTime: false, editable: false, eventInteractive: true,
    noEventsText: 'Sin vacunas para este período.',
    moreLinkContent: (arg) => `Ver ${arg.num} más`,
    eventClassNames: ({ event }) => [`vaccine-event-${vaccineState(event.extendedProps.item)}`],
    eventContent: ({ event }) => {
      const item = event.extendedProps.item;
      return { html: `<span class="calendar-event-title">${esc(item.paciente_nombre ?? 'Paciente')} · ${esc(item.nombre_vacuna)}</span><span class="calendar-event-meta">${esc(doseLabel(item))}</span><span class="calendar-event-meta">${formatDate(eventDate(item))} · ${glyph[vaccineState(item)]} ${vaccineStatusLabel(vaccineState(item))}</span>` };
    },
    eventClick: ({ event, jsEvent }) => { jsEvent.preventDefault(); openVaccine(event.extendedProps.item); },
    eventDidMount: ({ el, event }) => {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', eventLabel(event.extendedProps.item));
      el.addEventListener('keydown', (key) => { if (key.key === 'Enter' || key.key === ' ') { key.preventDefault(); openVaccine(event.extendedProps.item); } });
    },
    datesSet: ({ view }) => {
      viewPreference = view.type;
      try { localStorage.setItem('vet.calendar.view', view.type); } catch { /* Optional preference. */ }
      updateVisibleCount();
    },
  });
  calendar.render();
  let previousWidth = $('#vaccination-calendar').clientWidth;
  const resize = new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (width > 0 && width !== previousWidth) {
      previousWidth = width;
      requestAnimationFrame(() => calendar.updateSize());
    }
  });
  resize.observe($('#vaccination-calendar'));
  return true;
}
function render() {
  if (!data) return;
  const items = selectedItems();
  const dated = items.filter((item) => eventDate(item));
  const undated = items.filter((item) => !eventDate(item));
  const upcoming = items.filter((item) => isUpcoming(item)).sort((a, b) => eventDate(a).localeCompare(eventDate(b)));
  $('#upcoming-vaccines').innerHTML = upcoming.length ? upcoming.map(eventButton).join('') : '<p class="empty-state">No hay refuerzos pendientes en los próximos 7 días con estos filtros.</p>';
  bindEvents($('#upcoming-vaccines'));
  $('#undated-vaccines').classList.toggle('hidden', !undated.length);
  $('#undated-vaccines').innerHTML = undated.length ? `<h3>Sin fecha programada</h3>${undated.map(eventButton).join('')}` : '';
  bindEvents($('#undated-vaccines'));
  if (ensureCalendar()) {
    calendar.batchRendering(() => {
      calendar.removeAllEvents();
      calendar.addEventSource(dated.map((item) => ({ id: String(item.id), title: item.nombre_vacuna, start: eventDate(item), allDay: true, extendedProps: { item } })));
    });
    calendar.updateSize();
    updateVisibleCount();
  } else {
    $('#vaccination-calendar').innerHTML = `<p class="notice">No se pudo iniciar el calendario. Puedes consultar la lista y actualizar la página para reintentar.</p>${dated.map(eventButton).join('') || '<p class="empty-state">No hay vacunas con estos filtros.</p>'}`;
    $('#vaccines-count').textContent = `${items.length} registros con estos filtros`;
    bindEvents($('#vaccination-calendar'));
  }
}
export async function loadVaccinations({ force = false } = {}) {
  const version = ++loadVersion;
  const loading = $('#vaccine-loading');
  loading.classList.remove('hidden');
  loading.textContent = data ? 'Actualizando vacunas; se muestran los últimos datos disponibles…' : 'Cargando vacunas e historial…';
  $('#vaccination-view').setAttribute('aria-busy', 'true');
  try {
    const result = await getCalendarData({ force });
    if (version !== loadVersion) return false;
    data = result;
    const pending = data.items.filter((item) => !['aplicada', 'cancelada'].includes(vaccineState(item)));
    $('#vaccine-overdue').textContent = pending.filter((item) => vaccineState(item) === 'vencida').length;
    $('#vaccine-today').textContent = pending.filter((item) => eventDate(item) === clinicToday()).length;
    $('#vaccine-soon').textContent = pending.filter((item) => isUpcoming(item)).length;
    $('#vaccine-total').textContent = pending.length;
    const warning = $('#vaccine-warning');
    warning.classList.toggle('hidden', !data.warnings.length);
    warning.innerHTML = data.warnings.length ? `<strong>Historial incompleto.</strong> ${data.warnings.map(esc).join(' ')} <button class="secondary-button compact-button" id="retry-calendar" type="button">Reintentar</button>` : '';
    $('#retry-calendar')?.addEventListener('click', () => loadVaccinations({ force: true }));
    populateFilters();
    render();
    return !data.warnings.length;
  } catch (error) {
    if (version !== loadVersion) return false;
    const warning = $('#vaccine-warning');
    warning.classList.remove('hidden');
    warning.innerHTML = `<strong>No se pudieron cargar las vacunas.</strong> ${esc(error.message)} ${data ? 'Los datos visibles pueden estar desactualizados.' : ''} <button class="secondary-button compact-button" id="retry-calendar" type="button">Reintentar</button>`;
    $('#retry-calendar').addEventListener('click', () => loadVaccinations({ force: true }));
    if (!data) $('#upcoming-vaccines').innerHTML = '<p class="empty-state">Los recordatorios estarán disponibles cuando se recupere la conexión.</p>';
    return false;
  } finally {
    if (version === loadVersion) { loading.classList.add('hidden'); $('#vaccination-view').setAttribute('aria-busy', 'false'); }
  }
}

async function openVaccine(item) {
  const version = ++detailVersion;
  const applicable = !['aplicada', 'cancelada'].includes(vaccineState(item));
  if (openDetail(`${item.paciente_nombre ?? 'Paciente'} · ${item.nombre_vacuna}`, 'DETALLE DE VACUNACIÓN', `
    <div class="detail-meta">${status(item)}<span class="score-chip">Paciente #${esc(item.paciente_id)}</span></div>
    <dl class="clinical-details"><div><dt>Vacuna</dt><dd>${esc(item.nombre_vacuna)}</dd></div><div><dt>Dosis / refuerzo</dt><dd>${esc(doseLabel(item))}</dd></div><div><dt>Fecha programada</dt><dd>${formatDate(item.fecha_programada)}</dd></div><div><dt>Fecha de aplicación</dt><dd>${formatDate(item.fecha_aplicada)}</dd></div><div><dt>Lote</dt><dd>${esc(item.lote || 'No registrado')}</dd></div></dl>
    <div class="detail-block"><small>OBSERVACIONES</small><p>${esc(item.notas || 'Sin observaciones registradas.')}</p></div>
    <div class="detail-actions">${applicable ? '<button id="detail-apply-vaccine" class="primary-button" type="button">Registrar aplicación</button><button id="detail-reschedule-vaccine" class="secondary-button" type="button">Reprogramar</button>' : ''}<button id="detail-patient-history" class="secondary-button" type="button">Ver ficha completa</button></div>
    <h3>Historial de vacunas</h3><div class="history-preview">${data.items.filter((vaccine) => String(vaccine.paciente_id) === String(item.paciente_id)).sort((a, b) => (eventDate(b) ?? '').localeCompare(eventDate(a) ?? '')).map((vaccine) => `<p><strong>${esc(vaccine.nombre_vacuna)}</strong> · ${formatDate(eventDate(vaccine))} · ${vaccineStatusLabel(vaccineState(vaccine))}</p>`).join('')}</div>
    <h3>Consultas recientes</h3><div id="vaccine-clinical-history" role="status">Cargando historial clínico…</div>`) === false) return;
  $('#detail-apply-vaccine')?.addEventListener('click', () => openApplyVaccineDialog(item, () => loadVaccinations({ force: true })));
  $('#detail-reschedule-vaccine')?.addEventListener('click', () => openRescheduleVaccineDialog(item, () => loadVaccinations({ force: true })));
  $('#detail-patient-history').addEventListener('click', () => navigate(`pacientes/${item.paciente_id}`));
  async function history() {
    try {
      const result = await getPatientHistory(item.paciente_id);
      const target = $('#vaccine-clinical-history');
      if (!target || version !== detailVersion) return;
      const records = (Array.isArray(result) ? result : result.items ?? []).sort((a, b) => String(b.fecha_consulta ?? '').localeCompare(String(a.fecha_consulta ?? '')));
      target.innerHTML = records.length ? records.slice(0, 3).map((record) => `<article class="detail-block"><small>${formatDate(record.fecha_consulta, true)}</small><p>${esc(record.motivo || 'Consulta registrada')}</p>${record.notas_veterinario ? `<p>${esc(record.notas_veterinario)}</p>` : ''}</article>`).join('') : '<p>Sin consultas registradas.</p>';
    } catch {
      const target = $('#vaccine-clinical-history');
      if (!target || version !== detailVersion) return;
      target.innerHTML = '<p class="form-error">No se pudo cargar el historial clínico.</p><button class="secondary-button compact-button" type="button" id="retry-vaccine-history">Reintentar historial</button>';
      $('#retry-vaccine-history').addEventListener('click', history);
    }
  }
  history();
}
export function initVacunacion() {
  if (initialized) return;
  initialized = true;
  for (const id of ['#vaccine-patient-filter', '#vaccine-type-filter', '#vaccine-status-filter']) $(id).addEventListener('change', render);
  $('#clear-vaccine-filters').addEventListener('click', () => {
    for (const id of ['#vaccine-patient-filter', '#vaccine-type-filter', '#vaccine-status-filter']) $(id).value = '';
    render();
  });
  $('#new-vaccine-button').addEventListener('click', () => openScheduleVaccineDialog({ onSaved: () => loadVaccinations({ force: true }) }));
}
