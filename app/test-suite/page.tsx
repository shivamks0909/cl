'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TestCase {
  id: string
  name: string
  description: string
  age: string
  gender: 'male' | 'female' | 'other'
  expectedOutcome: 'complete' | 'terminate' | 'quota'
  expectedRedirect: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  actualRedirect?: string
  notes?: string
}

export default function SurveyTestSuite() {
  const router = useRouter()
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: 'tc-001',
      name: 'Valid Male Completion',
      description: 'Age 25, Male - Should complete successfully',
      age: '25',
      gender: 'male',
      expectedOutcome: 'complete',
      expectedRedirect: '/redirect/complete',
      status: 'pending'
    },
    {
      id: 'tc-002',
      name: 'Female Termination',
      description: 'Age 30, Female - Should terminate (gender mismatch)',
      age: '30',
      gender: 'female',
      expectedOutcome: 'terminate',
      expectedRedirect: '/redirect/terminate',
      status: 'pending'
    },
    {
      id: 'tc-003',
      name: 'Age Too Young',
      description: 'Age 16 - Should fail age validation',
      age: '16',
      gender: 'male',
      expectedOutcome: 'terminate',
      expectedRedirect: '/redirect/terminate',
      status: 'pending'
    },
    {
      id: 'tc-004',
      name: 'Age Too Old',
      description: 'Age 70 - Should fail age validation',
      age: '70',
      gender: 'male',
      expectedOutcome: 'terminate',
      expectedRedirect: '/redirect/terminate',
      status: 'pending'
    },
    {
      id: 'tc-005',
      name: 'Quota Full Scenario',
      description: 'Valid user, but quota full',
      age: '35',
      gender: 'male',
      expectedOutcome: 'quota',
      expectedRedirect: '/redirect/quotafull',
      status: 'pending'
    },
    {
      id: 'tc-006',
      name: 'Boundary Age - 18',
      description: 'Age 18 (minimum valid) - Should complete',
      age: '18',
      gender: 'male',
      expectedOutcome: 'complete',
      expectedRedirect: '/redirect/complete',
      status: 'pending'
    },
    {
      id: 'tc-007',
      name: 'Boundary Age - 65',
      description: 'Age 65 (maximum valid) - Should complete',
      age: '65',
      gender: 'male',
      expectedOutcome: 'complete',
      expectedRedirect: '/redirect/complete',
      status: 'pending'
    },
    {
      id: 'tc-008',
      name: 'Other Gender',
      description: 'Age 28, Other gender - Should terminate',
      age: '28',
      gender: 'other',
      expectedOutcome: 'terminate',
      expectedRedirect: '/redirect/terminate',
      status: 'pending'
    }
  ])

  const [currentTest, setCurrentTest] = useState<TestCase | null>(null)
  const [testStep, setTestStep] = useState(0) // 0: Not started, 1: Age, 2: Gender, 3: Survey, 4: Complete
  const [generatedPid, setGeneratedPid] = useState('')
  const [generatedUid, setGeneratedUid] = useState('')
  const [autoMode, setAutoMode] = useState(false)
  const [results, setResults] = useState<{
    total: number
    passed: number
    failed: number
    pending: number
  }>({ total: 8, passed: 0, failed: 0, pending: 8 })

  // Generate test session
  useEffect(() => {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substr(2, 5)
    setGeneratedPid(`test_project_${timestamp}_${randomSuffix}`)
    setGeneratedUid(`test_user_${timestamp}_${randomSuffix}`)
  }, [])

  const runTest = (testCase: TestCase) => {
    setCurrentTest(testCase)
    setTestStep(1)
    
    setTestCases(prev => prev.map(tc => 
      tc.id === testCase.id ? { ...tc, status: 'running' } : tc
    ))
  }

  const handleAgeSubmit = () => {
    if (!currentTest) return

    const age = parseInt(currentTest.age)
    
    // Check age validation
    if (age < 18 || age > 65) {
      // Age failed - should terminate
      const expectedRedirect = currentTest.expectedRedirect
      const actualRedirect = `/redirect/terminate?pid=${generatedPid}&uid=${generatedUid}`
      
      completeTest(currentTest.id, 'terminate', actualRedirect, expectedRedirect.includes('terminate'))
      return
    }

    setTestStep(2)
  }

  const handleGenderSelect = (selectedGender: 'male' | 'female' | 'other') => {
    if (!currentTest) return

    // Check gender validation
    if (selectedGender !== 'male') {
      // Gender failed - should terminate
      const expectedRedirect = currentTest.expectedRedirect
      const actualRedirect = `/redirect/terminate?pid=${generatedPid}&uid=${generatedUid}`
      
      completeTest(currentTest.id, 'terminate', actualRedirect, expectedRedirect.includes('terminate'))
      return
    }

    setTestStep(3)
  }

  const handleSurveyAction = (action: 'complete' | 'terminate' | 'quota') => {
    if (!currentTest) return

    const expectedRedirect = currentTest.expectedRedirect
    const actualRedirect = `/redirect/${action}?pid=${generatedPid}&uid=${generatedUid}`
    
    completeTest(currentTest.id, action, actualRedirect, expectedRedirect.includes(action))
  }

  const completeTest = (testId: string, outcome: string, actualRedirect: string, passed: boolean) => {
    setTestCases(prev => prev.map(tc => 
      tc.id === testId 
        ? { 
            ...tc, 
            status: passed ? 'passed' : 'failed',
            actualRedirect,
            notes: passed ? '✓ Test passed' : `✗ Expected ${tc.expectedRedirect}, got ${actualRedirect}`
          }
        : tc
    ))

    setCurrentTest(null)
    setTestStep(0)

    // Update results
    const updatedCases = testCases.map(tc => 
      tc.id === testId 
        ? { ...tc, status: passed ? 'passed' : 'failed', actualRedirect }
        : tc
    )

    const passedCount = updatedCases.filter(tc => tc.status === 'passed').length
    const failedCount = updatedCases.filter(tc => tc.status === 'failed').length
    const pendingCount = updatedCases.filter(tc => tc.status === 'pending').length

    setResults({
      total: updatedCases.length,
      passed: passedCount,
      failed: failedCount,
      pending: pendingCount
    })
  }

  const runAllTests = async () => {
    // Run tests sequentially with delays
    for (const testCase of testCases) {
      if (testCase.status === 'pending') {
        await new Promise(resolve => setTimeout(resolve, 500))
        runTest(testCase)
        
        // Auto-advance through steps
        await new Promise(resolve => setTimeout(resolve, 300))
        
        if (testStep >= 1) {
          await new Promise(resolve => setTimeout(resolve, 300))
          handleGenderSelect(currentTest?.gender as any)
          
          await new Promise(resolve => setTimeout(resolve, 300))
          handleSurveyAction(currentTest?.expectedOutcome as any)
        }
      }
    }
  }

  const resetAllTests = () => {
    setTestCases(prev => prev.map(tc => ({
      ...tc,
      status: 'pending',
      actualRedirect: undefined,
      notes: undefined
    })))
    setCurrentTest(null)
    setTestStep(0)
    setResults({ total: testCases.length, passed: 0, failed: 0, pending: testCases.length })
  }

  const openSurveyInNewTab = (testCase: TestCase) => {
    const url = `/client-survey?pid=${generatedPid}&uid=${generatedUid}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🧪 Survey Test Suite</h1>
          <p className="text-gray-300">Comprehensive testing interface for client survey redirects</p>
        </div>

        {/* Session Info */}
        <div className="bg-blue-900/30 backdrop-blur-sm border border-blue-700/50 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600/20 p-2 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-semibold">Test Session Active</h4>
                <p className="text-gray-400 text-sm">Session data ready for testing</p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-400 font-mono">
              <div>PID: <span className="text-green-400">{generatedPid}</span></div>
              <div>UID: <span className="text-purple-400">{generatedUid}</span></div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white">{results.total}</div>
            <div className="text-gray-400 text-sm">Total Tests</div>
          </div>
          <div className="bg-green-900/30 backdrop-blur-sm border border-green-700/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{results.passed}</div>
            <div className="text-gray-400 text-sm">Passed</div>
          </div>
          <div className="bg-red-900/30 backdrop-blur-sm border border-red-700/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{results.failed}</div>
            <div className="text-gray-400 text-sm">Failed</div>
          </div>
          <div className="bg-yellow-900/30 backdrop-blur-sm border border-yellow-700/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{results.pending}</div>
            <div className="text-gray-400 text-sm">Pending</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={runAllTests}
            disabled={results.pending === 0}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶️ Run All Pending Tests
          </button>
          <button
            onClick={resetAllTests}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
          >
            🔄 Reset All Tests
          </button>
          <button
            onClick={() => openSurveyInNewTab(testCases[0])}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all"
          >
            🚀 Open Survey Manually
          </button>
        </div>

        {/* Test Cases Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900/80">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Test Case</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Age</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Expected</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {testCases.map((testCase) => (
                <tr key={testCase.id} className="hover:bg-gray-700/30 transition">
                  <td className="px-6 py-4 text-sm font-mono text-gray-400">{testCase.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-white">{testCase.name}</div>
                    <div className="text-xs text-gray-500">{testCase.description}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-400 font-mono">{testCase.age}</td>
                  <td className="px-6 py-4 text-sm text-cyan-400 capitalize">{testCase.gender}</td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono text-gray-300">{testCase.expectedRedirect}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      testCase.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                      testCase.status === 'running' ? 'bg-blue-900/50 text-blue-400' :
                      testCase.status === 'passed' ? 'bg-green-900/50 text-green-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {testCase.status === 'pending' && '⏳'}
                      {testCase.status === 'running' && '▶️'}
                      {testCase.status === 'passed' && '✅'}
                      {testCase.status === 'failed' && '❌'}
                      {' '}{testCase.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => runTest(testCase)}
                        disabled={testCase.status === 'running'}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs rounded transition"
                      >
                        Run
                      </button>
                      {testCase.actualRedirect && (
                        <button
                          onClick={() => window.open(testCase.actualRedirect, '_blank')}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition"
                        >
                          View
                        </button>
                      )}
                    </div>
                    {testCase.notes && (
                      <div className={`mt-2 text-xs ${testCase.status === 'passed' ? 'text-green-400' : 'text-red-400'}`}>
                        {testCase.notes}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Current Test Runner */}
        {currentTest && (
          <div className="mt-6 bg-gray-800/50 backdrop-blur-sm border border-purple-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Running: {currentTest.name}</h3>
              <span className="text-sm text-gray-400">Step {testStep} of 3</span>
            </div>

            {testStep === 1 && (
              <div className="space-y-4">
                <div className="text-gray-300">Step 1: Age Screening</div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Entering age: <span className="text-blue-400 font-mono">{currentTest.age}</span></div>
                </div>
                <button
                  onClick={handleAgeSubmit}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
                >
                  Submit Age
                </button>
              </div>
            )}

            {testStep === 2 && (
              <div className="space-y-4">
                <div className="text-gray-300">Step 2: Gender Selection</div>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleGenderSelect('male')}
                    className="py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                  >
                    Male
                  </button>
                  <button
                    onClick={() => handleGenderSelect('female')}
                    className="py-4 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg"
                  >
                    Female
                  </button>
                  <button
                    onClick={() => handleGenderSelect('other')}
                    className="py-4 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg"
                  >
                    Other
                  </button>
                </div>
              </div>
            )}

            {testStep === 3 && (
              <div className="space-y-4">
                <div className="text-gray-300">Step 3: Survey Actions</div>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleSurveyAction('complete')}
                    className="py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
                  >
                    ✅ Complete
                  </button>
                  <button
                    onClick={() => handleSurveyAction('terminate')}
                    className="py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
                  >
                    ❌ Terminate
                  </button>
                  <button
                    onClick={() => handleSurveyAction('quota')}
                    className="py-4 px-6 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg"
                  >
                    📊 Quota Full
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Redirect URL Reference */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🔗 Redirect URL Reference</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-green-400 font-semibold mb-2">✅ Complete</div>
              <div className="text-xs font-mono text-gray-400 break-all">
                /redirect/complete?pid={generatedPid}&uid={generatedUid}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-red-400 font-semibold mb-2">❌ Terminate</div>
              <div className="text-xs font-mono text-gray-400 break-all">
                /redirect/terminate?pid={generatedPid}&uid={generatedUid}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-yellow-400 font-semibold mb-2">📊 Quota Full</div>
              <div className="text-xs font-mono text-gray-400 break-all">
                /redirect/quotafull?pid={generatedPid}&uid={generatedUid}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
