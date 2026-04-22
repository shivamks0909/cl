'use client'

import { useState, useEffect, use } from 'react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'

export default function MockSurveyPage({ params }: { params: Promise<{ code: string }> }) {
    const resolvedParams = use(params)
    const searchParams = useSearchParams()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<string | null>(null)

    const pid = resolvedParams.code || searchParams.get('pid') || searchParams.get('code')
    let uid = searchParams.get('uid') || searchParams.get('respondent_id')
    if (!uid) uid = 'user_' + Date.now()

    useEffect(() => {
        // Initialize response if not exists
        if (pid && uid) {
            console.log('Mock survey initialized for:', { pid, uid })
        }
    }, [pid, uid])

    const handleComplete = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/respondent-stats/lookup?pid=${pid}&uid=${uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await res.json()
            console.log('Response data:', data)

            // Redirect to complete landing
            router.push(`/redirect/complete?pid=${pid}&uid=${uid}`)
        } catch (err) {
            console.error('Error:', err)
            setLoading(false)
        }
    }

    const handleTerminate = async () => {
        setLoading(true)
        try {
            router.push(`/redirect/terminate?pid=${pid}&uid=${uid}`)
        } catch (err) {
            console.error('Error:', err)
            setLoading(false)
        }
    }

    const handleQuotaFull = async () => {
        setLoading(true)
        try {
            router.push(`/redirect/quotafull?pid=${pid}&uid=${uid}`)
        } catch (err) {
            console.error('Error:', err)
            setLoading(false)
        }
    }

    if (!pid) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Mock Survey</h1>
                    <p className="text-gray-600">Project ID missing</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 2H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Mock Survey</h1>
                    <p className="text-gray-600 mt-2">Project: {pid}</p>
                    {uid && <p className="text-sm text-gray-500">UID: {uid}</p>}
                </div>

                <div className="space-y-4 mt-8">
                    <button
                        onClick={handleComplete}
                        disabled={loading}
                        className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Complete Survey
                    </button>

                    <button
                        onClick={handleTerminate}
                        disabled={loading}
                        className="w-full py-4 px-6 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Terminate Survey
                    </button>

                    <button
                        onClick={handleQuotaFull}
                        disabled={loading}
                        className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Quota Full
                    </button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Click any button to complete the survey
                </div>
            </div>
        </div>
    )
}