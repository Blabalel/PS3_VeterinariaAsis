const DEFAULT_VIEW = 'resumen';

export function parseRoute(hash = window.location.hash) {
  const raw = String(hash || '')
    .replace(/^#\/?/, '')
    .replace(/\/+$/, '');
  const [section, id] = raw.split('/');

  if (section === 'pacientes') {
    return { view: 'pacientes', id: id || null, caseId: null };
  }
  if (section === 'vacunacion') {
    return { view: 'vacunacion', id: null, caseId: null };
  }
  if (section === 'caso' && id) {
    return { view: 'resumen', id: null, caseId: id };
  }
  return { view: DEFAULT_VIEW, id: null, caseId: null };
}

export function routeToHash(path) {
  return `#/${String(path ?? '').replace(/^#?\/?/, '')}`;
}

export function navigate(path) {
  const hash = routeToHash(path);
  if (window.location.hash !== hash) window.location.hash = hash;
}

export function setRouteSilently(path) {
  const hash = routeToHash(path);
  if (window.location.hash !== hash) history.replaceState(null, '', hash);
}

export function currentRoute() {
  return parseRoute();
}

export function initRouter(onRoute) {
  const handle = () => onRoute(parseRoute());
  window.addEventListener('hashchange', handle);
  if (!window.location.hash) {
    history.replaceState(null, '', routeToHash(DEFAULT_VIEW));
  }
  handle();
}
