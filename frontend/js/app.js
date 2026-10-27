import { logout, requireSession } from './session.js';
import { MOCK_MODE } from './config.js';
import { $, closeDetail, initials, toast } from './utils.js';
import { CLINIC_ZONE } from './calendar-model.js';
import { initRouter, navigate, currentRoute, setRouteSilently } from './router.js';
import { initResumen, openCaseById, refreshDashboard } from './views/resumen.js';
import { initPacientes, loadPatients, openPatientById } from './views/pacientes.js';
import { initVacunacion, loadVaccinations } from './views/vacunacion.js';
import { initTelemedicine, loadTelemedicine } from './views/telemedicina.js';
import { loadReports } from './views/reportes.js';
import { bindDialogEvents } from './components/dialog.js';

let currentView = null;
let lastHash = window.location.hash || '#/resumen';
let routeVersion = 0;
const COPY = {
  resumen: ['Cola priorizada de triaje', 'Críticos primero. Revisa la prioridad y el tiempo desde la recepción del reporte.', 'Triaje / Cola', '#summary-view'],
  telemedicina: ['Telemedicina', 'Revisa los reportes recibidos, sus fotografías y las observaciones clínicas.', 'Telemedicina', '#telemedicine-view'],
  pacientes: ['Pacientes e historial', 'Consulta la ficha clínica, las consultas y las vacunas de cada paciente.', 'Pacientes / Historial', '#patients-view'],
  vacunacion: ['Calendario de vacunación', 'Planifica vacunas y refuerzos, y consulta las aplicaciones registradas.', 'Vacunación', '#vaccination-view'],
  reportes: ['Reportes clínicos', 'Genera el historial de un paciente en formato PDF.', 'Reportes', '#reports-view'],
};
const loaders = { resumen: refreshDashboard, telemedicina: loadTelemedicine, pacientes: loadPatients, vacunacion: loadVaccinations, reportes: loadReports };
const updated = {};
function updatedLabel(view) {
  $('#last-updated').textContent = updated[view] ? `Actualizado ${new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: CLINIC_ZONE }).format(updated[view])}` : 'Sin actualización confirmada';
}
async function loadView(view, force = false) {
  const result = await loaders[view](view === 'vacunacion' ? { force } : undefined);
  if (result !== false && result !== null) updated[view] = new Date();
  if (view === currentView) updatedLabel(view);
  return result !== false && result !== null;
}
async function handleRoute(route) {
  const version = ++routeVersion;
  if (!closeDetail()) { history.replaceState(null, '', lastHash); return; }
  const changedView = currentView !== route.view;
  currentView = route.view;
  lastHash = window.location.hash;
  const [title, subtitle, breadcrumb, section] = COPY[route.view];
  for (const copy of Object.values(COPY)) $(copy[3]).classList.toggle('hidden', copy[3] !== section);
  $('#page-title').textContent = title;
  $('#page-subtitle').textContent = subtitle;
  $('#breadcrumb-current').textContent = breadcrumb;
  updatedLabel(route.view);
  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.view === route.view;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.body.classList.remove('menu-open');
  $('#menu-toggle').setAttribute('aria-expanded', 'false');
  if (changedView || route.id) await loadView(route.view);
  if (version !== routeVersion) return;
  if (route.caseId) openCaseById(route.caseId);
  if (route.id) await openPatientById(route.id);
  else if (changedView) $('#page-title').focus({ preventScroll: true });
}
function bindShell() {
  window.addEventListener('vet:route-silent', () => { lastHash = window.location.hash; });
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => {
    if (!closeDetail()) return;
    document.body.classList.remove('menu-open');
    $('#menu-toggle').setAttribute('aria-expanded', 'false');
    navigate(button.dataset.view);
  }));
  document.querySelectorAll('.js-logout').forEach((button) => button.addEventListener('click', () => {
    if (closeDetail() && window.confirm('¿Cerrar la sesión actual?')) logout();
  }));
  $('#menu-toggle').addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    $('#menu-toggle').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
      document.body.classList.remove('menu-open'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); $('#menu-toggle').focus();
    }
  });
  $('#refresh-button').addEventListener('click', async () => {
    const button = $('#refresh-button');
    if (button.disabled) return;
    button.disabled = true;
    try {
      const complete = await loadView(currentView, true);
      toast(complete ? 'Datos actualizados.' : 'La actualización no se completó. Revisa el aviso de la sección.');
    } catch (error) { toast(`No se pudo actualizar. ${error.message}`); }
    finally { button.disabled = false; }
  });
  bindDialogEvents(() => {}, currentRoute, setRouteSilently);
}
const session = requireSession();
if (session) {
  const user = session.usuario;
  const name = user?.nombre || 'Equipo veterinario';
  $('#user-name').textContent = name;
  $('#user-role').textContent = user?.rol === 'admin' ? 'Administración clínica' : 'Medicina veterinaria';
  $('#user-initials').textContent = initials(name);
  $('#topbar-initials').textContent = initials(name);
  $('#topbar-initials').title = name;
  const now = new Date();
  $('#today-label').textContent = new Intl.DateTimeFormat('es-BO', { weekday: 'short', day: '2-digit', month: 'short', timeZone: CLINIC_ZONE }).format(now);
  $('#heading-date').textContent = new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: CLINIC_ZONE }).format(now);
  $('#mock-indicator').hidden = !MOCK_MODE;
  initResumen(); initPacientes(); initVacunacion(); initTelemedicine(); bindShell();
  initRouter((route) => { handleRoute(route).catch((error) => toast(`No se pudo cargar la sección. ${error.message}`)); });
}
