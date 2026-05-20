'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Client } from '@/lib/types'
import { ChevronDown, Save, X, AlertCircle, Link as LinkIcon, Plus, Trash2 } from 'lucide-react'
import { updateProjectAction } from '@/app/actions'

interface ProjectEditFormProps {
    project: Project
    clients: Client[]
}

export default function ProjectEditForm({ project, clients }: ProjectEditFormProps) {
    const [formData, setFormData] = useState({
        client_id: project.client_id,
        project_name: project.project_name || '',
        project_code: project.project_code,
        country: project.country || 'Global',
        base_url: project.base_url,
        complete_target: project.complete_target,
        has_prescreener: project.has_prescreener,
        prescreener_url: project.prescreener_url || '',
        is_multi_country: project.is_multi_country || false,
        // PID Logic
        pid_prefix: project.pid_prefix || '',
        pid_counter: project.pid_counter || 1,
        pid_padding: project.pid_padding || 2,
        // UID Logic
        target_uid: (project as any).target_uid || '',
        // Parameter isolation fields
        client_pid_param: (project as any).client_pid_param || '',
        client_uid_param: (project as any).client_uid_param || '',
        oi_prefix: (project as any).oi_prefix || 'oi_',
        force_pid_as_uid: (project as any).force_pid_as_uid || false,
    })

    const existingUidParams = (project as any).uid_params
    const [uidParamRows, setUidParamRows] = useState<{param: string; value: string}[]>(
        Array.isArray(existingUidParams) ? existingUidParams : []
    )

    // Initialize links if multi-country
    const [links, setLinks] = useState<{ country_code: string; target_url: string; active: boolean }[]>(
        project.is_multi_country && Array.isArray(project.country_urls) && project.country_urls.length > 0
            ? (project.country_urls as any[]).map(l => ({ ...l, active: l.active !== false }))
            : project.is_multi_country
                ? [{ country_code: '', target_url: '', active: true }]
                : []
    )

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const addLink = () => {
        setLinks([...links, { country_code: '', target_url: '', active: true }])
    }

    const toggleActive = (index: number) => {
        const newLinks = [...links]
        newLinks[index].active = !newLinks[index].active
        setLinks(newLinks)
    }

    const updateLink = (index: number, field: 'country_code' | 'target_url', value: string) => {
        const newLinks = [...links]
        newLinks[index][field] = value
        setLinks(newLinks)
    }

    // Populate default row when multi-country enabled and no existing links
    useEffect(() => {
        if (formData.is_multi_country && links.length === 0) {
            setLinks([{ country_code: '', target_url: '', active: true }])
        }
    }, [formData.is_multi_country])

    const removeLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const uid_params = uidParamRows.filter(r => r.param.trim()).length > 0
                ? uidParamRows.filter(r => r.param.trim())
                : null

            const { error: updateError } = await updateProjectAction(project.id, {
                ...formData,
                uid_params,
                country_urls: formData.is_multi_country ? links : []
            })

            if (updateError) {
                setError(updateError.message || 'Failed to update project')
            } else {
                router.push('/admin/projects')
                router.refresh()
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-slate-50/50 rounded-[2.5rem] p-1 border border-slate-100 shadow-sm">
            <form onSubmit={handleSubmit} className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.25rem] overflow-hidden border border-slate-100/50">
                <div className="p-8 lg:p-12 space-y-8">
                    {/* Header matching the premium feel */}
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-500">
                            <Save className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Edit Enterprise Project</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Select Client */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1">Select Client</label>
                            <div className="relative">
                                <select
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="">Select client...</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Target Vendor */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1">Target Vendor (Optional)</label>
                            <div className="relative">
                                <select
                                    disabled
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed appearance-none"
                                >
                                    <option>Direct Traffic (No Vendor)</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                            </div>
                        </div>

                        {/* Project Name */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1">Project Name</label>
                            <input
                                type="text"
                                value={formData.project_name}
                                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700"
                                required
                            />
                        </div>

                        {/* Project Code */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1">Project Code (Unique ID)</label>
                            <input
                                type="text"
                                value={formData.project_code}
                                onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700"
                                required
                            />
                        </div>

                        {/* PID Setup Phase */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-indigo-50/30 border border-indigo-100 rounded-3xl animate-in slide-in-from-right duration-500">
                            <div className="md:col-span-4 -mb-2 flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Step 2: Client PID Configuration</h4>
                                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full border border-emerald-200 uppercase tracking-tighter animate-pulse">
                                    Anti-Duplicate Enabled
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 tracking-widest ml-1 uppercase">PID Prefix</label>
                                <input
                                    type="text"
                                    placeholder="e.g. OPGH"
                                    value={formData.pid_prefix}
                                    onChange={(e) => setFormData({ ...formData, pid_prefix: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-200 font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 tracking-widest ml-1 uppercase">Start #</label>
                                <input
                                    type="number"
                                    value={formData.pid_counter}
                                    onChange={(e) => setFormData({ ...formData, pid_counter: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-bold text-slate-700 font-mono"
                                    min="1"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 tracking-widest ml-1 uppercase">Padding</label>
                                <select
                                    value={formData.pid_padding}
                                    onChange={(e) => setFormData({ ...formData, pid_padding: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl outline-none transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer font-mono"
                                >
                                    <option value={1}>1 (1)</option>
                                    <option value={2}>2 (01)</option>
                                    <option value={3}>3 (001)</option>
                                    <option value={4}>4 (0001)</option>
                                </select>
                            </div>

                            <div className="flex flex-col justify-end space-y-3">
                                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 shadow-lg">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Preview (Global)</p>
                                    <code className="text-emerald-400 text-sm font-black tracking-widest">
                                        {formData.pid_prefix
                                            ? `${formData.pid_prefix}${String(formData.pid_counter).padStart(formData.pid_padding, '0')}`
                                            : '----'}
                                    </code>
                                </div>
                                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 shadow-lg">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">Preview (US Example)</p>
                                    <code className="text-amber-400 text-sm font-black tracking-widest">
                                        {formData.pid_prefix
                                            ? `${formData.pid_prefix}US${String(formData.pid_counter).padStart(formData.pid_padding, '0')}`
                                            : '----'}
                                    </code>
                                </div>
                            </div>
                        </div>

                        {/* Target UID Override Field (New) */}
                        <div className="md:col-span-2 p-6 bg-indigo-50/20 border border-indigo-100 rounded-3xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                                        <Save className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Target UID Override (High Priority)</p>
                                        <p className="text-[9px] font-medium text-slate-400 leading-tight">If set, this value is sent to the client instead of any PID or incoming UID.</p>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="e.g. STATIC_IDENTIFIER (Optional)"
                                value={formData.target_uid}
                                onChange={(e) => setFormData({ ...formData, target_uid: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-200 font-mono"
                            />
                        </div>

                        {/* PID-as-UID Logic Toggle */}
                        <div className="md:col-span-2 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${formData.force_pid_as_uid ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Use Generated PID as User ID (UID)</p>
                                    <p className="text-[9px] font-medium text-slate-400 leading-tight mt-0.5">If enabled, the client receives the auto-incrementing PID (e.g. OPGH01) instead of random incoming UIDs.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, force_pid_as_uid: !formData.force_pid_as_uid })}
                                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.force_pid_as_uid ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.force_pid_as_uid ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>


                        {/* Advanced Link Settings Toggle */}
                        <div className="md:col-span-2 pt-4">
                            <details className="group bg-slate-50/50 border border-slate-100 rounded-2xl p-2 transition-all">
                                <summary className="flex items-center justify-between px-4 py-2 cursor-pointer list-none select-none">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-open:text-indigo-500 transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Advanced Link Settings</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-slate-300 group-open:rotate-180 transition-transform" />
                                </summary>

                                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-2 duration-300">
                                    {/* Target UID Override */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-indigo-600 tracking-tight ml-1 uppercase">Target UID Override</label>
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                placeholder="e.g. COMPLETED_USER"
                                                value={formData.target_uid}
                                                onChange={(e) => setFormData({ ...formData, target_uid: e.target.value })}
                                                className="w-full px-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-xs font-bold text-slate-700 placeholder:text-slate-300 font-mono"
                                            />
                                            <p className="text-[9px] text-slate-400 font-medium leading-tight ml-1">Force this UID for ALL users sent to client.</p>
                                        </div>
                                    </div>

                                    {/* Client PID Param Name */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-500 tracking-tight ml-1 uppercase">Client PID Param</label>
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                placeholder="e.g. pid"
                                                value={formData.client_pid_param}
                                                onChange={(e) => setFormData({ ...formData, client_pid_param: e.target.value })}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-xs font-medium text-slate-700 placeholder:text-slate-300 font-mono"
                                            />
                                            <p className="text-[9px] text-slate-400 font-medium leading-tight ml-1">Vendor's PID param name.</p>
                                        </div>
                                    </div>

                                    {/* Client UID Param Name */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-500 tracking-tight ml-1 uppercase">Client UID Param</label>
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                placeholder="e.g. uid"
                                                value={formData.client_uid_param}
                                                onChange={(e) => setFormData({ ...formData, client_uid_param: e.target.value })}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-xs font-medium text-slate-700 placeholder:text-slate-300 font-mono"
                                            />
                                            <p className="text-[9px] text-slate-400 font-medium leading-tight ml-1">Vendor's UID param name.</p>
                                        </div>
                                    </div>

                                    {/* Internal Tracking Prefix */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-500 tracking-tight ml-1 uppercase">Internal Prefix</label>
                                        <div className="space-y-1">
                                            <input
                                                type="text"
                                                placeholder="oi_"
                                                value={formData.oi_prefix}
                                                onChange={(e) => setFormData({ ...formData, oi_prefix: e.target.value || 'oi_' })}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-xs font-medium text-slate-700 placeholder:text-slate-300 font-mono"
                                            />
                                            <p className="text-[9px] text-emerald-600 font-semibold leading-tight ml-1">⚡ Safe namespace</p>
                                        </div>
                                    </div>

                                    {/* URL Param Mapping — Multi UID/RID/TOID */}
                                    <div className="md:col-span-4 space-y-3 pt-2 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-violet-600 uppercase tracking-[0.15em]">URL Param Mapping</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">If set, overrides Vendor PID/UID Param above</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setUidParamRows([...uidParamRows, { param: '', value: 'client_rid' }])}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-[10px] font-bold rounded-lg transition-colors"
                                            >
                                                <Plus className="w-3 h-3" /> Add Param
                                            </button>
                                        </div>

                                        {uidParamRows.length === 0 && (
                                            <p className="text-[10px] text-slate-300 italic px-1">No params — legacy single param mode active</p>
                                        )}

                                        {uidParamRows.map((row, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="param name (e.g. rid, toid, uid)"
                                                    value={row.param}
                                                    onChange={(e) => {
                                                        const rows = [...uidParamRows]
                                                        rows[i] = { ...rows[i], param: e.target.value }
                                                        setUidParamRows(rows)
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-xs font-mono text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-violet-300 outline-none"
                                                />
                                                <select
                                                    value={row.value}
                                                    onChange={(e) => {
                                                        const rows = [...uidParamRows]
                                                        rows[i] = { ...rows[i], value: e.target.value }
                                                        setUidParamRows(rows)
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg text-xs font-bold text-violet-800 focus:ring-2 focus:ring-violet-300 outline-none"
                                                >
                                                    <option value="client_rid">client_rid — custom RID (goes to client)</option>
                                                    <option value="supplier_uid">supplier_uid — supplier original UID</option>
                                                    <option value="session">session — session token</option>
                                                    <option value="hash">hash — 8-char hash</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => setUidParamRows(uidParamRows.filter((_, j) => j !== i))}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}

                                        {uidParamRows.filter(r => r.param).length > 0 && (
                                            <div className="p-2 bg-violet-50 border border-violet-100 rounded-lg">
                                                <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider mb-1">Preview</p>
                                                <code className="text-[10px] text-violet-700 break-all">
                                                    ?{uidParamRows.filter(r => r.param).map(r => `${r.param}=[${r.value}]`).join('&')}
                                                </code>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Base URL */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1 uppercase opacity-70">
                                {formData.is_multi_country ? 'Default Survey URL (Disabled)' : 'Base Survey URL'}
                            </label>
                            <input
                                type="url"
                                value={formData.base_url}
                                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                                className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-xs font-medium text-slate-700 font-mono ${formData.is_multi_country ? 'cursor-not-allowed bg-slate-50/50' : 'bg-white'}`}
                                required={!formData.is_multi_country}
                                disabled={formData.is_multi_country}
                            />
                            {formData.is_multi_country && (
                                <div className="flex items-center space-x-2 px-1 text-amber-600">
                                    <AlertCircle className="w-3 h-3 fill-amber-50" />
                                    <p className="text-[10px] font-bold tracking-tight">
                                        Multi-country mode enabled. Base URL is disabled. Add country-specific URLs below.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Quota */}
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 tracking-tight ml-1 uppercase opacity-70">Global Target (Quota)</label>
                            <input
                                type="number"
                                placeholder="e.g. 500 (Optional)"
                                value={formData.complete_target || ''}
                                onChange={(e) => setFormData({ ...formData, complete_target: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 font-mono"
                            />
                        </div>
                    </div>

                    {/* Toggles Row */}
                    <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-6 flex flex-wrap gap-8">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.is_multi_country}
                                onChange={() => setFormData({ ...formData, is_multi_country: !formData.is_multi_country })}
                                className="w-5 h-5 rounded-lg border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Enable Multi-Country Support</span>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.has_prescreener}
                                onChange={() => setFormData({ ...formData, has_prescreener: !formData.has_prescreener })}
                                className="w-5 h-5 rounded-lg border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Security Pre-Screener</span>
                        </label>
                    </div>


                    {
                        formData.is_multi_country && (
                            <div className="space-y-4 pt-4 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-[0.1em]">Country-Specific URLs</h4>
                                    <div className="flex items-center space-x-4">
                                        <button
                                            type="button"
                                            className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-600 flex items-center space-x-1.5 transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>REGENERATE LINKS</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addLink}
                                            className="px-4 py-2 bg-indigo-500 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-600 transition-all flex items-center space-x-2 shadow-lg shadow-indigo-100"
                                        >
                                            <Plus className="w-3 h-3" />
                                            <span>ADD COUNTRY</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-indigo-50/30 border border-indigo-100 rounded-3xl overflow-hidden shadow-inner">
                                    <table className="w-full text-left">
                                        <thead className="bg-indigo-100/30 border-b border-indigo-100">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Country</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Target Survey URL</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Generated Tracking Link</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest text-center">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest text-center">Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-100/50">
                                            {links.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-xs text-indigo-400 font-medium italic">
                                                        No regions configured. Click 'Add Country' to build your routing matrix.
                                                    </td>
                                                </tr>
                                            ) : (
                                                links.map((link, idx) => (
                                                    <tr key={idx} className={`transition-colors ${link.active ? 'bg-white/50 hover:bg-white' : 'bg-slate-50/80 opacity-60'}`}>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="text"
                                                                placeholder="US"
                                                                value={link.country_code}
                                                                onChange={(e) => updateLink(idx, 'country_code', e.target.value.toUpperCase())}
                                                                className="w-12 px-2 py-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-400 outline-none text-xs font-bold text-center uppercase"
                                                                maxLength={2}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="url"
                                                                placeholder="https://survey.com/country-us?uid=[UID]"
                                                                value={link.target_url}
                                                                onChange={(e) => updateLink(idx, 'target_url', e.target.value)}
                                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-400 outline-none text-xs font-medium text-slate-600 font-mono"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {link.country_code && formData.project_code ? (
                                                                <div className="flex items-center gap-2">
                                                                    <code className="text-[10px] text-indigo-600 font-mono bg-indigo-50 px-2 py-1 rounded-lg break-all">
                                                                        {`${typeof window !== 'undefined' ? window.location.origin : ''}/track?code=${formData.project_code}&country=${link.country_code}&uid=[UID]`}
                                                                    </code>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/track?code=${formData.project_code}&country=${link.country_code}&uid=[UID]`)}
                                                                        className="shrink-0 p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                                                                        title="Copy link"
                                                                    >
                                                                        <LinkIcon className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-slate-400 font-medium italic">Enter project code &amp; country to generate</p>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleActive(idx)}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${link.active
                                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                                    }`}
                                                            >
                                                                {link.active ? '● Active' : '○ Inactive'}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLink(idx)}
                                                                className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    }

                </div>

                {/* Footer buttons matching premium alignment */}
                <div className="px-8 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex-1">
                        {error && (
                            <div className="flex items-center space-x-2 text-rose-500">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-6">
                        <button
                            type="button"
                            onClick={() => router.push('/admin/projects')}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-12 py-4 bg-indigo-500 text-white text-[13px] font-bold rounded-xl shadow-xl shadow-indigo-100/50 hover:bg-indigo-600 hover:shadow-indigo-200/50 transition-all uppercase tracking-widest flex items-center space-x-3 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Updating...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Update Project</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
