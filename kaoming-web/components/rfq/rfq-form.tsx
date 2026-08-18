'use client';

import { useLocale, useTranslations } from 'next-intl';
import { cloneElement, useEffect, useId, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import {
  fieldErrorsOf,
  isAcceptedUpload,
  MAX_FILE_BYTES,
  MAX_FILES,
  rfqSchema,
  RFQ_SOURCES,
  UPLOAD_EXTENSIONS,
  type RfqFieldErrors,
  type RfqSource,
} from '@/lib/rfq/schema';

/**
 * The RFQ form (Part M.1) — two steps, contact then project.
 *
 * The split is not decoration: step one is what sales needs to reply at all, and
 * it is short enough that a buyer who abandons at step two has still told us who
 * they are. The machine selection carries in from wherever the visitor started
 * and is editable, because the buyer knows better than the link they clicked.
 *
 * Validation runs against the same schema the API uses, so the form can never
 * accept something the server will reject. The server still re-parses everything
 * — this is for the visitor's benefit, not the server's.
 */

export type MachineOption = { slug: string; name: string; category: string };

type Status = 'editing' | 'submitting' | 'sent' | 'error';

const INDUSTRIES = [
  'aerospace',
  'automotive',
  'dieMold',
  'energy',
  'heavyIndustry',
  'generalEngineering',
  'other',
] as const;

export function RfqForm({
  machines,
  countries,
  preselect,
  source: initialSource,
}: {
  machines: MachineOption[];
  /** Localised on the server: ICU data differs between Node and the browser,
   *  and generating this list on both sides breaks hydration. */
  countries: { code: string; name: string }[];
  /**
   * Machines already chosen, for the embedded form on a product page (Part
   * G.10, Scene 11) — the buyer is standing on the machine, so it arrives
   * selected without a query string having to say so. Still editable: the buyer
   * knows better than the page they happen to be on.
   */
  preselect?: string[];
  /** Entry point this instance represents, when it is not `/rfq` itself. */
  source?: RfqSource;
}) {
  const t = useTranslations('Rfq');
  const tNav = useTranslations('Nav');
  const locale = useLocale();
  const formId = useId();


  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<Status>('editing');

  /**
   * The GitHub Pages build has no server, so `/api/rfq` does not exist there.
   * Say so on the form rather than letting a buyer fill it in and meet a 404 —
   * a demo that pretends to take an enquiry is worse than one that admits it
   * cannot (see STATIC_EXPORT in next.config).
   */
  const submissionDisabled = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';
  const [errors, setErrors] = useState<RfqFieldErrors>({});
  const [selected, setSelected] = useState<string[]>(
    () => preselect?.filter((slug) => machines.some((machine) => machine.slug === slug)) ?? [],
  );
  const [source, setSource] = useState<RfqSource>(initialSource ?? 'rfq');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const openedAt = useRef(Date.now());
  const startedTracked = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  /**
   * The machine and entry point arrive in the query string, read here rather
   * than on the server. Touching `searchParams` in a Server Component makes the
   * route dynamic, and Next then streams the page's metadata into the body
   * instead of the head — which silently voids the `noindex` on the one page
   * that most needs it. Reading it after mount keeps the route static, and
   * because only pressed state changes, nothing on the page moves.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const requestedSource = params.get('source');
    if (RFQ_SOURCES.includes(requestedSource as RfqSource)) {
      setSource(requestedSource as RfqSource);
    }

    const requested = (params.get('machine') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => machines.some((machine) => machine.slug === value));
    if (requested.length) setSelected(requested);

    if (!startedTracked.current) {
      startedTracked.current = true;
      const started = RFQ_SOURCES.includes(requestedSource as RfqSource)
        ? (requestedSource as RfqSource)
        : (initialSource ?? 'rfq');
      track({ name: 'rfq_started', source: started });
    }
  }, [machines, initialSource]);

  const selectedMachines = () =>
    machines
      .filter((machine) => selected.includes(machine.slug))
      .map((machine) => ({ seriesSlug: machine.slug, seriesName: machine.name }));

  function readForm(form: HTMLFormElement) {
    const data = new FormData(form);
    return {
      company: String(data.get('company') ?? ''),
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      country: String(data.get('country') ?? ''),
      industry: String(data.get('industry') ?? ''),
      application: String(data.get('application') ?? ''),
      material: String(data.get('material') ?? ''),
      workpieceSize: String(data.get('workpieceSize') ?? ''),
      expectedProduction: String(data.get('expectedProduction') ?? ''),
      message: String(data.get('message') ?? ''),
      consent: data.get('consent') === 'on',
      website: String(data.get('website') ?? ''),
      machines: selectedMachines(),
      locale,
      source,
      elapsedMs: Date.now() - openedAt.current,
    };
  }

  /** Step one can be checked on its own, so the visitor is not sent forward
   *  with an address that will fail at the end. */
  function goToStep2() {
    const form = formRef.current;
    if (!form) return;

    const partial = rfqSchema.safeParse({ ...readForm(form), consent: true });
    const stepOneKeys = ['company', 'name', 'email', 'country'] as const;
    const found: RfqFieldErrors = partial.success ? {} : fieldErrorsOf(partial.error);
    const stepOneErrors = Object.fromEntries(
      Object.entries(found).filter(([key]) => stepOneKeys.includes(key as never)),
    );

    setErrors(stepOneErrors);
    if (Object.keys(stepOneErrors).length === 0) setStep(2);
  }

  function onFilesPicked(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    const accepted: File[] = [];
    let rejection: string | null = null;

    for (const file of picked) {
      if (accepted.length >= MAX_FILES) {
        rejection = t('files.tooMany', { max: MAX_FILES });
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejection = t('files.tooLarge', { name: file.name, max: 25 });
        continue;
      }
      if (!isAcceptedUpload(file.name, file.type)) {
        rejection = t('files.wrongType', { name: file.name });
        continue;
      }
      accepted.push(file);
    }

    setFiles(accepted);
    setFileError(rejection);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionDisabled) return;
    const form = event.currentTarget;
    const values = readForm(form);

    const parsed = rfqSchema.safeParse(values);
    if (!parsed.success) {
      const found = fieldErrorsOf(parsed.error);
      setErrors(found);
      // Send the visitor back to the step that actually has the problem.
      if (['company', 'name', 'email', 'country'].some((key) => key in found)) setStep(1);
      return;
    }

    setErrors({});
    setStatus('submitting');

    const body = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (key === 'machines') continue;
      body.set(key, typeof value === 'boolean' ? String(value) : String(value ?? ''));
    }
    body.set('machines', JSON.stringify(values.machines));
    for (const file of files) body.append('files', file);

    try {
      const response = await fetch('/api/rfq', { method: 'POST', body });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        if (result?.fields) setErrors(result.fields);
        setStatus('error');
        return;
      }

      track({ name: 'rfq_submitted', machines: selected, source });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    if (status === 'sent') summaryRef.current?.focus();
  }, [status]);

  if (status === 'sent') {
    return (
      <div
        ref={summaryRef}
        tabIndex={-1}
        className="border border-km-success/50 bg-km-charcoal p-8 sm:p-12"
      >
        <p className="km-label text-km-success">{t('success.label')}</p>
        <h2 className="mt-6 text-h2 text-km-paper uppercase">{t('success.title')}</h2>
        <p className="mt-6 max-w-[54ch] text-km-steel-400">{t('success.body')}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="max-w-[46rem]">
      {submissionDisabled ? (
        <p
          data-static-notice
          className="mb-10 border-s-2 border-km-warning ps-6 text-body text-km-offwhite"
        >
          {t('staticNotice')}
        </p>
      ) : null}
      {/* Honeypot. Hidden from sight and from assistive technology; only a bot
          that fills every input it finds will put anything in it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${formId}-website`}>Website</label>
        <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <ol className="mb-10 flex gap-6" aria-label={t('progress')}>
        {([1, 2] as const).map((index) => (
          <li key={index} className="flex items-center gap-3">
            <span
              aria-current={step === index ? 'step' : undefined}
              className={`km-label flex size-8 items-center justify-center border ${
                step === index
                  ? 'border-km-red bg-km-red text-km-paper'
                  : 'border-km-steel-600 text-km-steel-400'
              }`}
            >
              {index}
            </span>
            <span className={`km-label ${step === index ? 'text-km-paper' : 'text-km-steel-400'}`}>
              {t(`step${index}`)}
            </span>
          </li>
        ))}
      </ol>

      {/* Step one stays mounted when hidden so its values survive going back. */}
      <fieldset hidden={step !== 1} className="flex flex-col gap-6">
        <legend className="sr-only">{t('step1')}</legend>
        <Field name="company" label={t('fields.company')} error={errors.company} required>
          <input {...inputProps} name="company" autoComplete="organization" />
        </Field>
        <Field name="name" label={t('fields.name')} error={errors.name} required>
          <input {...inputProps} name="name" autoComplete="name" />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field name="email" label={t('fields.email')} error={errors.email} required>
            <input {...inputProps} name="email" type="email" autoComplete="email" />
          </Field>
          <Field name="phone" label={t('fields.phone')} error={errors.phone}>
            <input {...inputProps} name="phone" type="tel" autoComplete="tel" />
          </Field>
        </div>
        <Field name="country" label={t('fields.country')} error={errors.country} required>
          <select {...inputProps} name="country" defaultValue="">
            <option value="" disabled>
              {t('fields.countryPlaceholder')}
            </option>
            {countries.map((country) => (
              <option key={country.code} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="mt-4">
          <button
            type="button"
            onClick={goToStep2}
            className="km-label inline-flex min-h-11 items-center gap-2.5 border border-km-red bg-km-red px-5 py-3 text-km-paper transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-red-glow hover:bg-transparent hover:text-km-red-glow"
          >
            {t('next')}
          </button>
        </div>
      </fieldset>

      <fieldset hidden={step !== 2} className="flex flex-col gap-6">
        <legend className="sr-only">{t('step2')}</legend>

        <div>
          <p className="km-label mb-3 text-km-steel-400">{t('fields.machines')}</p>
          <ul className="flex flex-wrap gap-2">
            {machines.map((machine) => {
              const on = selected.includes(machine.slug);
              return (
                <li key={machine.slug}>
                  <button
                    type="button"
                    data-machine={machine.slug}
                    aria-pressed={on}
                    onClick={() =>
                      setSelected((current) =>
                        on
                          ? current.filter((slug) => slug !== machine.slug)
                          : [...current, machine.slug],
                      )
                    }
                    className={`km-label min-h-11 border px-3 py-2 transition-colors duration-(--duration-km) ease-(--ease-km) ${
                      on
                        ? 'border-km-red bg-km-red text-km-paper'
                        : 'border-km-steel-600 text-km-offwhite hover:border-km-offwhite'
                    }`}
                  >
                    {machine.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field name="industry" label={t('fields.industry')} error={errors.industry}>
            <select {...inputProps} name="industry" defaultValue="">
              <option value="">{t('fields.optional')}</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>
                  {industry === 'other' ? t('fields.other') : tNav(`application.${industry}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field name="material" label={t('fields.material')} error={errors.material}>
            <input {...inputProps} name="material" />
          </Field>
          <Field name="workpieceSize" label={t('fields.workpieceSize')} error={errors.workpieceSize}>
            <input {...inputProps} name="workpieceSize" />
          </Field>
          <Field
            name="expectedProduction"
            label={t('fields.expectedProduction')}
            error={errors.expectedProduction}
          >
            <input {...inputProps} name="expectedProduction" />
          </Field>
        </div>

        <Field name="application" label={t('fields.application')} error={errors.application}>
          <input {...inputProps} name="application" />
        </Field>

        <Field name="message" label={t('fields.message')} error={errors.message}>
          <textarea {...inputProps} name="message" rows={5} />
        </Field>

        <div>
          <label className="km-label mb-3 block text-km-steel-400" htmlFor={`${formId}-files`}>
            {t('fields.files')}
          </label>
          <input
            id={`${formId}-files`}
            type="file"
            multiple
            accept={UPLOAD_EXTENSIONS.map((extension) => `.${extension}`).join(',')}
            onChange={onFilesPicked}
            className="block w-full text-small text-km-offwhite file:me-4 file:border file:border-km-steel-600 file:bg-transparent file:px-4 file:py-2.5 file:text-km-offwhite"
          />
          <p className="mt-2 text-small text-km-steel-400">
            {t('files.hint', { max: MAX_FILES, size: 25 })}
          </p>
          {files.length ? (
            <ul className="mt-3 flex flex-col gap-1">
              {files.map((file) => (
                <li key={file.name} className="font-mono text-spec text-km-offwhite">
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                </li>
              ))}
            </ul>
          ) : null}
          {fileError ? (
            <p role="alert" className="mt-2 text-small text-km-warning">
              {fileError}
            </p>
          ) : null}
        </div>

        <div className="border-t border-km-steel-600/60 pt-6">
          <label className="flex items-start gap-3 text-small text-km-offwhite">
            <input
              name="consent"
              type="checkbox"
              required
              className="mt-1 size-4 shrink-0 accent-km-red"
            />
            <span>{t('fields.consent')}</span>
          </label>
          {errors.consent ? (
            <p role="alert" className="mt-2 text-small text-km-warning">
              {t('errors.consent')}
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="km-label min-h-11 border border-km-steel-600 px-5 py-3 text-km-offwhite transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-offwhite"
          >
            {t('back')}
          </button>
          <button
            type="submit"
            disabled={status === 'submitting' || submissionDisabled}
            className="km-label inline-flex min-h-11 items-center gap-2.5 border border-km-red bg-km-red px-5 py-3 text-km-paper transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-red-glow hover:bg-transparent hover:text-km-red-glow disabled:opacity-60"
          >
            {status === 'submitting' ? t('sending') : t('submit')}
          </button>
        </div>
      </fieldset>

      <p aria-live="polite" role="status" className="sr-only">
        {Object.keys(errors).length ? t('errors.summary', { count: Object.keys(errors).length }) : ''}
      </p>

      {status === 'error' ? (
        <p role="alert" className="mt-6 border border-km-warning/60 p-4 text-small text-km-warning">
          {t('errors.server')}
        </p>
      ) : null}
    </form>
  );
}

const inputProps = {
  className:
    'w-full border border-km-steel-600 bg-km-charcoal px-4 py-3 text-km-offwhite transition-colors duration-(--duration-km) ease-(--ease-km) focus:border-km-blue',
};

function Field({
  name,
  label,
  error,
  required = false,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string; required?: boolean }>;
}) {
  const id = `rfq-${name}`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="km-label mb-2 block text-km-steel-400">
        {label}
        {required ? <span className="ms-1 text-km-red-glow">*</span> : null}
      </label>
      {/* The control is cloned rather than re-declared per field so the id,
          error wiring and required flag can never drift apart. */}
      {cloneElement(children, {
        id,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
      })}
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-small text-km-warning">
          {error}
        </p>
      ) : null}
    </div>
  );
}
