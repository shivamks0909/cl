'use client'

import { useState, use, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function TestSurveyPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  // ── Extract context from URL params ─────────────────────────────────────
  const pid = resolvedParams.code

  // Session token injected by /r/ route (supplier flow)
  const urlSession =
    searchParams.get('transactionId') ||
    searchParams.get('oi_session') ||
    searchParams.get('clickid') ||
    null

  // UID — prefer oi_uid (injected by /r/), then plain uid
  const urlUid =
    searchParams.get('oi_uid') ||
    searchParams.get('uid') ||
    searchParams.get('respondent_id') ||
    null

  // If session came from URL → this is a supplier entry (already tracked by /r/)
  const isSupplierEntry = !!urlSession

  // ── Component state ──────────────────────────────────────────────────────
  const [uid, setUid] = useState<string>(urlUid || '')
  const [sessionToken, setSessionToken] = useState<string | null>(urlSession)
  const [source, setSource] = useState<string>(isSupplierEntry ? 'supplier' : 'direct')
  const [supplierName, setSupplierName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!isSupplierEntry) // skip init if already tracked
  const [error, setError] = useState<string | null>(null)
  const [actionDone, setActionDone] = useState<string | null>(null)

  // ── Initialize session (direct flow only) ────────────────────────────────
  useEffect(() => {
    if (isSupplierEntry) {
      // Session already created by /r/ route — fetch supplier name from DB
      fetch(`/api/track/lookup?pid=${pid}&session=${urlSession}`)
        .then(r => r.json())
        .then(d => {
          if (d.supplier_name) setSupplierName(d.supplier_name)
          if (d.uid) setUid(d.uid)
        })
        .catch(() => {}) // non-fatal
      setIsLoading(false)
      return
    }

    // Direct flow — no session yet, create one
    const effectiveUid = urlUid || `direct_${Date.now()}`
    setUid(effectiveUid)

    const init = async () => {
      try {
        const res = await fetch(
          `/api/track/entry?pid=${encodeURIComponent(pid)}&uid=${encodeURIComponent(effectiveUid)}&source=direct`,
          { method: 'GET' }
        )
        const data = await res.json()

        if (data.success && data.token) {
          setSessionToken(data.token)
          setSource('direct')
        } else {
          setError(data.message || data.error || 'Failed to initialize session')
        }
      } catch (err: any) {
        setError(err.message || 'Network error')
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Button handlers ──────────────────────────────────────────────────────
  const handleAction = (status: string) => {
    if (!sessionToken) {
      alert('Session not ready. Please wait or refresh.')
      return
    }
    setActionDone(status)
    router.push(`/redirect/${status}?pid=${pid}&uid=${encodeURIComponent(uid)}&clickid=${sessionToken}`)
  }

  // ── Source badge config ──────────────────────────────────────────────────
  const sourceBadge =
    source === 'supplier'
      ? { label: 'SUPPLIER', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' }
      : { label: 'DIRECT', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' }

  // ── Loading screen ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-10 text-center border border-white/20">
          <div className="w-14 h-14 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Initializing Session…</p>
          <p className="text-white/60 text-sm mt-1">Setting up your test environment</p>
        </div>
      </div>
    )
  }

  // ── Error screen ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-10 max-w-md w-full text-center border border-red-400/30">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-3xl">✕</span>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Session Error</h2>
          <p className="text-red-300 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Main survey UI ───────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}
    >
      <div className="w-full max-w-lg">

        {/* Header card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-4 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-white font-bold text-2xl tracking-tight">🧪 Test Survey</h1>
            {/* Source badge */}
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${sourceBadge.bg} ${sourceBadge.text}`}>
              <span className={`w-2 h-2 rounded-full ${sourceBadge.dot} animate-pulse`} />
              {sourceBadge.label}
            </span>
          </div>

          {/* Info rows */}
          <div className="space-y-2">
            <InfoRow label="Project ID (PID)" value={pid} mono />
            <InfoRow label="User ID (UID)" value={uid || '—'} mono />
            <InfoRow label="Source" value={source === 'supplier' ? `Supplier${supplierName ? ` — ${supplierName}` : ''}` : 'Direct'} />
            <InfoRow
              label="Session Token"
              value={sessionToken ? `${sessionToken.substring(0, 20)}…` : 'Generating…'}
              mono
              dim
            />
          </div>
        </div>

        {/* Expected behavior card */}
        <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/10 text-xs text-white/50 space-y-1">
          <p className="text-white/70 font-semibold mb-2">Expected Redirect Behavior</p>
          {source === 'supplier' ? (
            <>
              <p>✅ Complete  →  mackinsights.com/redirect/complete</p>
              <p>✅ Terminate →  mackinsights.com/redirect/terminate</p>
              <p>✅ Quota     →  mackinsights.com/redirect/quotafull</p>
              <p className="text-purple-400 mt-1">🚫 Your landing page will NOT open (supplier flow)</p>
            </>
          ) : (
            <>
              <p>✅ Complete  →  Your internal complete page</p>
              <p>✅ Terminate →  Your internal terminate page</p>
              <p>✅ Quota     →  Your internal quota page</p>
              <p className="text-blue-400 mt-1">✅ Your landing page WILL open (direct flow)</p>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <ActionButton
            id="btn-complete"
            label="✓  Complete Survey"
            onClick={() => handleAction('complete')}
            disabled={!sessionToken || !!actionDone}
            color="green"
          />
          <ActionButton
            id="btn-terminate"
            label="✕  Terminate Survey"
            onClick={() => handleAction('terminate')}
            disabled={!sessionToken || !!actionDone}
            color="pink"
          />
          <ActionButton
            id="btn-quota"
            label="⚠  Quota Full"
            onClick={() => handleAction('quotafull')}
            disabled={!sessionToken || !!actionDone}
            color="amber"
          />
        </div>

        {actionDone && (
          <div className="mt-4 text-center text-sm text-white/60 animate-pulse">
            Redirecting after &quot;{actionDone}&quot;…
          </div>
        )}

        <p className="text-center text-white/30 text-xs mt-6">
          PanelFlow · Full Flow Verification · {source === 'supplier' ? 'Supplier' : 'Direct'} Mode
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  label, value, mono = false, dim = false
}: { label: string; value: string; mono?: boolean; dim?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-white/50 text-sm shrink-0">{label}</span>
      <span className={`text-right text-sm break-all ${mono ? 'font-mono' : ''} ${dim ? 'text-white/40' : 'text-white font-semibold'}`}>
        {value}
      </span>
    </div>
  )
}

function ActionButton({
  id, label, onClick, disabled, color
}: { id: string; label: string; onClick: () => void; disabled: boolean; color: 'green' | 'pink' | 'amber' }) {
  const styles = {
    green: 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30',
    pink:  'bg-pink-500   hover:bg-pink-400   shadow-pink-500/30',
    amber: 'bg-amber-500  hover:bg-amber-400  shadow-amber-500/30',
  }
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 px-6 rounded-2xl text-white font-bold text-base transition-all duration-200 shadow-lg
        ${styles[color]}
        hover:-translate-y-0.5 active:scale-95
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
    >
      {label}
    </button>
  )
}