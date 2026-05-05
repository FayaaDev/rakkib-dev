import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { fetchBootstrapToken } from '../api/client'

type SetupLinkQrProps = {
  title?: string
}

export function SetupLinkQr({ title = 'Setup Link' }: SetupLinkQrProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const setupUrl = useMemo(() => {
    const storedUrl = sessionStorage.getItem('rakkib_setup_url')?.trim()
    if (storedUrl) {
      return storedUrl
    }

    const token = sessionStorage.getItem('rakkib_setup_token')?.trim()
    if (!token) {
      return null
    }

    return `${window.location.origin}/?token=${encodeURIComponent(token)}`
  }, [])

  useEffect(() => {
    let cancelled = false

    if (setupUrl) {
      setResolvedUrl(setupUrl)
      return
    }

    void (async () => {
      try {
        const result = await fetchBootstrapToken()
        if (cancelled) {
          return
        }

        if (!result.token) {
          setResolvedUrl(null)
          return
        }

        const url = `${window.location.origin}/?token=${encodeURIComponent(result.token)}`
        sessionStorage.setItem('rakkib_setup_token', result.token)
        sessionStorage.setItem('rakkib_setup_url', url)
        setResolvedUrl(url)
      } catch {
        if (!cancelled) {
          setResolvedUrl(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [setupUrl])

  useEffect(() => {
    let cancelled = false

    if (!resolvedUrl) {
      setQrDataUrl(null)
      return
    }

    void (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(resolvedUrl, {
          errorCorrectionLevel: 'L',
          margin: 4,
          scale: 6,
        })
        if (!cancelled) {
          setQrDataUrl(dataUrl)
        }
      } catch {
        if (!cancelled) {
          setQrDataUrl(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [resolvedUrl])

  async function handleCopy() {
    if (!resolvedUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(resolvedUrl)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1400)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 1800)
    }
  }

  if (!resolvedUrl) {
    return null
  }

  return (
    <article className="setup-field-card setup-link-card" aria-label="Setup link QR code">
      <div className="setup-field-header">
        <div>
          <p className="section-label">Access</p>
          <h2>{title}</h2>
        </div>
        <button type="button" className="bridge-button" onClick={handleCopy}>
          {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy link'}
        </button>
      </div>

      <div className="setup-link-grid">
        <div className="setup-link-qr" aria-hidden="true">
          {qrDataUrl ? <img src={qrDataUrl} alt="" loading="lazy" decoding="async" /> : null}
        </div>
        <div className="setup-link-copy">
          <p className="hero-text">Scan on your phone to re-open this setup session.</p>
          <code className="setup-link-code" dir="ltr">
            {resolvedUrl}
          </code>
        </div>
      </div>
    </article>
  )
}
