'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/lib/types'
import { Copy, Check } from 'lucide-react'

interface RedirectManagerProps {
    project: Project
}

interface LinkItem {
    label: string
    url: string
    id: string
    category?: string
}

export default function RedirectManager({ project }: RedirectManagerProps) {
    const [baseUrl, setBaseUrl] = useState('')
    const [copiedLink, setCopiedLink] = useState<string | null>(null)
    const [selectedSupplier, setSelectedSupplier] = useState<string>('')

    useEffect(() => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        const calculatedBaseUrl = appUrl
            ? (appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl)
            : (typeof window !== 'undefined' ? window.location.origin : '')

        setBaseUrl(calculatedBaseUrl)
    }, [])

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedLink(id)
            setTimeout(() => setCopiedLink(null), 2000)
        } catch (err) {
            console.error('Copy failed:', err)
        }
    }

    const generateDirectLinks = (code: string): LinkItem[] => [
        { label: 'Entry Router Link (Direct)', url: `${baseUrl}/r/${code}/[UID]`, id: 'direct-entry', category: 'Direct Flow' },
    ]

    const generateSupplierLinks = (code: string, supplier: string): LinkItem[] => [
        { label: 'Entry Router Link (Supplier)', url: `${baseUrl}/r/${code}/${supplier}/[UID]`, id: 'supplier-entry', category: 'Supplier Flow' },
        { label: 'Entry Link (Start Route + Supplier)', url: `${baseUrl}/start/${code}?supplier=${supplier}&uid=[UID]`, id: 'supplier-start', category: 'Supplier Flow' },
    ]

    const generateStatusLinks = (code: string, supplier?: string): LinkItem[] => {
        const prefix = supplier ? `&supplier=${supplier}` : ''
        return [
            { label: 'Complete Callback', url: `${baseUrl}/redirect/complete?pid=${code}&uid=[UID]&clickid=[TOKEN]${prefix}`, id: 'complete' },
            { label: 'Terminate Callback', url: `${baseUrl}/redirect/terminate?pid=${code}&uid=[UID]&clickid=[TOKEN]${prefix}`, id: 'terminate' },
            { label: 'Quota Full Callback', url: `${baseUrl}/redirect/quotafull?pid=${code}&uid=[UID]&clickid=[TOKEN]${prefix}`, id: 'quota' },
        ]
    }

    const directLinks = generateDirectLinks(project.project_code)
    const statusLinks = generateStatusLinks(project.project_code)

    const supplierLinks = selectedSupplier
        ? generateSupplierLinks(project.project_code, selectedSupplier)
        : []
    const supplierStatusLinks = selectedSupplier
        ? generateStatusLinks(project.project_code, selectedSupplier)
        : []

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Redirect Manager</h2>
                    <p className="text-sm text-slate-500 font-medium">Production-grade path-based routing links.</p>
                </div>
                <div className="px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Live Links</span>
                </div>
            </div>

            {/* Supplier Selection */}
            <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Generate Supplier Links (Optional)
                </label>
                <input
                    type="text"
                    placeholder="Enter supplier token (e.g., OPP)"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value.trim())}
                    className="w-full md:w-1/3 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-400 mt-2">
                    Enter supplier token to generate supplier-specific links. Leave empty for direct links.
                </p>
            </div>

            {/* Direct Flow Links */}
            {directLinks.length > 0 && !selectedSupplier && (
                <>
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Direct Flow (No Supplier)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {directLinks.map((link) => (
                            <div key={link.id} className="relative group">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    {link.label}
                                </label>
                                <div className="flex shadow-sm">
                                    <input
                                        type="text"
                                        readOnly
                                        value={link.url}
                                        className="flex-1 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl px-4 py-3 text-xs font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium truncate"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(link.url, link.id)}
                                        className={`px-5 py-2 rounded-r-xl border border-l-0 transition-all text-xs font-bold flex items-center gap-2 ${copiedLink === link.id
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                                            }`}
                                    >
                                        {copiedLink === link.id ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Status Links */}
            {statusLinks.length > 0 && !selectedSupplier && (
                <>
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Callback Redirects</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {statusLinks.map((link) => (
                            <div key={link.id} className="relative group">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    {link.label}
                                </label>
                                <div className="flex shadow-sm">
                                    <input
                                        type="text"
                                        readOnly
                                        value={link.url}
                                        className="flex-1 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl px-4 py-3 text-xs font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium truncate"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(link.url, link.id)}
                                        className={`px-5 py-2 rounded-r-xl border border-l-0 transition-all text-xs font-bold flex items-center gap-2 ${copiedLink === link.id
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                                            }`}
                                    >
                                        {copiedLink === link.id ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Supplier Flow Links */}
            {selectedSupplier && supplierLinks.length > 0 && (
                <>
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-widest">Supplier Flow ({selectedSupplier})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {supplierLinks.map((link) => (
                            <div key={link.id} className="relative group">
                                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 ml-1">
                                    {link.label}
                                </label>
                                <div className="flex shadow-sm">
                                    <input
                                        type="text"
                                        readOnly
                                        value={link.url}
                                        className="flex-1 bg-indigo-50 border border-indigo-200 border-r-0 rounded-l-xl px-4 py-3 text-xs font-mono text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium truncate"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(link.url, link.id)}
                                        className={`px-5 py-2 rounded-r-xl border border-l-0 transition-all text-xs font-bold flex items-center gap-2 ${copiedLink === link.id
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
                                            }`}
                                    >
                                        {copiedLink === link.id ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Supplier Status Links */}
            {selectedSupplier && supplierStatusLinks.length > 0 && (
                <>
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-widest">Supplier Callback Redirects</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {supplierStatusLinks.map((link) => (
                            <div key={link.id} className="relative group">
                                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 ml-1">
                                    {link.label}
                                </label>
                                <div className="flex shadow-sm">
                                    <input
                                        type="text"
                                        readOnly
                                        value={link.url}
                                        className="flex-1 bg-indigo-50 border border-indigo-200 border-r-0 rounded-l-xl px-4 py-3 text-xs font-mono text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium truncate"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(link.url, link.id)}
                                        className={`px-5 py-2 rounded-r-xl border border-l-0 transition-all text-xs font-bold flex items-center gap-2 ${copiedLink === link.id
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
                                            }`}
                                    >
                                        {copiedLink === link.id ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-800 text-xs font-medium">
                <div className="shrink-0 mt-0.5">💡</div>
                <div className="space-y-2">
                    <p>
                        These redirect URLs use the <code>pid</code> and <code>uid</code> parameters.
                        The <code>[UID]</code> placeholder will be automatically replaced by the vendor.
                    </p>
                    <p className="mt-1">
                        <strong>Supplier Flow:</strong> Add <code>?supplier=[SUPPLIER_TOKEN]</code> to redirect to supplier's landing page after completion.
                    </p>
                </div>
            </div>
        </div>
    )
}
