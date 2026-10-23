/**
 * Main application entry point.
 * Initializes the veterinary panel after successful authentication.
 */
import { logout, requireSession } from './session.js';
import { MOCK_MODE } from './config.js';
import { $, closeDetail, initials, toast } from './utils.js';
import { currentRoute, initRouter, navigate, setRouteSilently } from './router.js';
import { initResumen, openCaseById, refreshDashboard } from './views/resumen.js';
import { initPacientes, loadPatients, openPatientById } from './views/pacientes.js';
import { initVacunacion, loadVaccinations } from './views/vacunacion.js';
import { bindDialogEvents } from './components/dialog.js';

let currentView = null;
let routeVersion = 0;

const VIEW_COPY = {
  resumen: {
    title: 'Cola priorizada de triaje',
    subtitle: 'Los reportes críticos y con mayor puntaje aparecen primero.',
    breadcrumb: 'Triaje',
  },
  pacientes: {
    title: 'Directorio de pacientes',
    subtitle: 'Consulta los pacientes y sus historiales clínicos.',
    breadcrumb: 'Pacientes',
  },
  vacunacion: {
    title: 'Calendario de vacunación',
    subtitle: 'Refuerzos vencidos y próximos de todos los pacientes.',
    breadcrumb: 'Vacunación',
  },
};

function renderUser(user) {
  const name = user?.nombre || 'Equipo veterinario';
  const role = ({
    admin: 'Administrador',
    veterinario: 'Veterinario',
    tutor: 'Tutor',
  })[String(user?.rol ?? '').toLowerCase()] ?? 'Sesión activa';

  $('#user-name').textContent = name;
  $('#user-role').textContent = `${role} · San Francisco de Asís`;
  $('#user-initials').textContent = initials(name);
  $('#topbar-initials').textContent = initials(name);
  $('#topbar-initials').title = name;
  document.title = `${name} | Panel veterinario`;
}

function setDates() {
  const now = new Date();
  $('#today-label').textContent = new Intl.DateTimeFormat('es-BO', {
    weekday: 'short', day: '2-digit', month: 'short',
  }).format(now);
  $('#heading-date').textContent = new Intl.DateTimeFormat('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(now);
}

function applyView(view) {
  const isResumen = view === 'resumen';
  const isPacientes = view === 'pacientes';
  const isVacunacion = view === 'vacunacion';
  const copy = VIEW_COPY[view] ?? VIEW_COPY.resumen;

  $('#summary-view').classList.toggle('hidden', !isResumen);
  $('#patients-view').classList.toggle('hidden', !isPacientes);
  $('#vaccination-view').classList.toggle('hidden', !isVacunacion);
  $('#page-title').textContent = copy.title;
  $('#page-subtitle').textContent = copy.subtitle;
  $('#breadcrumb-current').textContent = copy.breadcrumb;
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

async function handleRoute(route) {
  const version = ++routeVersion;
  const changedView = currentView !== route.view;
  currentView = route.view;
  applyView(route.view);

  // Al volver a una vista base (incluido el botón Atrás), cerrar el detalle.
  if (!route.caseId && !route.id) closeDetail();

  if (route.view === 'pacientes') {
    if (changedView || route.id) await loadPatients();
    if (version !== routeVersion) return;
    if (route.id) await openPatientById(route.id);
    return;
  }

  if (route.view === 'vacunacion') {
    if (changedView) await loadVaccinations();
    return;
  }

  if (changedView) await refreshDashboard();
  if (version !== routeVersion) return;
  if (route.caseId) openCaseById(route.caseId);
}

function refreshCurrentView() {
  if (currentView === 'pacientes') return loadPatients();
  if (currentView === 'vacunacion') return loadVaccinations();
  return refreshDashboard();
}

function bindShell() {
  if (!window.location.hash) {
    history.replaceState(null, '', '#/resumen');
  }

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      closeDetail();
      navigate(button.dataset.view);
    });
  });

  document.querySelectorAll('.js-logout').forEach((button) => {
    button.addEventListener('click', () => {
      if (window.confirm('¿Cerrar la sesión actual?')) logout();
    });
  });

  $('#refresh-button').addEventListener('click', async () => {
    const button = $('#refresh-button');
    button.disabled = true;
    try {
      await refreshCurrentView();
      toast('Datos actualizados.');
    } finally {
      button.disabled = false;
    }
  });

  bindDialogEvents(
    () => {},
    currentRoute,
    setRouteSilently
  );
}

const session = requireSession();

if (session) {
  renderUser(session.usuario);
  setDates();
  $('#mock-indicator').hidden = !MOCK_MODE;
  initResumen();
  initPacientes();
  initVacunacion();
  bindShell();
  initRouter((route) => {
    handleRoute(route).catch((error) => {
      toast(`No se pudo cargar la vista: ${error.message}`);
    });
  });
}