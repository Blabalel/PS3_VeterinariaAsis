import { getPatients } from './patientService.js';
import { getVaccinationAlerts, getPatientVaccinations } from './vaccinationService.js';

let cache = null;
let pending = null;
let generation = 0;
export function invalidateCalendar() { cache = null; generation += 1; }
window.addEventListener('vaccinations:changed', invalidateCalendar);

/** Join the existing endpoints; four workers prevent a request burst. */
export async function getCalendarData({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.loadedAt < 60000) return cache;
  if (pending) {
    if (!force) return pending;
    // A post-save refresh must not reuse a request started before the write.
    try { await pending; } catch { /* Start a fresh request below. */ }
  }
  const version = generation;
  pending = (async () => {
    const [alertsResult, patientsResult] = await Promise.allSettled([getVaccinationAlerts(), getPatients()]);
    if (alertsResult.status === 'rejected' && patientsResult.status === 'rejected') throw alertsResult.reason;
    const warnings = [];
    const patients = patientsResult.status === 'fulfilled' ? patientsResult.value : [];
    const items = new Map();
    if (alertsResult.status === 'fulfilled') {
      const alerts = Array.isArray(alertsResult.value) ? alertsResult.value : alertsResult.value.items ?? [];
      alerts.forEach((item) => items.set(String(item.id), item));
    } else warnings.push('No se pudo cargar la consulta global de pendientes.');
    if (patientsResult.status === 'rejected') warnings.push('No se pudo cargar el directorio: faltan aplicaciones e historial por paciente.');
    let cursor = 0;
    let failed = 0;
    let successful = 0;
    const loadPatient = async () => {
      while (cursor < patients.length) {
        const patient = patients[cursor++];
        try {
          const vaccinations = await getPatientVaccinations(patient.id);
          vaccinations.forEach((item) => items.set(String(item.id), {
            ...items.get(String(item.id)), ...item,
            paciente_nombre: patient.nombre, especie: patient.especie,
            tutor_nombre: patient.tutor_nombre,
          }));
          successful += 1;
        } catch { failed += 1; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, patients.length) }, loadPatient));
    if (failed) warnings.push(`No se pudo cargar el historial de ${failed} ${failed === 1 ? 'paciente' : 'pacientes'}.`);
    if (alertsResult.status === 'rejected' && patients.length && !successful) throw new Error('No se pudieron cargar las vacunas. Reintenta la consulta.');
    const result = { items: [...items.values()], patients, warnings, loadedAt: Date.now() };
    // Partial results are usable, but must never be cached as complete.
    if (!warnings.length && version === generation) cache = result;
    return result;
  })();
  try { return await pending; } finally { pending = null; }
}
