/**
 * Login page logic.
 */
import { MOCK_MODE } from './config.js';
import { isSessionValid, saveSession } from './session.js';
import { login as apiLogin } from './api/auth.js';

const $ = (selector) => document.querySelector(selector);
const PANEL_ROLES = new Set(['veterinario', 'admin']);

const form = $('#login-form');
const emailInput = $('#email');
const passwordInput = $('#password');
const submitButton = $('#login-submit');
const errorBox = $('#login-error');
const noticeBox = $('#login-notice');
const togglePassword = $('#toggle-password');

if (isSessionValid()) {
  window.location.replace('/#/resumen');
}

const params = new URLSearchParams(window.location.search);
if (params.get('expired') === '1') {
  showNotice('Tu sesión expiró. Vuelve a iniciar sesión.');
}

togglePassword?.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  togglePassword.textContent = show ? 'Ocultar' : 'Mostrar';
  togglePassword.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}

function showNotice(message) {
  noticeBox.textContent = message;
  noticeBox.classList.remove('hidden');
}

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.textContent = loading ? 'Verificando…' : 'Iniciar sesión';
  emailInput.disabled = loading;
  passwordInput.disabled = loading;
}

function redirectToPanel() {
  window.location.replace('/#/resumen');
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email.includes('@')) {
    showError('Ingresa un correo electrónico válido.');
    emailInput.focus();
    return;
  }
  if (!password) {
    showError('Ingresa tu contraseña.');
    passwordInput.focus();
    return;
  }

  setLoading(true);
  try {
    if (MOCK_MODE) {
      saveSession({
        access_token: 'demo-token',
        usuario: {
          id: 0,
          nombre: 'Equipo veterinario',
          email,
          rol: 'admin',
        },
      });
      redirectToPanel();
      return;
    }

    const payload = await apiLogin(email, password);

    const role = String(payload?.usuario?.rol ?? '').toLowerCase();
    if (!PANEL_ROLES.has(role)) {
      throw new Error('Esta cuenta no tiene acceso al panel veterinario.');
    }

    saveSession(payload);
    redirectToPanel();
  } catch (error) {
    showError(error.message || 'No se pudo iniciar sesión. Intenta nuevamente.');
    passwordInput.select();
  } finally {
    setLoading(false);
  }
});