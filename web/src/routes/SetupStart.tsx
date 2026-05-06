import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchSetupResume, fetchSetupRunStatus } from '../api/client'
import { SetupBridge } from './SetupBridge'

type StartState =
  | { status: 'loading' }
  | { status: 'error'; message: string }

export function SetupStart() {
  const location = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState<StartState>({ status: 'loading' })

  const params = new URLSearchParams(location.search)
  const hasToken = params.has('token')

  useEffect(() => {
    if (hasToken) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const resume = await fetchSetupResume()
        if (cancelled) {
          return
        }

        if (resume.resume_phase >= 7) {
          const run = await fetchSetupRunStatus()
          if (cancelled) {
            return
          }

          if (run.running) {
            navigate('/setup/run', { replace: true })
            return
          }

          if (resume.confirmed && resume.deployment_succeeded) {
            navigate('/setup/phase/3', { replace: true })
            return
          }

          navigate('/setup/confirm', { replace: true })
          return
        }

        navigate(`/setup/phase/${resume.resume_phase}`, { replace: true })
      } catch (error) {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : 'Unable to load the active setup session.'
        setState({ status: 'error', message })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hasToken, navigate])

  if (hasToken) {
    return <SetupBridge />
  }

  if (state.status === 'loading') {
    return (
      <main className="shell route-placeholder setup-loading-frame">
        <p className="simple-loading" role="status">Loading...</p>
      </main>
    )
  }

  return (
    <main className="shell route-placeholder">
      <section className="placeholder-card bridge-card" aria-labelledby="setup-start-title">
        <p className="section-label">Setup Session</p>
        <h1 id="setup-start-title">Unable to resume setup</h1>
        <p className="hero-text">{state.message}</p>
      </section>
    </main>
  )
}
