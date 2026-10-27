// Date-only scheduling follows the API's calendar date, never the browser's UTC offset.
export const CLINIC_ZONE = 'America/La_Paz';

export function clinicToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function dateKey(value) {
  const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/);
  return match ? match[1] : null;
}

export function addDays(value, days) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function scheduledISO(value) {
  return new Date(`${value}T12:00:00-04:00`).toISOString();
}

export function vaccineState(item, today = clinicToday()) {
  if (item.estado === 'cancelada' || item.estado_visual === 'cancelada') return 'cancelada';
  if (item.estado === 'aplicada' || item.fecha_aplicada || item.estado_visual === 'aplicada') return 'aplicada';
  // Prefer the server's state: its 30-day window remains authoritative.
  if (['vencida', 'proxima', 'programada'].includes(item.estado_visual)) return item.estado_visual;
  const day = dateKey(item.fecha_programada);
  return !day ? 'programada' : day < today ? 'vencida' : day <= addDays(today, 30) ? 'proxima' : 'programada';
}

export function eventDate(item) {
  return dateKey(vaccineState(item) === 'aplicada' ? item.fecha_aplicada ?? item.fecha_programada : item.fecha_programada);
}

export function isUpcoming(item, today = clinicToday()) {
  const day = dateKey(item.fecha_programada);
  return !['aplicada', 'cancelada'].includes(vaccineState(item, today)) && day >= today && day <= addDays(today, 7);
}

export function doseLabel(item) {
  return item.dosis || item.refuerzo || 'Dosis no registrada';
}

export function reportAge(value, now = Date.now()) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Fecha no disponible';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return 'Hace menos de 1 min';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `Hace ${Math.floor(minutes / 1440)} días`;
}
