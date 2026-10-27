// Run with Node.js and Playwright installed. No live API or database is used.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { addDays, clinicToday, dateKey, eventDate, isUpcoming, vaccineState, reportAge } from '../js/calendar-model.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = process.env.PANEL_TEST_OUTPUT;
const today = '2026-10-26';
assert.equal(clinicToday(new Date('2026-10-27T02:00:00Z')), today);
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.equal(dateKey('2026-10-26T00:30:00Z'), today);
assert.equal(vaccineState({ estado: 'programada', fecha_programada: '2026-10-25' }, today), 'vencida');
assert.equal(vaccineState({ estado: 'programada', fecha_programada: '2026-11-25' }, today), 'proxima');
assert.equal(vaccineState({ estado: 'programada', fecha_programada: '2026-11-26' }, today), 'programada');
assert.equal(vaccineState({ estado: 'aplicada', fecha_programada: '2025-01-01' }, today), 'aplicada');
assert.equal(eventDate({ estado: 'aplicada', fecha_aplicada: '2026-10-26', fecha_programada: '2026-10-20' }), today);
assert.equal(isUpcoming({ estado: 'programada', fecha_programada: '2026-11-02' }, today), true);
assert.equal(isUpcoming({ estado: 'programada', fecha_programada: '2026-11-03' }, today), false);
assert.equal(isUpcoming({ estado: 'aplicada', fecha_programada: today }, today), false);
assert.equal(reportAge(null), 'Fecha no disponible');

const patients = [
  { id: 1, nombre: 'Luna', especie: 'Canino', raza: 'Mestiza', sexo: 'Hembra', tutor_nombre: 'Ana', fecha_registro: '2026-01-01', alergias: 'Penicilina', peso_kg: 12 },
  { id: 2, nombre: 'Milo', especie: 'Felino', raza: 'Común', sexo: 'Macho', tutor_nombre: 'Luis', fecha_registro: '2026-01-01' },
];
let vaccines = [
  { id: 1, paciente_id: 1, nombre_vacuna: 'Rabia', estado: 'programada', estado_visual: 'vencida', fecha_programada: '2026-10-20T12:00:00', notas: '<script>window.bad=true</script>' },
  { id: 2, paciente_id: 1, nombre_vacuna: 'Séxtuple', estado: 'programada', estado_visual: 'proxima', fecha_programada: '2026-10-28T12:00:00' },
  { id: 3, paciente_id: 2, nombre_vacuna: 'Triple felina', estado: 'aplicada', estado_visual: 'aplicada', fecha_programada: '2026-10-23T12:00:00', fecha_aplicada: '2026-10-24T12:00:00' },
  { id: 4, paciente_id: 2, nombre_vacuna: 'Rabia', estado: 'programada', estado_visual: 'programada', fecha_programada: '2026-12-01T12:00:00' },
  { id: 5, paciente_id: 2, nombre_vacuna: 'Refuerzo sin fecha', estado: 'programada', estado_visual: 'programada', fecha_programada: null },
  { id: 6, paciente_id: 1, nombre_vacuna: 'Cancelada', estado: 'cancelada', estado_visual: 'cancelada', fecha_programada: '2026-10-29' },
];
let cases = [
  { id: 11, paciente_id: 2, paciente_nombre: 'Milo', especie: 'Felino', tutor_nombre: 'Luis', nivel_gravedad: 'leve', puntaje_riesgo: 10, motivo: 'Control de piel', fecha_consulta: '2026-10-26T12:00:00Z', respuestas: {} },
  { id: 12, paciente_id: 1, paciente_nombre: 'Luna', especie: 'Canino', tutor_nombre: 'Ana', nivel_gravedad: 'critica', puntaje_riesgo: 90, motivo: 'Sangrado persistente', fecha_consulta: '2026-10-26T13:30:00Z', respuestas: { sangrado_activo: true } },
  { id: 13, paciente_id: 2, paciente_nombre: 'Milo', especie: 'Felino', tutor_nombre: 'Luis', nivel_gravedad: 'moderada', puntaje_riesgo: 50, motivo: 'Decaimiento', fecha_consulta: '2026-10-26T13:00:00Z', respuestas: {} },
];
let failPatient = false, failAll = false, failSave = false, failPdf = false, failQueue = false;
let paginatePatients = false;
let mutations = 0;
let registrationFailure = 0;
let registrations = 0;
const tutorEmails = new Set();
const requests = [];
const asList = (list) => list.map((vaccine) => ({ ...vaccine, paciente_nombre: patients.find((p) => p.id === vaccine.paciente_id)?.nombre }));
const json = (res, data, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      requests.push(`${req.method} ${path}`);
      if (failAll) return json(res, { detail: 'Conexión de prueba interrumpida.' }, 503);
      if (path === '/api/pacientes/') {
        const all = paginatePatients ? Array.from({ length: 501 }, (_, index) => ({ id: index + 1, nombre: `Paciente ${index + 1}`, especie: 'Canino' })) : patients;
        return json(res, all.slice(Number(url.searchParams.get('skip') || 0), Number(url.searchParams.get('skip') || 0) + Number(url.searchParams.get('limit') || 500)));
      }
      if (path === '/api/historial/pendientes') return json(res, failQueue ? { detail: 'No disponible' } : cases, failQueue ? 503 : 200);
      if (path === '/api/vacunacion/alertas') return json(res, asList(vaccines.filter((v) => !['aplicada', 'cancelada'].includes(v.estado))));
      if (/^\/api\/vacunacion\/paciente\/\d+$/.test(path)) {
        const id = Number(path.split('/').at(-1));
        if (failPatient && id === 2) return json(res, { detail: 'Historial no disponible' }, 503);
        return json(res, { items: asList(vaccines.filter((v) => v.paciente_id === id)) });
      }
      if (/^\/api\/pacientes\/\d+$/.test(path)) {
        const patient = patients.find((p) => p.id === Number(path.split('/').at(-1)));
        return json(res, { ...patient, tutor: { nombre: patient.tutor_nombre, telefono: '70000000' } });
      }
      if (/^\/api\/historial\/\d+$/.test(path)) return json(res, { items: cases.filter((c) => c.paciente_id === Number(path.split('/').at(-1))) });
      if (path.endsWith('/pdf')) {
        if (failPdf) return json(res, { detail: 'PDF no disponible' }, 503);
        res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=historial.pdf' }); res.end('%PDF-1.4\n%%EOF'); return;
      }
      if (path === '/api/pacientes/registro-con-tutor' && req.method === 'POST') {
        let body = ''; for await (const chunk of req) body += chunk;
        const value = JSON.parse(body);
        await new Promise((done) => setTimeout(done, 80));
        if (registrationFailure) return json(res, { detail: registrationFailure === 409 ? 'Este correo ya está registrado. Revisa el correo del tutor.' : 'No se pudo completar el registro conjunto.' }, registrationFailure);
        if (tutorEmails.has(value.tutor.email)) return json(res, { detail: 'Este correo ya está registrado.' }, 409);
        tutorEmails.add(value.tutor.email);
        registrations += 1;
        const patient = { ...value.paciente, id: 1000 + registrations, tutor_id: 2000 + registrations, tutor_nombre: value.tutor.nombre, fecha_registro: '2026-10-26' };
        patients.push(patient);
        return json(res, { ...patient, tutor: { id: patient.tutor_id, nombre: value.tutor.nombre, email: value.tutor.email, telefono: value.tutor.telefono, direccion: value.tutor.direccion } }, 201);
      }
      if (req.method === 'PATCH' || req.method === 'POST') {
        let body = ''; for await (const chunk of req) body += chunk;
        const value = JSON.parse(body);
        if (failSave) return json(res, { detail: 'No se pudo guardar el registro de prueba.' }, 503);
        mutations += 1;
        if (path.endsWith('/revisar')) { cases = cases.filter((c) => c.id !== Number(path.split('/').at(-2))); return json(res, { ok: true }); }
        if (req.method === 'POST') { vaccines.push({ ...value, id: 100 + mutations }); return json(res, vaccines.at(-1)); }
        const item = vaccines.find((v) => v.id === Number(path.split('/').at(-1)));
        Object.assign(item, value); delete item.estado_visual;
        return json(res, item);
      }
      return json(res, { detail: 'Ruta de prueba no encontrada.' }, 404);
    }
    const file = resolve(root, `.${decodeURIComponent(path === '/' ? '/index.html' : path)}`);
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(file);
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(file)] ?? 'text/plain';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const checks = [];
function passed(message) { checks.push(message); console.log(`PASS ${message}`); }
try {
  browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'Asia/Tokyo', locale: 'es-BO' });
  await context.addInitScript(() => sessionStorage.setItem('vet.session', JSON.stringify({ access_token: 'test-session', usuario: { nombre: 'Equipo de prueba', rol: 'veterinario' } })));
  await context.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await context.route('https://fonts.gstatic.com/**', (route) => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.clock.install({ time: new Date('2026-10-26T14:00:00Z') });
  const errors = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error('BROWSER ERROR', error.message); });
  page.on('response', (response) => { if (response.status() === 404) console.error('MISSING', response.url()); });
  await page.goto(origin);
  await page.locator('#cases-table [data-case-id]').first().waitFor();
  assert.equal(await page.locator('.nav-item').count(), 5);
  assert.equal((await page.locator('#cases-table tr').first().locator('.priority').innerText()).replace(/\s+/g, ' '), '! Crítica');
  assert.match(await page.locator('[data-report-date]').first().innerText(), /30 min/);
  await page.selectOption('#case-priority', 'leve');
  assert.match(await page.locator('#critical-filter-warning').innerText(), /1 caso crítico/);
  await page.selectOption('#case-priority', '');
  passed('Five sections; queue priority and elapsed time; critical cases outside filters');
  failQueue = true;
  await page.locator('#refresh-button').click();
  await page.locator('#retry-cases').waitFor();
  assert.equal(await page.locator('#cases-table [data-case-id]').count(), 3);
  failQueue = false;
  await page.locator('#retry-cases').click();
  await page.locator('#queue-error').waitFor({ state: 'detached' });
  passed('Queue connection error preserves visible cases and offers retry');

  await page.locator('[data-case-id="12"]').click();
  await page.fill('#vet-notes', 'Observación pendiente');
  await page.locator('#case-history').click();
  await page.locator('#case-history-preview .detail-block').first().waitFor();
  assert.equal(await page.inputValue('#vet-notes'), 'Observación pendiente');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('#close-dialog').click();
  assert.equal(await page.locator('#detail-dialog').evaluate((node) => node.open), true);
  assert.equal(await page.inputValue('#vet-notes'), 'Observación pendiente');
  failSave = true;
  await page.locator('#mark-reviewed').click();
  await page.locator('#review-error:not(.hidden)').waitFor();
  assert.equal(await page.inputValue('#vet-notes'), 'Observación pendiente');
  failSave = false;
  await page.locator('#mark-reviewed').click();
  await page.locator('[data-case-id="12"]').waitFor({ state: 'detached' });
  passed('Draft protection; failed review retains notes; confirmed review leaves queue');

  await page.locator('[data-view="vacunacion"]').click();
  await page.locator('.fc-event').first().waitFor();
  assert.equal(await page.locator('.fc-event.vaccine-event-aplicada').count(), 1);
  assert.match(await page.locator('#undated-vaccines').innerText(), /Refuerzo sin fecha/);
  assert.equal(await page.locator('#upcoming-vaccines [data-vaccine-id="2"]').count(), 1);
  assert.equal(await page.locator('.fc-event').count(), 3);
  assert.equal(await page.evaluate(() => window.bad), undefined);
  passed('Month view includes applied vaccines; undated records; upcoming reminders; safe text rendering');
  if (output) { await mkdir(output, { recursive: true }); await page.clock.runFor(4500); await page.screenshot({ path: resolve(output, 'vacunacion-escritorio.png'), fullPage: true }); }

  await page.selectOption('#vaccine-patient-filter', '2');
  await page.selectOption('#vaccine-status-filter', 'aplicada');
  assert.equal(await page.locator('.fc-event').count(), 1);
  await page.locator('.fc-event').first().focus();
  await page.keyboard.press('Enter');
  await page.locator('#vaccine-clinical-history .detail-block').first().waitFor();
  assert.equal(await page.locator('#detail-apply-vaccine').count(), 0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#detail-dialog').evaluate((node) => node.open), false);
  assert.equal(await page.locator('.fc-event').evaluate((el) => document.activeElement === el), true);
  await page.locator('#clear-vaccine-filters').click();
  await page.locator('.fc-dayGridWeek-button').click();
  await page.locator('.fc-listMonth-button').click();
  passed('Combined filters; keyboard event opening, Escape and focus return; week/list views');

  await page.locator('.fc-dayGridMonth-button').click();
  await page.locator('.fc-event.vaccine-event-vencida').first().click();
  await page.locator('#detail-reschedule-vaccine').click();
  await page.fill('#reschedule-date', '2026-10-30');
  await page.locator('#reschedule-form button[type="submit"]').click();
  await page.locator('#detail-dialog').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => !document.querySelector('#vaccination-view').matches('[aria-busy="true"]'));
  assert.equal(vaccines.find((v) => v.id === 1).fecha_programada.slice(0, 10), '2026-10-30');
  assert.equal(vaccines.find((v) => v.id === 1).estado, 'programada');
  await page.locator('#upcoming-vaccines [data-vaccine-id="2"]').click();
  await page.locator('#detail-apply-vaccine').click();
  await page.fill('#apply-date', '2026-10-27');
  await page.locator('#apply-vaccine-form button[type="submit"]').click();
  assert.match(await page.locator('#apply-date-error').innerText(), /no puede ser futura/);
  await page.fill('#apply-date', today);
  failSave = true;
  await page.locator('#apply-vaccine-form button[type="submit"]').click();
  await page.locator('#apply-vaccine-form .form-error:not(.hidden)').waitFor();
  assert.equal(await page.inputValue('#apply-date'), today);
  failSave = false;
  await page.locator('#apply-vaccine-form button[type="submit"]').click();
  await page.locator('#detail-dialog').waitFor({ state: 'hidden' });
  assert.equal(vaccines.find((v) => v.id === 2).estado, 'aplicada');
  assert.equal(vaccines.find((v) => v.id === 2).fecha_aplicada.slice(0, 10), today);
  passed('Reprogramming uses PATCH; future application blocked; failed save retains values; application confirmed');

  await page.locator('#new-vaccine-button').click();
  await page.locator('#new-vaccine-form button[type="submit"]').click();
  assert.equal(await page.locator('#new-vaccine-form [aria-invalid="true"]').count(), 3);
  await page.selectOption('#vaccine-patient', '1');
  await page.fill('#vaccine-name', 'Vacuna de prueba');
  await page.fill('#vaccine-date', '2026-11-01');
  await page.locator('#new-vaccine-form button[type="submit"]').click();
  await page.locator('#detail-dialog').waitFor({ state: 'hidden' });
  assert.ok(vaccines.some((v) => v.nombre_vacuna === 'Vacuna de prueba'));
  passed('Inline required field errors and new booster scheduling');

  failPatient = true;
  await page.locator('#refresh-button').click();
  await page.locator('#retry-calendar').waitFor();
  assert.match(await page.locator('#vaccine-warning').innerText(), /Historial incompleto/);
  assert.doesNotMatch(await page.locator('#toast').innerText(), /^Datos actualizados/);
  failPatient = false;
  await page.locator('#retry-calendar').click();
  await page.locator('#retry-calendar').waitFor({ state: 'detached' });
  failAll = true;
  await page.locator('#refresh-button').click();
  await page.locator('#retry-calendar').waitFor();
  assert.match(await page.locator('#vaccine-warning').innerText(), /desactualizados/);
  failAll = false;
  await page.locator('#retry-calendar').click();
  await page.locator('#retry-calendar').waitFor({ state: 'detached' });
  passed('Partial history warning and retry; stale data retained during full outage; truthful refresh status');

  await page.locator('[data-view="telemedicina"]').click();
  await page.locator('[data-report-id]').first().waitFor();
  await page.locator('[data-report-id]').first().click();
  await page.locator('#vet-notes').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[data-view="pacientes"]').click();
  await page.locator('[data-patient-id="1"]').click();
  await page.locator('.allergy-text').waitFor();
  assert.equal(await page.locator('.allergy-text').innerText(), 'Penicilina');
  await page.locator('[data-patient-tab="vacunas"]').click();
  await page.locator('.vaccine-list').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[data-view="reportes"]').click();
  await page.selectOption('#report-patient', '1');
  failPdf = true;
  await page.locator('#generate-report').click();
  await page.waitForFunction(() => document.querySelector('#report-status')?.textContent.includes('No se pudo generar'));
  failPdf = false;
  const download = page.waitForEvent('download');
  await page.locator('#generate-report').click();
  await download;
  passed('Telemedicine review; patient history and allergy visibility; PDF error, retry and download');

  await page.locator('[data-view="pacientes"]').click();
  await page.locator('#new-patient-button').click();
  await page.locator('#patient-registration-form button[type="submit"]').click();
  assert.equal(await page.locator('#patient-registration-form [aria-invalid="true"]').count(), 6);
  await page.fill('#new-patient-name', 'Toby');
  await page.selectOption('#new-patient-species', 'Canino');
  await page.fill('#new-patient-birth', '2026-10-27');
  await page.fill('#new-patient-weight', '-1');
  await page.fill('#new-tutor-name', 'Ana Pérez');
  await page.fill('#new-tutor-email', 'nuevo@example.test');
  await page.fill('#new-tutor-phone', '70000000');
  await page.fill('#new-tutor-address', 'Av. Central 123');
  await page.fill('#new-tutor-password', 'Prueba-2026');
  await page.fill('#new-tutor-confirm', 'Otra-2026');
  await page.locator('#patient-registration-form button[type="submit"]').click();
  assert.match(await page.locator('#new-patient-birth-error').innerText(), /no puede ser futura/);
  assert.match(await page.locator('#new-patient-weight-error').innerText(), /mayor que cero/);
  assert.match(await page.locator('#new-tutor-confirm-error').innerText(), /coincidir/);
  await page.fill('#new-patient-birth', '2024-05-10');
  await page.fill('#new-patient-weight', '12.5');
  await page.fill('#new-tutor-confirm', 'Prueba-2026');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('#cancel-patient-registration').click();
  assert.equal(await page.inputValue('#new-tutor-name'), 'Ana Pérez');
  assert.equal(await page.locator('#detail-dialog').evaluate((node) => node.open), true);
  if (output) {
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.runFor(250);
      assert.equal(await page.locator('#detail-dialog').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true);
      await page.screenshot({ path: resolve(output, `nuevo-paciente-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
  }
  registrationFailure = 409;
  await page.locator('#patient-registration-form button[type="submit"]').click();
  await page.locator('#patient-registration-form .form-error:not(.hidden)').waitFor();
  assert.match(await page.locator('#patient-registration-form .form-error').innerText(), /correo ya está registrado/);
  assert.equal(await page.inputValue('#new-tutor-phone'), '70000000');
  registrationFailure = 503;
  await page.locator('#patient-registration-form button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#patient-registration-form .form-error')?.textContent.includes('registro conjunto'));
  assert.equal(await page.inputValue('#new-patient-name'), 'Toby');
  registrationFailure = 0;
  await page.evaluate(() => { const form = document.querySelector('#patient-registration-form'); form.requestSubmit(); form.requestSubmit(); });
  await page.locator('#detail-dialog').waitFor({ state: 'hidden' });
  await page.locator('[data-patient-id="1001"]').waitFor();
  assert.equal(registrations, 1);
  assert.match(await page.locator('#patients-table').innerText(), /Toby/);
  assert.equal(await page.inputValue('#new-tutor-password'), '');
  assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).includes('Prueba-2026')), false);
  passed('New patient and tutor: required fields, birth date, weight and password validation; draft protection; duplicate and connection errors; single atomic request and directory refresh');

  for (const size of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.locator('#menu-toggle').click();
    await page.locator('[data-view="vacunacion"]').click();
    await page.locator('.fc-toolbar').waitFor();
    if (size.width < 520) await page.locator('.fc-listMonth-button').click();
    await page.clock.runFor(250);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Page overflow at ${size.width}`);
    if (size.width >= 520) assert.equal(await page.evaluate(() => {
      const calendar = document.querySelector('#vaccination-calendar');
      return calendar.scrollWidth <= calendar.clientWidth + 1;
    }), true, `Calendar should fit all seven columns at ${size.width}`);
    assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'false');
    if (output) {
      await page.clock.runFor(4500);
      await page.locator('#page-title').focus();
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: resolve(output, `vacunacion-${size.width}.png`), fullPage: true });
    }
  }
  passed('Desktop, tablet landscape/portrait and narrow screen layouts without page overflow');
  paginatePatients = true;
  assert.equal(await page.evaluate(async () => (await (await import('/js/services/patientService.js')).getPatients()).length), 501);
  paginatePatients = false;
  passed('Patient pagination includes records beyond the first 500');
  assert.deepEqual(errors, []);
  assert.equal(mutations, 4);
  assert.ok(requests.every((request) => !request.startsWith('DELETE')));
  passed('No JavaScript runtime errors; exactly four intended writes; no backend mutations outside clinical actions');
  console.log(`\n${checks.length} integration scenarios passed, plus date model assertions.`);
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
