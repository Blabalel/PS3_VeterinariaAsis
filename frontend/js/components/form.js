import { $, setDetailDirty, setDetailBusy } from '../utils.js';

/** Inline validation and draft protection shared by clinical forms. */
export function bindClinicalForm(form, validators, onSubmit) {
  form.noValidate = true;
  const initial = JSON.stringify([...new FormData(form)]);
  const summary = document.createElement('p');
  summary.className = 'form-error hidden';
  summary.setAttribute('role', 'alert');
  form.prepend(summary);

  function validate(input) {
    const message = validators[input.id]?.(input.value.trim()) ?? '';
    let error = $(`#${input.id}-error`, form);
    if (!error) {
      error = document.createElement('small');
      error.id = `${input.id}-error`;
      error.className = 'field-error';
      input.insertAdjacentElement('afterend', error);
      input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' '));
    }
    input.setAttribute('aria-invalid', String(Boolean(message)));
    error.textContent = message;
    return !message;
  }

  form.addEventListener('input', (event) => {
    setDetailDirty(JSON.stringify([...new FormData(form)]) !== initial);
    if (event.target.getAttribute('aria-invalid') === 'true') validate(event.target);
  });
  form.addEventListener('change', () => setDetailDirty(JSON.stringify([...new FormData(form)]) !== initial));
  for (const id of Object.keys(validators)) $(`#${id}`, form)?.addEventListener('blur', (event) => validate(event.target));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = Object.keys(validators).map((id) => $(`#${id}`, form)).filter(Boolean);
    const valid = fields.map(validate).every(Boolean);
    if (!valid) { fields.find((input) => input.getAttribute('aria-invalid') === 'true')?.focus(); return; }
    const button = $('button[type="submit"]', form);
    if (button.disabled) return;
    const label = button.textContent;
    const controls = [...form.querySelectorAll('input, select, textarea, button')].map((control) => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'Guardando…';
    summary.classList.add('hidden');
    setDetailBusy(true);
    try {
      await onSubmit(() => { setDetailDirty(false); setDetailBusy(false); });
    } catch (error) {
      summary.textContent = `No se pudo guardar. ${error.message} Tus datos se conservan; puedes reintentar.`;
      summary.classList.remove('hidden');
    } finally {
      setDetailBusy(false);
      controls.forEach(([control, disabled]) => { if (control.isConnected) control.disabled = disabled; });
      form.setAttribute('aria-busy', 'false');
      if (button.isConnected) { button.disabled = false; button.textContent = label; }
    }
  });
}
