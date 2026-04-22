'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Generate unique session identifiers
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substr(2, 5)
    
    const pid = `client_test_${timestamp}_${randomSuffix}`
    const uid = `client_user_${timestamp}_${randomSuffix}`
    const oiSession = `session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    const oiSig = `sig_${Math.random().toString(36).substr(2, 16)}`
    
    // Redirect to mock survey selection with generated parameters
    router.push(`/mock-survey?project=client_test&pid=${pid}&uid=${uid}&oi_session=${oiSession}&oi_sig=${oiSig}`)
  }, [router])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xl font-semibold">Redirecting to survey...</p>
      </div>
    </div>
  )
}
