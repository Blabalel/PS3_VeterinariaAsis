/**
 * Authentication API calls.
 */
import { requestJson } from './client.js';
import { ROUTES } from './endpoints.js';

/**
 * Login with email and password.
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Login response with access_token and user info
 */
export async function login(email, password) {
  return requestJson(ROUTES.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Logout - client-side only since tokens are stateless.
 * @returns {Promise<Object>} Logout confirmation
 */
export async function logout() {
  // The token is stateless: the client must discard it.
  // We could call a backend endpoint for logging/analytics, but it's not required.
  return { mensaje: 'Sesión cerrada correctamente.' };
}

/**
 * Get current user info from token.
 * @returns {Promise<Object>} Current user info
 */
export async function getCurrentUser() {
  return requestJson('/api/auth/me');
}

export { ROUTES };