'use client'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense, useEffect } from 'react'

function SurveyContent() {
  const searchParams = useSearchParams()
  const project = searchParams.get('project') || ''
  const receivedPid = searchParams.get('pid') || ''
  const receivedUid = searchParams.get('uid') || ''
  
  // Use received PID/UID or auto-generate
  const [pid, setPid] = useState(receivedPid)
  const [uid, setUid] = useState(receivedUid)
  const [oiSession, setOiSession] = useState('')
  const [oiSig, setOiSig] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  // Generate session data on mount if not received
  useEffect(() => {
    if (project) {
      const generatedSession = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const generatedSig = `sig_${Math.random().toString(36).substr(2, 16)}`
      
      if (!pid) {
        const generatedPid = `test_project_${Date.now()}`
        setPid(generatedPid)
      }
      if (!uid) {
        const generatedUid = `user_${Date.now()}`
        setUid(generatedUid)
      }
      
      setOiSession(generatedSession)
      setOiSig(generatedSig)
    }
  }, [project, receivedPid, receivedUid])

  const handleCallback = async (callbackType: string) => {
    if (!pid || !oiSession) {
      setResult('Error: Session not initialized. Please refresh the page.')
      return
    }

    setLoading(true)
    try {
      // First, ensure response record exists for this session
      const initRes = await fetch('/api/mock-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pid: pid,
          oi_session: oiSession,
          uid: uid || oiSession
        })
      })

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}))
        setResult('Init failed: ' + (errData.error || 'Unknown error'))
        setLoading(false)
        return
      }

      const initData = await initRes.json()
      if (!initData.success) {
        setResult('Init failed: ' + (initData.error || 'Unknown error'))
        setLoading(false)
        return
      }

      // Now trigger callback
      const res = await fetch(`/api/callback?pid=${pid}&cid=${oiSession}&type=${callbackType}&sig=${oiSig}`)
      const data = await res.json()
      if (data.success) {
        // Redirect to status page with PID and UID
        window.location.href = `/status?type=${callbackType}&pid=${pid}&uid=${uid || oiSession}`
      } else {
        setResult('Error: ' + data.error)
      }
    } catch (err: any) {
      setResult('Failed to connect: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-400">No project specified. Please select a survey from the <a href="/mock-select" className="text-blue-400 hover:underline">selection page</a>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-[#111] border border-[#222] p-8 rounded-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

        <h1 className="text-2xl font-bold mb-2">Test Client Survey</h1>
        <p className="text-gray-400 text-sm mb-6">
          This is a mock survey. In a real scenario, this is where the 3rd party host asks their questions.
        </p>

        <div className="bg-[#1A1A1A] p-4 rounded-lg mb-6 text-xs text-gray-500 break-all border border-[#222]">
          <div className="text-gray-300 font-semibold mb-2">Session Data:</div>
          <div className="grid grid-cols-2 gap-2">
            <div><strong>Project:</strong> <span className="text-blue-400">{project}</span></div>
            <div><strong>PID:</strong> <span className="text-green-400">{pid || 'Generating...'}</span></div>
            <div><strong>UID:</strong> <span className="text-purple-400">{uid || 'Generating...'}</span></div>
            <div><strong>Session:</strong> <span className="text-yellow-400">{oiSession || 'Generating...'}</span></div>
            <div className="col-span-2"><strong>Signature:</strong> <span className="text-pink-400">{oiSig || 'Generating...'}</span></div>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => handleCallback('complete')}
            disabled={loading || !pid}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 transition-colors font-medium rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : !pid ? 'Initializing...' : 'Finish Survey (Complete)'}
          </button>

          <button 
            onClick={() => handleCallback('terminate')}
            disabled={loading || !pid}
            className="w-full py-3 px-4 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-900/50 transition-colors font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Disqualify Me (Terminate)
          </button>

          <button 
            onClick={() => handleCallback('quota')}
            disabled={loading || !pid}
            className="w-full py-3 px-4 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 border border-yellow-900/50 transition-colors font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Survey Full (Quota Full)
          </button>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded text-sm">
            {result}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MockSurvey() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Loading Test Survey...</div>}>
      <SurveyContent />
    </Suspense>
  )
}
