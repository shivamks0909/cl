'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

function SurveyContent() {
  const searchParams = useSearchParams()
  const pid = searchParams.get('pid') || ''
  const uid = searchParams.get('uid') || ''
  const oiSession = searchParams.get('oi_session') || uid || ''
  const oiSig = searchParams.get('oi_sig') || ''
  const oiSid = searchParams.get('oi_sid') || ''
  
  const [step, setStep] = useState(1) // 1: Age, 2: Gender, 3: Survey
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Validate required params on client side only
  useEffect(() => {
    setIsLoading(false)
    if (!pid || !uid) {
      setHasError(true)
    }
  }, [pid, uid])

  // Show loading state during hydration
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if missing params
  if (hasError) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
          <p className="text-gray-400">Missing PID or UID. Please contact the survey provider.</p>
          <a href="/mock-select" className="mt-4 inline-block text-blue-400 hover:underline">
            Go to Test Selection →
          </a>
        </div>
      </div>
    )
  }

  const handleAgeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!age || parseInt(age) < 18 || parseInt(age) > 65) {
      setResult('Age must be between 18 and 65')
      return
    }
    setStep(2)
    setResult('')
  }

  const handleGenderSelect = (selectedGender: string) => {
    setGender(selectedGender)
    setSurveyLoading(true)
    setResult('')

    // Simulate survey loading
    setTimeout(() => {
      setStep(3)
      setSurveyLoading(false)
    }, 1000)
  }

  const handleSurveyComplete = async () => {
    // Redirect to your complete redirect with session tracking ID
    window.location.href = `/redirect/complete?pid=${pid}&uid=${uid}${oiSid ? `&oi_sid=${oiSid}` : ''}`
  }

  const handleTerminate = async () => {
    // Redirect to your terminate redirect with session tracking ID
    window.location.href = `/redirect/terminate?pid=${pid}&uid=${uid}${oiSid ? `&oi_sid=${oiSid}` : ''}`
  }

  const handleQuotaFull = async () => {
    // Redirect to your quota full redirect with session tracking ID
    window.location.href = `/redirect/quotafull?pid=${pid}&uid=${uid}${oiSid ? `&oi_sid=${oiSid}` : ''}`
  }

  // Step 1: Age Question
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Survey Screening</h1>
            <p className="text-gray-400">Step 1 of 2</p>
          </div>

          <form onSubmit={handleAgeSubmit} className="space-y-6">
            <div>
              <label className="block text-white font-semibold mb-3">
                What is your age?
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age (18-65)"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="18"
                max="65"
                required
              />
            </div>

            {result && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg text-sm">
                {result}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              Next →
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="text-xs text-gray-500 font-mono">
              <div>PID: {pid}</div>
              <div>UID: {uid}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Gender Question
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Survey Screening</h1>
            <p className="text-gray-400">Step 2 of 2</p>
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-4 text-center">
              What is your gender?
            </label>
            <p className="text-sm text-yellow-400 text-center mb-4">
              ⚠️ This survey is for males only
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleGenderSelect('male')}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">♂️</span>
                Male
              </button>

              <button
                onClick={handleTerminate}
                className="w-full py-4 px-6 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">♀️</span>
                Female (Disqualified)
              </button>

              <button
                onClick={handleTerminate}
                className="w-full py-4 px-6 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">⚧</span>
                Other (Disqualified)
              </button>
            </div>
          </div>

          {surveyLoading && (
            <div className="flex items-center justify-center space-x-3 text-purple-400">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Verifying eligibility...</span>
            </div>
          )}

          {result && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg text-sm">
              {result}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="text-xs text-gray-500 font-mono">
              <div>PID: {pid}</div>
              <div>UID: {uid}</div>
              <div>Age: {age}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Main Survey
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Main Survey</h1>
            <p className="text-gray-400">Thank you for qualifying!</p>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-6 mb-8 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Survey Questions</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2">
                  1. How satisfied are you with our service?
                </label>
                <div className="flex gap-2">
                  {['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'].map((option, idx) => (
                    <button
                      key={idx}
                      className="flex-1 py-2 px-3 bg-gray-700 hover:bg-purple-600 text-white text-xs rounded transition-all"
                    >
                      {option.split(' ').slice(-1)[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  2. Would you recommend us to others?
                </label>
                <div className="flex gap-2">
                  {['No', 'Maybe', 'Yes'].map((option, idx) => (
                    <button
                      key={idx}
                      className="flex-1 py-2 px-4 bg-gray-700 hover:bg-purple-600 text-white rounded transition-all"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleSurveyComplete}
              className="py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              ✅ Complete Survey
            </button>

            <button
              onClick={handleTerminate}
              className="py-4 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              ❌ Terminate
            </button>

            <button
              onClick={handleQuotaFull}
              className="py-4 px-6 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              📊 Quota Full
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="text-xs text-gray-500 font-mono text-center">
              <div className="grid grid-cols-2 gap-2">
                <div>PID: <span className="text-green-400">{pid}</span></div>
                <div>UID: <span className="text-purple-400">{uid}</span></div>
                <div>Age: <span className="text-blue-400">{age}</span></div>
                <div>Gender: <span className="text-cyan-400">{gender}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default function ClientSurveyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading survey...</p>
        </div>
      </div>
    }>
      <SurveyContent />
    </Suspense>
  )
}
