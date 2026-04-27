"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, CheckCircle2, AlertCircle, ChevronDown, Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import moment from 'moment';
import clsx from 'clsx';

interface Task {
    title: string;
    description: string;
    timeSpent: number;
    status: 'Completed' | 'In Progress' | 'Blocked';
    priority: 'Low' | 'Medium' | 'High';
}

interface DailyReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    report?: any;
    userName: string;
}

export default function DailyReportModal({ isOpen, onClose, onSuccess, report, userName }: DailyReportModalProps) {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        projectName: '',
        projectId: '',
        date: moment().format('YYYY-MM-DD'),
        tasks: [{ title: '', description: '', timeSpent: 0, status: 'In Progress' as const, priority: 'Medium' as const }],
        summary: '',
        blockers: '',
        tomorrowPlan: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchProjects();
            if (report) {
                setFormData({
                    projectName: report.projectName || '',
                    projectId: report.projectId || '',
                    date: moment(report.date).format('YYYY-MM-DD'),
                    tasks: report.tasks || [{ title: '', description: '', timeSpent: 0, status: 'In Progress', priority: 'Medium' }],
                    summary: report.summary || '',
                    blockers: report.blockers || '',
                    tomorrowPlan: report.tomorrowPlan || ''
                });
            } else {
                setFormData({
                    projectName: '',
                    projectId: '',
                    date: moment().format('YYYY-MM-DD'),
                    tasks: [{ title: '', description: '', timeSpent: 0, status: 'In Progress', priority: 'Medium' }],
                    summary: '',
                    blockers: '',
                    tomorrowPlan: ''
                });
            }
        }
    }, [isOpen, report]);

    const fetchProjects = async () => {
        try {
            const res = await axios.get('/api/projects');
            setProjects(res.data.projects || []);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        }
    };

    const addTask = () => {
        setFormData(prev => ({
            ...prev,
            tasks: [...prev.tasks, { title: '', description: '', timeSpent: 0, status: 'In Progress', priority: 'Medium' }]
        }));
    };

    const removeTask = (index: number) => {
        if (formData.tasks.length > 1) {
            setFormData(prev => ({
                ...prev,
                tasks: prev.tasks.filter((_, i) => i !== index)
            }));
        }
    };

    const handleTaskChange = (index: number, field: string, value: any) => {
        const newTasks = [...formData.tasks];
        (newTasks[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, tasks: newTasks }));
    };

    const totalHours = formData.tasks.reduce((acc, task) => acc + Number(task.timeSpent || 0), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                totalHours,
                status: 'Completed' // Auto-mark as completed on submit
            };

            if (report?._id) {
                await axios.put(`/api/daily-reports/${report._id}`, payload);
            } else {
                await axios.post('/api/daily-reports', payload);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Failed to save report", error);
            const errorMsg = error.response?.data?.error || "Failed to save report. Please try again.";
            alert(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{report ? 'Edit Daily Report' : 'Create Daily Report'}</h2>
                        <p className="text-xs text-slate-500 font-medium">Capture your daily achievements and progress</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Section 1: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employee Name</label>
                            <input
                                type="text"
                                value={userName}
                                disabled
                                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                required
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm shadow-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project Name</label>
                            <div className="relative">
                                <select
                                    value={formData.projectId}
                                    onChange={(e) => {
                                        const proj = projects.find(p => p._id === e.target.value);
                                        setFormData(prev => ({ ...prev, projectId: e.target.value, projectName: proj?.name || '' }));
                                    }}
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm appearance-none shadow-sm"
                                >
                                    <option value="">Select Project</option>
                                    {projects.map(p => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent" />

                    {/* Section 2: Tasks */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">02</span>
                                Tasks Break-down
                            </h3>
                            <button
                                type="button"
                                onClick={addTask}
                                className="px-4 py-1.5 bg-white border border-slate-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Task
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.tasks.map((task, index) => (
                                <div key={index} className="group relative bg-slate-50/50 border border-slate-200 p-5 rounded-2xl transition-all hover:bg-white hover:shadow-md hover:border-slate-300">
                                    <div className="absolute -left-2.5 top-5 w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                                        {index + 1}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                        <div className="md:col-span-3 space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Title</label>
                                            <input
                                                type="text"
                                                placeholder="What did you work on?"
                                                value={task.title}
                                                onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                                                required
                                                className="w-full px-4 py-2 bg-transparent border-b-2 border-slate-200 focus:border-blue-500 outline-none transition-all text-sm font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Time (Hrs)</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={task.timeSpent}
                                                onChange={(e) => handleTaskChange(index, 'timeSpent', e.target.value)}
                                                required
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-center text-sm font-bold text-blue-600 shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
                                            <select
                                                value={task.status}
                                                onChange={(e) => handleTaskChange(index, 'status', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm"
                                            >
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Blocked">Blocked</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Priority</label>
                                            <div className="flex items-center gap-2 h-9">
                                                <select
                                                    value={task.priority}
                                                    onChange={(e) => handleTaskChange(index, 'priority', e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm"
                                                >
                                                    <option value="Low">Low</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="High">High</option>
                                                </select>
                                                {formData.tasks.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTask(index)}
                                                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <textarea
                                            placeholder="Detailed description of the task..."
                                            value={task.description}
                                            onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                                            rows={2}
                                            className="w-full bg-slate-50/30 p-3 rounded-xl text-[13px] border border-transparent focus:border-slate-200 focus:bg-white transition-all outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent" />

                    {/* Section 3: Summary, Blockers, Plan */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">03</span>
                                    Work Summary
                                </h3>
                                <textarea
                                    required
                                    placeholder="What did you accomplish today?"
                                    value={formData.summary}
                                    onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                                    rows={4}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm transition-all focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white outline-none shadow-sm"
                                />
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[10px] text-slate-400 font-medium italic">Total logged hours will be auto-calculated</p>
                                    <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[13px] font-black border border-blue-100">
                                        {totalHours} hrs Total
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">04</span>
                                        Blockers (if any)
                                    </h3>
                                    <textarea
                                        placeholder="Any issues or blockers holding you back?"
                                        value={formData.blockers}
                                        onChange={(e) => setFormData(prev => ({ ...prev, blockers: e.target.value }))}
                                        rows={2}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm transition-all focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 focus:bg-white outline-none shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-[10px]">05</span>
                                        Tomorrow's Plan
                                    </h3>
                                    <textarea
                                        placeholder="What's on the agenda for tomorrow?"
                                        value={formData.tomorrowPlan}
                                        onChange={(e) => setFormData(prev => ({ ...prev, tomorrowPlan: e.target.value }))}
                                        rows={2}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm transition-all focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:bg-white outline-none shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex justify-between items-center rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3 disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Submit Daily Report
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
