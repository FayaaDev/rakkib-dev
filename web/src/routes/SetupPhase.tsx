import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, fetchSetupPhase, submitSetupPhase } from '../api/client'
import type { SetupPhasePayload, SetupQuestionField, SetupServiceCatalogItem } from '../api/types'
import { FieldEditor } from '../components/FieldEditor'
import { fieldLabel, renderFieldValue } from '../components/FieldRenderer'
import { SetupLinkQr } from '../components/SetupLinkQr'
import { SetupShell } from '../components/SetupShell'

const phaseLabels: Record<number, { title: string; description: string }> = {
  1: {
    title: 'Platform',
    description: 'Review the detected platform context and Docker prerequisites before proceeding.',
  },
  2: {
    title: 'Identity',
    description: 'Review the server name, domain, admin identity, and host-derived defaults.',
  },
  3: {
    title: 'Services',
    description: 'Review the service catalog and currently selected foundation, optional, and host services.',
  },
  4: {
    title: 'Cloudflare',
    description: 'Review the automatic Cloudflare tunnel defaults that will be used during setup.',
  },
  5: {
    title: 'Secrets',
    description: 'Review the selected secret-handling strategy and any redacted manual secret entries.',
  },
  6: {
    title: 'Confirm',
    description: 'Review the deployment summary and confirmation state before the run phase is added.',
  },
}

type PhaseState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; payload: SetupPhasePayload }

type CatalogFieldKey = 'foundation_services' | 'optional_services' | 'host_addons'

function formatServiceSubdomain(item: SetupServiceCatalogItem) {
  return item.default_subdomain ? `Subdomain: ${item.default_subdomain}` : null
}

function renderCatalogSection(
  title: string,
  fieldId: CatalogFieldKey,
  items: SetupServiceCatalogItem[] | undefined,
  selected: Set<string>,
  error: string | undefined,
  onToggle: (fieldId: CatalogFieldKey, slug: string) => void,
) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <article className="setup-field-card">
      <div className="setup-field-header">
        <div>
          <p className="section-label">Service Catalog</p>
          <h2>{title}</h2>
        </div>
      </div>

      <ul className="setup-service-list">
        {items.map((item) => (
          <li key={item.slug}>
            <button
              type="button"
              className={`setup-service-item${selected.has(item.slug) ? ' is-selected' : ''}`}
              onClick={() => onToggle(fieldId, item.slug)}
            >
              <strong>{item.label ?? item.slug}</strong>
              <div className="setup-service-tags">
                <span className="badge">{selected.has(item.slug) ? 'Selected' : 'Available'}</span>
                {formatServiceSubdomain(item) ? <span className="setup-service-tag">{formatServiceSubdomain(item)}</span> : null}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {error ? <p className="setup-field-error">{error}</p> : null}
    </article>
  )
}

function sanitizeBackendValue(phase: number, fieldId: string, value: unknown) {
  if (phase === 4 && fieldId === 'cloudflare_defaults' && value && typeof value === 'object' && !Array.isArray(value)) {
    const source = value as Record<string, unknown>
    const visibleEntries = Object.entries(source).filter(([key, entryValue]) => {
      if (entryValue === null || entryValue === undefined || entryValue === '') {
        return false
      }

      return ![
        'cloudflare.tunnel_uuid',
        'cloudflare.tunnel_creds_host_path',
        'cloudflare.tunnel_creds_container_path',
      ].includes(key)
    })

    return Object.fromEntries(visibleEntries)
  }

  return value
}

function renderBackendField(phase: number, field: SetupQuestionField, answer: unknown) {
  return (
    <div key={field.id} className="setup-backend-state-row">
      <strong>{fieldLabel(field)}</strong>
      <div className="setup-field-value">{renderFieldValue(sanitizeBackendValue(phase, field.id, answer))}</div>
    </div>
  )
}

export function SetupPhase() {
  const { phase } = useParams()
  const navigate = useNavigate()
  const phaseNumber = Number(phase)
  const [state, setState] = useState<PhaseState>({ status: 'loading' })
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transferRiskAccepted, setTransferRiskAccepted] = useState(false)

  useEffect(() => {
    if (!Number.isInteger(phaseNumber) || phaseNumber < 1) {
      setState({ status: 'error', message: 'Unknown setup phase.' })
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const payload = await fetchSetupPhase(phaseNumber)
        if (cancelled) {
          return
        }

        setState({ status: 'ready', payload })
        setDraft(buildInitialDraft(payload))
        setFieldErrors({})
        setSubmitError(null)
        setTransferRiskAccepted(false)
      } catch (error) {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : 'Unable to load this setup phase.'
        setState({ status: 'error', message })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [phaseNumber])

  const page = phaseLabels[phaseNumber] ?? {
    title: `Phase ${phaseNumber}`,
    description: 'Review the current backend-provided phase data.',
  }

  if (state.status === 'loading') {
    return (
      <SetupShell title={page.title} description={page.description} currentPhase={phaseNumber}>
        <section className="placeholder-card bridge-card" aria-labelledby="setup-phase-loading-title">
          <p className="section-label">Phase Data</p>
          <h2 id="setup-phase-loading-title">Loading phase details...</h2>
          <p className="hero-text">Fetching the live schema and current answers from the Python backend.</p>
          <div className="bridge-spinner" aria-hidden="true" />
        </section>
      </SetupShell>
    )
  }

  if (state.status === 'error') {
    return (
      <SetupShell title={page.title} description={page.description} currentPhase={phaseNumber}>
        <section className="placeholder-card bridge-card" aria-labelledby="setup-phase-error-title">
          <p className="section-label">Phase Data</p>
          <h2 id="setup-phase-error-title">Unable to load phase</h2>
          <p className="hero-text">{state.message}</p>
        </section>
      </SetupShell>
    )
  }

  const payload = state.payload
  const selectedServices = new Set<string>()
  const foundation = draft.foundation_services ?? payload.answers.foundation_services
  const selected = draft.optional_services ?? payload.answers.optional_services
  const hostAddons = draft.host_addons ?? payload.answers.host_addons
  const hasCatalogSelection = payload.phase === 3

  if (Array.isArray(foundation)) {
    foundation.forEach((item) => selectedServices.add(String(item)))
  }
  if (Array.isArray(selected)) {
    selected.forEach((item) => selectedServices.add(String(item)))
  }
  if (Array.isArray(hostAddons)) {
    hostAddons.forEach((item) => selectedServices.add(String(item)))
  }

  const editableFields = payload.fields.filter((field) => {
    if (field.repeat_for || ['derived', 'summary'].includes(field.type)) {
      return false
    }

    if (hasCatalogSelection && ['foundation_services', 'optional_services', 'host_addons'].includes(field.id)) {
      return false
    }

    return true
  })
  const readOnlyFields = payload.fields.filter((field) => field.repeat_for || ['derived', 'summary'].includes(field.type))
  const selectedValue = draft.optional_services
  const transferSelected = Array.isArray(selectedValue) && selectedValue.some((item) => String(item) === 'transfer')

  function toggleCatalogSelection(fieldId: CatalogFieldKey, slug: string) {
    setDraft((current) => {
      const existing = current[fieldId]
      const selectedValues = Array.isArray(existing)
        ? existing.map((item) => String(item))
        : []

      const nextValues = selectedValues.includes(slug)
        ? selectedValues.filter((item) => item !== slug)
        : [...selectedValues, slug]

      return { ...current, [fieldId]: nextValues }
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)
    setFieldErrors({})

    try {
      const result = await submitSetupPhase(payload.phase, {
        answers: draft,
        confirmations: transferSelected ? { transfer_public_risk: transferRiskAccepted } : {},
      })

      if (result.resume_phase >= 7) {
        navigate('/setup/confirm')
        return
      }

      if (result.resume_phase === payload.phase) {
        setState({ status: 'ready', payload: result.phase })
        setDraft(buildInitialDraft(result.phase))
        setTransferRiskAccepted(false)
        return
      }

      navigate(`/setup/phase/${result.resume_phase}`)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        setFieldErrors(error.fieldErrors ?? {})
      } else {
        setSubmitError('Unable to save this phase right now.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SetupShell title={page.title} description={page.description} currentPhase={payload.phase}>
      <div className="setup-phase-stack">
        <SetupLinkQr />

        <article className="setup-field-card setup-phase-meta">
          <div className="setup-field-header">
            <div>
              <p className="section-label">Backend State</p>
              <h2>Phase {payload.phase}</h2>
            </div>
            <span className="badge">{payload.complete ? 'Complete' : 'In progress'}</span>
          </div>

          {readOnlyFields.length > 0 ? <div className="setup-backend-state-list">{readOnlyFields.map((field) => renderBackendField(payload.phase, field, payload.answers[field.id]))}</div> : null}
        </article>

        {payload.service_catalog.foundation_bundle || payload.service_catalog.optional_services || payload.service_catalog.host_addons ? (
          <div className="setup-phase-stack">
            {renderCatalogSection(
              'Foundation Bundle',
              'foundation_services',
              payload.service_catalog.foundation_bundle,
              selectedServices,
              fieldErrors.foundation_services,
              toggleCatalogSelection,
            )}
            {renderCatalogSection(
              'Optional Services',
              'optional_services',
              payload.service_catalog.optional_services,
              selectedServices,
              fieldErrors.optional_services,
              toggleCatalogSelection,
            )}
            {renderCatalogSection(
              'Host Addons',
              'host_addons',
              payload.service_catalog.host_addons,
              selectedServices,
              fieldErrors.host_addons,
              toggleCatalogSelection,
            )}
          </div>
        ) : null}

        <form className="setup-phase-form" onSubmit={handleSubmit}>
          {submitError ? <p className="setup-submit-error">{submitError}</p> : null}

          {editableFields.map((field) => (
            <FieldEditor
              key={field.id}
              field={field}
              value={draft[field.id]}
              persistedAnswer={payload.answers[field.id]}
              error={fieldErrors[field.id]}
              onChange={(value) => setDraft((current) => ({ ...current, [field.id]: value }))}
            />
          ))}

          {transferSelected ? (
            <article className="setup-field-card">
              <div className="setup-field-header">
                <div>
                  <p className="section-label">Risk Acknowledgement</p>
                  <h2>transfer.sh is public</h2>
                </div>
              </div>
              <p className="hero-text">
                transfer.sh will be deployed as a public unauthenticated upload endpoint. Anyone who can reach the URL can upload files.
              </p>
              <label className="setup-checkbox-row">
                <input
                  type="checkbox"
                  checked={transferRiskAccepted}
                  onChange={(event) => setTransferRiskAccepted(event.target.checked)}
                />
                <span>I understand and accept this risk.</span>
              </label>
            </article>
          ) : null}
          <div className="setup-phase-actions">
            <button type="submit" className="bridge-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : payload.phase === 6 ? 'Save confirmation' : 'Save and continue'}
            </button>
          </div>
        </form>
      </div>
    </SetupShell>
  )
}

function buildInitialDraft(payload: SetupPhasePayload) {
  const initial: Record<string, unknown> = {}

  const defaultFoundation = (payload.service_catalog.foundation_bundle ?? []).map((item) => item.slug)

  payload.fields.forEach((field) => {
    if (field.repeat_for || ['derived', 'summary'].includes(field.type)) {
      return
    }

    const answer = payload.answers[field.id]

    if (field.type === 'secret_group') {
      initial[field.id] = {}
      return
    }

    if (answer !== undefined && answer !== null) {
      initial[field.id] = answer
      return
    }

    if (field.id === 'foundation_services') {
      initial[field.id] = defaultFoundation
      return
    }

    if (field.id === 'optional_services' || field.id === 'host_addons') {
      initial[field.id] = []
      return
    }

    if (field.type === 'multi_select') {
      initial[field.id] = []
      return
    }

    if (field.type === 'confirm') {
      const acceptedValues = Object.values(field.accepted_inputs ?? {})
      if (acceptedValues.every((value) => typeof value === 'boolean')) {
        initial[field.id] = typeof field.default === 'boolean' ? field.default : false
      } else {
        initial[field.id] = ''
      }
      return
    }

    initial[field.id] = ''
  })

  return initial
}
