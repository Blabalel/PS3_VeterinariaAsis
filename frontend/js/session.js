const SESSION_KEY = 'vet.session';

function decodeTokenPayload(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return getSession()?.access_token ?? null;
}

export function getUser() {
  const session = getSession();
  return session?.usuario ?? null;
}

export function saveSession(response) {
  const token = response?.access_token ?? response?.token;
  if (!token) throw new Error('La respuesta de autenticación no incluyó un token.');
  const session = {
    access_token: token,
    usuario: response?.usuario ?? response?.user ?? null,
    saved_at: new Date().toISOString(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isSessionValid() {
  const session = getSession();
  if (!session?.access_token) return false;

  // El token de demostración no tiene formato JWT; se acepta solo en modo demo.
  if (String(session.access_token).split('.').length !== 3) return true;

  const payload = decodeTokenPayload(session.access_token);
  if (!payload) {
    clearSession();
    return false;
  }
  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    clearSession();
    return false;
  }
  return true;
}

export function requireSession() {
  if (!isSessionValid()) {
    window.location.replace('login.html');
    return null;
  }
  return getSession();
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

export function logout() {
  clearSession();
  window.location.replace('login.html');
}

export { SESSION_KEY };
