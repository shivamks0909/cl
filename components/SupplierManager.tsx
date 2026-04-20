'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Supplier, Project } from '@/lib/types'
import {
    createSupplierAction,
    updateSupplierAction,
    deleteSupplierAction,
    linkSupplierToProjectAction,
} from '@/app/actions'
import { Plus, Trash2, Edit2, Link2, X, Check, ChevronDown, Copy, Truck } from 'lucide-react'

interface Props {
    suppliers: Supplier[]
    projects: (Project & { client_name: string })[]
}

const PLATFORM_MACROS: Record<string, string> = {
    dynata: '##RID##',
    lucid: '{{RESPONDENT_ID}}',
    cint: '[%RID%]',
    schlesinger: '[RESPONDENT_ID]',
    custom: '[uid]',
}

type FormData = {
    name: string
    supplier_token: string
    contact_email: string
    platform_type: string
    uid_macro: string
    complete_redirect_url: string
    terminate_redirect_url: string
    quotafull_redirect_url: string
    notes: string
    status: 'active' | 'paused'
}

const EMPTY: FormData = {
    name: '', supplier_token: '', contact_email: '',
    platform_type: 'custom', uid_macro: '[uid]',
    complete_redirect_url: '', terminate_redirect_url: '',
    quotafull_redirect_url: '', notes: '', status: 'active',
}

export default function SupplierManager({ suppliers: init, projects }: Props) {
    const router = useRouter()
    const [suppliers, setSuppliers] = useState<Supplier[]>(init)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<FormData>({ ...EMPTY })
    const [saving, setSaving] = useState(false)
    const [formErr, setFormErr] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [linkModal, setLinkModal] = useState<Supplier | null>(null)
    const [linkProjId, setLinkProjId] = useState('')
    const [linking, setLinking] = useState(false)
    const [base, setBase] = useState('https://track.opinioninsights.in')

    useEffect(() => { setBase(window.location.origin) }, [])

    const copy = async (text: string, id: string) => {
        try { await navigator.clipboard.writeText(text) } catch { return }
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const entryLink = (s: Supplier, code: string) =>
        `${base}/r/${code}/${s.supplier_token}/${s.uid_macro || '[uid]'}`

    const f = (key: keyof FormData, val: string) =>
        setForm(prev => ({ ...prev, [key]: val }))

    const openAdd = () => { setForm({ ...EMPTY }); setEditId(null); setFormErr(null); setShowForm(true) }

    const openEdit = (s: Supplier) => {
        setForm({
            name: s.name, supplier_token: s.supplier_token,
            contact_email: s.contact_email ?? '', platform_type: s.platform_type ?? 'custom',
            uid_macro: s.uid_macro ?? '[uid]', complete_redirect_url: s.complete_redirect_url ?? '',
            terminate_redirect_url: s.terminate_redirect_url ?? '',
            quotafull_redirect_url: s.quotafull_redirect_url ?? '',
            notes: s.notes ?? '', status: s.status,
        })
        setEditId(s.id); setFormErr(null); setShowForm(true)
    }

    const closeForm = () => { setShowForm(false); setEditId(null); setFormErr(null) }

    const handleSave = async () => {
        if (!form.name.trim()) { setFormErr('Name is required'); return }
        if (!form.supplier_token.trim()) { setFormErr('Token is required'); return }
        setSaving(true); setFormErr(null)
        try {
            if (editId) {
                const { error } = await updateSupplierAction(editId, form)
                if (error) { setFormErr(error.message ?? 'Update failed'); return }
                setSuppliers(p => p.map(s => s.id === editId ? { ...s, ...form } : s))
            } else {
                const { data, error } = await createSupplierAction(form)
                if (error) { setFormErr(error.message ?? 'Create failed'); return }
                if (data) setSuppliers(p => [data, ...p])
            }
            closeForm(); router.refresh()
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return
        const { error } = await deleteSupplierAction(id)
        if (error) { alert(error.message); return }
        setSuppliers(p => p.filter(s => s.id !== id))
        if (expandedId === id) setExpandedId(null)
    }

    const openLink = (s: Supplier) => { setLinkModal(s); setLinkProjId('') }
    const closeLink = () => { setLinkModal(null); setLinkProjId('') }

    const handleLink = async () => {
        if (!linkModal || !linkProjId) return
        setLinking(true)
        const { error } = await linkSupplierToProjectAction(linkModal.id, linkProjId)
        setLinking(false)
        if (error) { alert(error.message); return }
        closeLink(); router.refresh()
    }

    return (
        <div className="space-y-6">

            {!showForm && (
                <button onClick={openAdd}
                    className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-100">
                    <Plus className="w-4 h-4" /> Add New Supplier
                </button>
            )}

            {/* FORM */}
            {showForm && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-800">
                            {editId ? 'Edit Supplier' : 'Add New Supplier'}
                        </h3>
                        <button onClick={closeForm} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-8 space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supplier Name *</label>
                                <input value={form.name} onChange={e => f('name', e.target.value)}
                                    placeholder="e.g. MackInsights"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Token * <span className="text-violet-500 normal-case font-medium">(short unique ID)</span>
                                </label>
                                <input
                                    value={form.supplier_token}
                                    onChange={e => f('supplier_token', e.target.value.toUpperCase().replace(/\s/g, ''))}
                                    placeholder="e.g. MACK / DYN / LUC"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-black font-mono text-violet-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50" />
                                <p className="text-[9px] text-slate-400 ml-1">
                                    Entry URL format: <span className="text-violet-500">/r/PROJECT/{form.supplier_token || 'TOKEN'}/UID</span>
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Platform</label>
                                <select value={form.platform_type}
                                    onChange={e => { const p = e.target.value; setForm(prev => ({ ...prev, platform_type: p, uid_macro: PLATFORM_MACROS[p] ?? '[uid]' })) }}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-violet-400 appearance-none bg-white">
                                    <option value="dynata">Dynata</option>
                                    <option value="lucid">Lucid / Cint</option>
                                    <option value="cint">Cint (legacy)</option>
                                    <option value="schlesinger">Schlesinger</option>
                                    <option value="custom">Custom / Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">UID Macro</label>
                                <input value={form.uid_macro} onChange={e => f('uid_macro', e.target.value)}
                                    placeholder="e.g. ##RID## or [uid]"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono text-slate-700 outline-none focus:border-violet-400" />
                                <p className="text-[9px] text-slate-400 ml-1">Dynata: ##RID## · Lucid: {`{{RESPONDENT_ID}}`} · Cint: [%RID%]</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact Email</label>
                                <input value={form.contact_email} onChange={e => f('contact_email', e.target.value)}
                                    placeholder="pm@supplier.com (optional)"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-violet-400" />
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                            <div>
                                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1">Supplier Redirect URLs</h4>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    After your router records the status, the respondent is sent to these URLs.
                                    The respondent's UID is automatically appended as <code className="text-violet-600">&uid=THEIR_UID</code>.
                                    Leave blank to show your default landing page instead.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">✅ Complete Redirect URL</label>
                                    <input value={form.complete_redirect_url} onChange={e => f('complete_redirect_url', e.target.value)}
                                        placeholder="https://mackinsights.com/status?type=complete"
                                        className="w-full px-4 py-3 border border-emerald-100 bg-white rounded-xl text-xs font-mono text-slate-700 outline-none focus:border-emerald-400" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest">❌ Terminate Redirect URL</label>
                                    <input value={form.terminate_redirect_url} onChange={e => f('terminate_redirect_url', e.target.value)}
                                        placeholder="https://mackinsights.com/status?type=terminate"
                                        className="w-full px-4 py-3 border border-red-100 bg-white rounded-xl text-xs font-mono text-slate-700 outline-none focus:border-red-400" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">🔶 Quota Full Redirect URL</label>
                                    <input value={form.quotafull_redirect_url} onChange={e => f('quotafull_redirect_url', e.target.value)}
                                        placeholder="https://mackinsights.com/status?type=quotafull"
                                        className="w-full px-4 py-3 border border-amber-100 bg-white rounded-xl text-xs font-mono text-slate-700 outline-none focus:border-amber-400" />
                                </div>
                            </div>
                            <div className="bg-white border border-violet-100 rounded-xl px-4 py-3">
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                    💡 Example final redirect supplier receives:<br />
                                    <code className="text-slate-600 break-all">https://mackinsights.com/status?type=complete&uid=abc123xyz</code>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notes (optional)</label>
                            <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
                                placeholder="Internal notes..." rows={2}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-violet-400 resize-none" />
                        </div>

                        {formErr && (
                            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-xs font-bold text-red-600">{formErr}</p>
                            </div>
                        )}

                        <div className="flex items-center gap-4 pt-2">
                            <button onClick={handleSave} disabled={saving}
                                className="px-8 py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-50 transition-all">
                                {saving ? 'Saving...' : editId ? 'Update Supplier' : 'Save Supplier'}
                            </button>
                            <button onClick={closeForm}
                                className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIST */}
            {suppliers.length === 0 && !showForm ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
                    <p className="text-slate-400 text-sm font-medium">No suppliers yet. Click "Add New Supplier" to get started.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {suppliers.map(s => (
                        <div key={s.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

                            <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-violet-50 border border-violet-100 rounded-2xl flex items-center justify-center shrink-0">
                                        <span className="text-xs font-black text-violet-600">{s.supplier_token.slice(0, 4)}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center flex-wrap gap-2">
                                            <h3 className="text-base font-black text-slate-900">{s.name}</h3>
                                            <span className="px-2 py-0.5 bg-violet-50 text-violet-600 text-[9px] font-black rounded-full border border-violet-100 font-mono uppercase">{s.supplier_token}</span>
                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${s.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>{s.status}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-1">
                                            <span className="text-xs text-slate-400 capitalize">{s.platform_type}</span>
                                            {s.contact_email && <span className="text-xs text-slate-400">{s.contact_email}</span>}
                                            <span className="text-[10px] font-mono text-slate-300">macro: {s.uid_macro}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                                        className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center gap-1.5">
                                        <Link2 className="w-3 h-3" /> Links
                                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedId === s.id ? 'rotate-180' : ''}`} />
                                    </button>
                                    <button onClick={() => openLink(s)}
                                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all">
                                        + Project
                                    </button>
                                    <button onClick={() => openEdit(s)} title="Edit"
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(s.id, s.name)} title="Delete"
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {expandedId === s.id && (
                                <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-5 space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Configured Redirect URLs</p>
                                        <div className="space-y-2">
                                            {[
                                                { label: '✅ Complete', url: s.complete_redirect_url },
                                                { label: '❌ Terminate', url: s.terminate_redirect_url },
                                                { label: '🔶 Quota Full', url: s.quotafull_redirect_url },
                                            ].map(({ label, url }) => (
                                                <div key={label} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-500 w-24 shrink-0">{label}</span>
                                                    {url ? (
                                                        <>
                                                            <code className="text-[10px] font-mono text-slate-600 flex-1 truncate">{url}</code>
                                                            <button onClick={() => copy(url, `${s.id}-${label}`)}>
                                                                {copiedId === `${s.id}-${label}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 italic">Not configured — will show default landing page</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Entry Links — Give These to Supplier</p>
                                        {projects.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No projects found. Create a project first.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {projects.map(p => {
                                                    const link = entryLink(s, p.project_code)
                                                    const lid = `${s.id}-${p.id}`
                                                    return (
                                                        <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100">
                                                            <span className="text-[10px] font-black text-indigo-600 w-28 shrink-0 truncate">{p.project_code}</span>
                                                            <code className="text-[10px] font-mono text-slate-500 flex-1 truncate">{link}</code>
                                                            <button onClick={() => copy(link, lid)}>
                                                                {copiedId === lid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />}
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* LINK MODAL */}
            {linkModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-800">Link to Project</h3>
                            <button onClick={closeLink} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 rounded-2xl border border-violet-100">
                            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-black text-violet-700">{linkModal.supplier_token.slice(0, 4)}</span>
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800">{linkModal.name}</p>
                                <p className="text-[10px] font-mono text-violet-600">{linkModal.supplier_token}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Project *</label>
                            <select value={linkProjId} onChange={e => setLinkProjId(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-violet-400 appearance-none bg-white">
                                <option value="">Choose a project...</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.project_code} — {p.project_name || p.client_name}</option>
                                ))}
                            </select>
                        </div>
                        {linkProjId && (() => {
                            const proj = projects.find(p => p.id === linkProjId)
                            if (!proj) return null
                            const link = entryLink(linkModal, proj.project_code)
                            return (
                                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 space-y-2">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Entry Link to Give Supplier</p>
                                    <code className="text-[10px] font-mono text-slate-600 break-all block leading-relaxed">{link}</code>
                                    <button onClick={() => copy(link, 'modal')}
                                        className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800">
                                        {copiedId === 'modal' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copiedId === 'modal' ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                            )
                        })()}
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleLink} disabled={linking || !linkProjId}
                                className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-50 transition-all">
                                {linking ? 'Linking...' : 'Link Supplier'}
                            </button>
                            <button onClick={closeLink}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
