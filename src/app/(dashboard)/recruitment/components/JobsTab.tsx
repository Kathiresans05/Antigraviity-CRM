"use client";

import { useState } from "react";
import { Plus, Search, Filter, Briefcase, Users, Edit3, Trash2, Share2, Link as LinkIcon, Linkedin } from "lucide-react";
import clsx from "clsx";
import axios from "axios";

export default function JobsTab({ jobs, isAdmin, onRefresh }: { jobs: any[], isAdmin: boolean, onRefresh: () => void }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: '', department: '', jobType: 'Full-time', workMode: 'Onsite', location: '',
        openings: 1, experienceRequired: '', salaryMin: 0, salaryMax: 0, priority: 'Medium',
        status: 'Draft' as any, responsibilities: '', skills: '', qualifications: '', benefits: '',
        selectedPlatforms: ['Company Website'] as string[]
    });

    const PLATFORMS = [
        { id: 'LinkedIn', color: 'bg-[#0077B5]', icon: '🔗' },
        { id: 'Naukri', color: 'bg-[#004B96]', icon: '💼' },
        { id: 'Indeed', color: 'bg-[#2164f3]', icon: '🔍' },
        { id: 'Glassdoor', color: 'bg-[#00a264]', icon: '🏘️' },
        { id: 'Company Website', color: 'bg-blue-600', icon: '🌐' }
    ];

    const togglePlatform = (id: string) => {
        setForm(prev => ({
            ...prev,
            selectedPlatforms: prev.selectedPlatforms.includes(id)
                ? prev.selectedPlatforms.filter(p => p !== id)
                : [...prev.selectedPlatforms, id]
        }));
    };

    const filtered = jobs.filter(j => j.title.toLowerCase().includes(searchTerm.toLowerCase()) || j.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleCreate = async (submitType: 'draft' | 'submit' | 'publish') => {
        if (!form.title || !form.department) return alert("Title and Department are required");
        setSubmitting(true);
        try {
            await axios.post('/api/jobs', { ...form, submitType });
            setShowModal(false);
            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this job opening?')) return;
        try { await axios.delete(`/api/jobs?id=${id}`); onRefresh(); } catch (e) { console.error(e); }
    };

    const shareExternal = (job: any, platform: string) => {
        const url = `${window.location.origin}/careers/${job.id}`;
        const title = encodeURIComponent(`Hiring for ${job.title} at Antigravity!`);

        if (platform === 'LinkedIn') {
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        } else if (platform === 'Company Website') {
            navigator.clipboard.writeText(url);
            alert("Career link copied to clipboard!");
        } else {
            // General share for others
            navigator.clipboard.writeText(url);
            alert(`Link copied for ${platform}. Post this URL manually on their site.`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search jobs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                {isAdmin && (
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
                        <Plus className="w-4 h-4" /> Create Job Opening
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map(job => (
                    <div key={job.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                                    <p className="text-sm font-semibold text-gray-500">{job.department} • {job.workMode} • {job.location}</p>
                                </div>
                                <span className={clsx("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                                    job.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                                        job.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                                            job.status === 'Closed' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-600'
                                )}>{job.status}</span>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 mb-6">
                                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {job.experienceRequired}</span>
                                <span className="flex items-center gap-1">💰 {job.salaryRange}</span>
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50">{job.jobType}</span>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                    <span className="text-gray-500">Vacancy Status</span>
                                    <span className="text-gray-900">{job.hiredCount} / {job.openings} Hired</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${job.fillPercent}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                            <p className="text-xs font-semibold text-gray-400">Published {job.publishedAt}</p>
                            {isAdmin && (
                                <div className="flex items-center gap-2">
                                    <button className="p-1.5 text-gray-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(job.id)} className="p-1.5 text-gray-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>

                        {job.status === 'Active' && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-50 pt-4">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-full mb-1">Post Externally</span>
                                {PLATFORMS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => shareExternal(job, p.id)}
                                        className={clsx(
                                            "px-2 py-1 rounded text-[10px] font-black text-white hover:opacity-90 transition-opacity flex items-center gap-1.5",
                                            p.color
                                        )}
                                    >
                                        {p.id === 'LinkedIn' ? <Linkedin className="w-3 h-3" /> : p.icon} {p.id}
                                    </button>
                                ))}
                            </div>
                        )}

                        {job.publishedPlatforms && job.publishedPlatforms.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight w-full mb-1">Selection History:</span>
                                {job.publishedPlatforms.map((p: any) => (
                                    <span key={p.name} className={clsx(
                                        "px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1 opacity-60",
                                        PLATFORMS.find(pl => pl.id === p.name)?.color || 'bg-gray-400'
                                    )}>
                                        {p.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* CREATE JOB MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900">Create Job Opening</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Form Sections */}
                            <div>
                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">Basic Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="Job Title" className="p-2.5 border rounded-xl text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                    <input placeholder="Department" className="p-2.5 border rounded-xl text-sm" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                                    <select className="p-2.5 border rounded-xl text-sm" value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value })}>
                                        <option value="Full-time">Full-time</option><option value="Part-time">Part-time</option><option value="Contract">Contract</option>
                                    </select>
                                    <select className="p-2.5 border rounded-xl text-sm" value={form.workMode} onChange={e => setForm({ ...form, workMode: e.target.value })}>
                                        <option value="Onsite">Onsite</option><option value="Hybrid">Hybrid</option><option value="Remote">Remote</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">Vacancy Details</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <input type="number" placeholder="Openings Count" className="p-2.5 border rounded-xl text-sm" value={form.openings} onChange={e => setForm({ ...form, openings: parseInt(e.target.value) || 1 })} />
                                    <input placeholder="Experience (e.g. 2-4 years)" className="p-2.5 border rounded-xl text-sm" value={form.experienceRequired} onChange={e => setForm({ ...form, experienceRequired: e.target.value })} />
                                    <select className="p-2.5 border rounded-xl text-sm" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        <option value="High">High Priority</option><option value="Medium">Medium</option><option value="Low">Low Priority</option>
                                    </select>
                                    <input type="number" placeholder="Min Salary (₹)" className="p-2.5 border rounded-xl text-sm" value={form.salaryMin || ''} onChange={e => setForm({ ...form, salaryMin: parseInt(e.target.value) || 0 })} />
                                    <input type="number" placeholder="Max Salary (₹)" className="p-2.5 border rounded-xl text-sm" value={form.salaryMax || ''} onChange={e => setForm({ ...form, salaryMax: parseInt(e.target.value) || 0 })} />
                                    <input placeholder="Location" className="p-2.5 border rounded-xl text-sm" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">Description & Skills</h4>
                                <div className="space-y-4">
                                    <textarea placeholder="Job Responsibilities..." rows={3} className="w-full p-2.5 border rounded-xl text-sm resize-none" value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })} />
                                    <input placeholder="Required Skills (comma separated)" className="w-full p-2.5 border rounded-xl text-sm" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-2">Publish To Platforms</h4>
                                <div className="flex flex-wrap gap-3">
                                    {PLATFORMS.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => togglePlatform(p.id)}
                                            className={clsx(
                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-2",
                                                form.selectedPlatforms.includes(p.id)
                                                    ? `${p.color} border-transparent text-white shadow-md scale-105`
                                                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                                            )}
                                        >
                                            <span className="text-sm">{p.icon}</span> {p.id}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-3 font-semibold italic">* Jobs will be posted to selected online recruitment platforms upon publishing.</p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-bold text-gray-500">Cancel</button>
                            <button onClick={() => handleCreate('draft')} disabled={submitting} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold">Save Draft</button>
                            <button onClick={() => handleCreate('publish')} disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Publish Job</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
