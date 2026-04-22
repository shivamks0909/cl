'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import React from 'react'

interface SurveyOption {
  id: string
  title: string
  description: string
  color: string
  hoverColor: string
  icon: string
}

export default function MockSurveySelection() {
  const router = useRouter()
  const [selectedProject, setSelectedProject] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [generatedPid, setGeneratedPid] = useState('')
  const [generatedUid, setGeneratedUid] = useState('')

  // Generate PID/UID on mount
  React.useEffect(() => {
    const pid = `project_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    setGeneratedPid(pid)
    setGeneratedUid(uid)
  }, [])

  const surveyOptions: SurveyOption[] = [
    {
      id: 'complete',
      title: 'Survey Complete',
      description: 'User successfully completes the entire survey and receives completion rewards',
      color: 'from-green-600 to-emerald-700',
      hoverColor: 'from-green-500 to-emerald-600',
      icon: '✅'
    },
    {
      id: 'terminate',
      title: 'Disqualified (Terminate)',
      description: 'User is disqualified early due to failing screening questions or other criteria',
      color: 'from-red-600 to-rose-700',
      hoverColor: 'from-red-500 to-rose-600',
      icon: '❌'
    },
    {
      id: 'quota',
      title: 'Quota Full',
      description: 'Survey reaches its participant quota, user cannot continue',
      color: 'from-yellow-600 to-amber-700',
      hoverColor: 'from-yellow-500 to-amber-600',
      icon: '📊'
    }
  ]

  const handleProjectSelect = (projectId: string) => {
    setIsAnimating(true)
    setSelectedProject(projectId)
    
    // Simulate a brief loading state
    setTimeout(() => {
      // Navigate to the mock survey page with the selected project and session data
      router.push(`/mock-survey?project=${projectId}&pid=${generatedPid}&uid=${generatedUid}&type=test`)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-6 font-sans">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
              Mock Survey Testing Platform
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Select a survey scenario to test the complete redirect and tracking infrastructure
          </p>
        </div>

        {/* Session Info Box */}
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 backdrop-blur-sm border border-blue-700/50 rounded-xl p-5 mb-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600/20 p-2 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-semibold">Test Session Initialized</h4>
                <p className="text-gray-400 text-sm">Session data generated and ready</p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-400">
              <div className="font-mono bg-gray-900/50 px-3 py-2 rounded-lg">
                <div><span className="text-blue-400">PID:</span> {generatedPid || '...'}</div>
                <div><span className="text-purple-400">UID:</span> {generatedUid || '...'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Survey Options Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {surveyOptions.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleProjectSelect(option.id)}
              className={`group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-transparent transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${
                isAnimating && selectedProject === option.id ? 'scale-95 opacity-50' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity duration-500`}></div>
              
              {/* Icon */}
              <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {option.icon}
              </div>
              
              {/* Title */}
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-200 transition-all duration-300">
                {option.title}
              </h3>
              
              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                {option.description}
              </p>

              {/* Action indicator */}
              <div className="mt-6 flex items-center text-sm font-semibold text-gray-500 group-hover:text-white transition-colors duration-300">
                <span>Start Test</span>
                <svg 
                  className="w-4 h-4 ml-2 transform group-hover:translate-x-2 transition-transform duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Info Section */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6 max-w-3xl mx-auto">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
            <span className="text-2xl mr-2">ℹ️</span>
            Testing Information
          </h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>Each test creates a response record before callback</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>Session initialization and tracking validation included</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>Redirects to appropriate status page after callback</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>Quota management and response counting verified</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Testing environment for survey redirect infrastructure</p>
        </div>
      </div>

      {/* Loading overlay */}
      {isAnimating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl p-8 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white font-semibold">Initializing test environment...</p>
          </div>
        </div>
      )}
    </div>
  )
}
