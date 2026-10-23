export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let toastTimer;

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function formatDate(value, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const options = includeTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('es-BO', options).format(date);
}

export function initials(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || 'SF';
}

function normalizeSeverity(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function severityOf(item) {
  return normalizeSeverity(item?.nivel_gravedad ?? item?.gravedad ?? item);
}

export function severityLabel(value) {
  return ({
    critica: 'Crítica',
    moderada: 'Moderada',
    leve: 'Leve',
  })[normalizeSeverity(value)] || 'Sin clasificar';
}

export function severityClass(value) {
  const key = normalizeSeverity(value);
  return ['critica', 'moderada', 'leve'].includes(key) ? key : 'sin-dato';
}

export function score(item) {
  return Number(item?.puntaje_riesgo ?? item?.score ?? 0) || 0;
}

export function vaccineStatusLabel(value) {
  return ({
    aplicada: 'Aplicada',
    vencida: 'Vencida',
    proxima: 'Próxima',
    programada: 'Programada',
    cancelada: 'Cancelada',
  })[String(value ?? '').toLowerCase()] || 'Programada';
}

export function vaccineStatusClass(value) {
  const key = String(value ?? '').toLowerCase();
  return ['aplicada', 'vencida', 'proxima', 'programada', 'cancelada'].includes(key) ? key : 'programada';
}

export function resolvePhotoUrl(source) {
  if (!source) return null;
  let raw = String(source).trim().replaceAll('\\', '/');
  if (!raw) return null;
  // Algunos registros antiguos guardaron literalmente "undefined" o "null".
  if (['undefined', 'null', 'none'].includes(raw.toLocaleLowerCase('es'))) return null;

  try {
    if (/^(https?:)?\/\//i.test(raw)) {
      const absolute = new URL(raw, window.location.origin);
      return ['http:', 'https:'].includes(absolute.protocol) ? absolute.href : null;
    }

    // Las fotos antiguas se guardaron como ../dataset/nuevas/archivo.jpg.
    raw = raw.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
    if (raw.startsWith('dataset/')) raw = `/${raw}`;
    if (!raw.startsWith('/')) raw = `/${raw}`;

    const url = new URL(raw, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function ageFromBirthDate(value) {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) months -= 1;
  months = Math.max(months, 0);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} ${rest === 1 ? 'mes' : 'meses'}`;
  if (rest === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
  return `${years} años y ${rest} meses`;
}

export function toast(message) {
  const element = $('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.add('hidden'), 4000);
}

export function triggerDownload({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openDetail(title, kicker, content) {
  const dialog = $('#detail-dialog');
  if (!dialog) return;
  $('#detail-title').textContent = title;
  $('#detail-kicker').textContent = kicker;
  $('#detail-content').innerHTML = `<div class="dialog-body">${content}</div>`;
  if (dialog.open) dialog.close();
  dialog.showModal();
}

export function closeDetail() {
  const dialog = $('#detail-dialog');
  if (dialog?.open) dialog.close();
}
