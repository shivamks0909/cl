'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function TestSurveyContent() {
    const searchParams = useSearchParams()
    
    // The PanelFlow tool passes 'pid' and 'uid' in the URL when redirecting to the survey
    const pid = searchParams.get('pid') || ''
    const uid = searchParams.get('uid') || searchParams.get('oi_uid') || ''

    const handleRedirect = (status: string) => {
        const baseUrl = 'https://track.opinioninsights.in'
        const redirectUrl = `${baseUrl}/redirect/${status}?pid=${pid}&uid=${uid}`
        
        console.log('Redirecting to:', redirectUrl)
        window.location.href = redirectUrl
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-[#1e293b] border border-slate-700 p-8 rounded-[2.5rem] shadow-2xl relative">
                {/* Glow Effect */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-[80px]"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[80px]"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white uppercase">Client Test Survey</h1>
                    </div>

                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                        This is a simulated survey page for testing PanelFlow redirects. 
                        Please select a status below to test the return flow.
                    </p>

                    <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl mb-8 border border-slate-800">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Live Session Context</div>
                        <div className="space-y-2 font-mono text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Project ID:</span>
                                <span className="text-indigo-400 font-bold">{pid || 'Not Passed'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Respondent ID:</span>
                                <span className="text-emerald-400 font-bold">{uid || 'Not Passed'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={() => handleRedirect('complete')}
                            className="group relative flex items-center justify-between w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 transition-all duration-300 rounded-2xl font-bold text-white shadow-lg shadow-emerald-900/20"
                        >
                            <span>Success (Complete)</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                        
                        <button 
                            onClick={() => handleRedirect('terminate')}
                            className="group relative flex items-center justify-between w-full py-4 px-6 bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-all duration-300 rounded-2xl font-bold text-slate-200"
                        >
                            <span>Disqualified (Terminate)</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>

                        <button 
                            onClick={() => handleRedirect('quotafull')}
                            className="group relative flex items-center justify-between w-full py-4 px-6 bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-all duration-300 rounded-2xl font-bold text-slate-200"
                        >
                            <span>Quota Full</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <footer className="mt-8 text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
                PanelFlow Infrastructure Node v2.0
            </footer>
        </div>
    )
}

export default function TestSurveyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-black tracking-widest uppercase animate-pulse">Initializing Test Node...</div>}>
            <TestSurveyContent />
        </Suspense>
    )
}
