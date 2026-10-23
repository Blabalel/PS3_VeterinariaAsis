/**
 * API barrel export.
 */
export * from './client.js';
export * from './endpoints.js';
export * from './auth.js';
// Exportación explícita para evitar ambigüedad entre los `export *`.
export { ROUTES, DEFAULT_ROUTES } from './endpoints.js';
// Las vistas consumen las funciones de servicio desde ../api.js.
export * from '../services/index.js';