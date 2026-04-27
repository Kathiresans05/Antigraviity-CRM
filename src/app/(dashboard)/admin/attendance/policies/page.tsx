"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Search, Edit2, Trash2, Shield, Clock, Calendar, 
    ChevronRight, CheckCircle2, AlertCircle, X, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import moment from 'moment';

interface AttendancePolicy {
    _id: string;
    name: string;
    description: string;
    gracePeriodLate: number;
    gracePeriodEarly: number;
    minHoursFullDay: number;
    minHoursHalfDay: number;
    absentThreshold: number;
    maxBreakDuration: number;
    isBreakIncludedInWorkingHours: boolean;
    workingDays: number[];
    isActive: boolean;
}

export default function AttendancePoliciesPage() {
    const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<AttendancePolicy | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<AttendancePolicy>>({
        name: "",
        description: "",
        gracePeriodLate: 15,
        gracePeriodEarly: 0,
        minHoursFullDay: 480,
        minHoursHalfDay: 240,
        absentThreshold: 120,
        maxBreakDuration: 60,
        isBreakIncludedInWorkingHours: false,
        workingDays: [1, 2, 3, 4, 5],
        isActive: true
    });

    const fetchPolicies = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/admin/attendance-policies');
            setPolicies(res.data.policies);
        } catch (error) {
            toast.error("Failed to fetch policies");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const handleOpenModal = (policy?: AttendancePolicy) => {
        if (policy) {
            setEditingPolicy(policy);
            setFormData(policy);
        } else {
            setEditingPolicy(null);
            setFormData({
                name: "",
                description: "",
                gracePeriodLate: 15,
                gracePeriodEarly: 0,
                minHoursFullDay: 480,
                minHoursHalfDay: 240,
                absentThreshold: 120,
                maxBreakDuration: 60,
                isBreakIncludedInWorkingHours: false,
                workingDays: [1, 2, 3, 4, 5],
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPolicy(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPolicy) {
                await axios.put(`/api/admin/attendance-policies/${editingPolicy._id}`, formData);
                toast.success("Policy updated successfully");
            } else {
                await axios.post('/api/admin/attendance-policies', formData);
                toast.success("Policy created successfully");
            }
            fetchPolicies();
            handleCloseModal();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Something went wrong");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this policy?")) return;
        try {
            await axios.delete(`/api/admin/attendance-policies/${id}`);
            toast.success("Policy deleted");
            fetchPolicies();
        } catch (error) {
            toast.error("Failed to delete policy");
        }
    };

    const toggleWorkingDay = (day: number) => {
        const current = formData.workingDays || [];
        if (current.includes(day)) {
            setFormData({ ...formData, workingDays: current.filter(d => d !== day) });
        } else {
            setFormData({ ...formData, workingDays: [...current, day].sort() });
        }
    };

    const filteredPolicies = policies.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-xl">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                        Attendance Policies
                    </h1>
                    <p className="text-zinc-400 mt-1">Configure and manage corporate attendance rules</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/20 active:scale-95 font-medium"
                >
                    <Plus size={20} />
                    New Policy
                </button>
            </div>

            {/* Search and Filters */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                <input 
                    type="text" 
                    placeholder="Search policies..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-zinc-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Policies Grid */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode='popLayout'>
                        {filteredPolicies.map((policy) => (
                            <motion.div 
                                key={policy._id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-indigo-500/50 transition-all duration-500 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onClick={() => handleOpenModal(policy)} className="p-2 bg-zinc-800 hover:bg-indigo-600 rounded-lg transition-colors text-zinc-400 hover:text-white">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(policy._id)} className="p-2 bg-zinc-800 hover:bg-red-600 rounded-lg transition-colors text-zinc-400 hover:text-white">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl group-hover:text-indigo-400 transition-colors">{policy.name}</h3>
                                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${policy.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {policy.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-zinc-500 text-sm line-clamp-2 min-h-[40px]">
                                        {policy.description || "No description provided."}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Grace (Late)</p>
                                            <div className="flex items-center gap-2 text-zinc-300">
                                                <Clock size={14} className="text-indigo-400" />
                                                <span className="font-medium">{policy.gracePeriodLate}m</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Full Day Min</p>
                                            <div className="flex items-center gap-2 text-zinc-300">
                                                <Calendar size={14} className="text-purple-400" />
                                                <span className="font-medium">{Math.floor(policy.minHoursFullDay / 60)}h {policy.minHoursFullDay % 60}m</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest mb-2">Working Days</p>
                                        <div className="flex gap-1">
                                            {dayLabels.map((day, idx) => (
                                                <div 
                                                    key={idx}
                                                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${
                                                        policy.workingDays.includes(idx) 
                                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                                        : 'bg-zinc-800 border-zinc-700 text-zinc-600'
                                                    }`}
                                                >
                                                    {day[0]}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseModal}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden relative shadow-2xl"
                        >
                            <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                            {editingPolicy ? <Edit2 size={20} /> : <Plus size={20} />}
                                        </div>
                                        <h2 className="text-2xl font-bold">{editingPolicy ? 'Edit Policy' : 'Create New Policy'}</h2>
                                    </div>
                                    <button onClick={handleCloseModal} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Name */}
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Policy Name</label>
                                            <input 
                                                required
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. Standard Corporate Policy"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Description</label>
                                            <textarea 
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all h-24 resize-none"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Briefly describe the purpose of this policy..."
                                            />
                                        </div>

                                        {/* Grace Periods */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Grace Period (Late) - mins</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={formData.gracePeriodLate ?? ""}
                                                onChange={(e) => setFormData({ ...formData, gracePeriodLate: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Grace Period (Early) - mins</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={formData.gracePeriodEarly ?? ""}
                                                onChange={(e) => setFormData({ ...formData, gracePeriodEarly: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>

                                        {/* Work Hour Thresholds */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Full Day Min (mins)</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={formData.minHoursFullDay ?? ""}
                                                onChange={(e) => setFormData({ ...formData, minHoursFullDay: parseInt(e.target.value) || 0 })}
                                            />
                                            <p className="text-[10px] text-zinc-600 ml-1">{Math.floor((formData.minHoursFullDay || 0) / 60)} hours {(formData.minHoursFullDay || 0) % 60} mins</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Half Day Min (mins)</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={formData.minHoursHalfDay ?? ""}
                                                onChange={(e) => setFormData({ ...formData, minHoursHalfDay: parseInt(e.target.value) || 0 })}
                                            />
                                            <p className="text-[10px] text-zinc-600 ml-1">{Math.floor((formData.minHoursHalfDay || 0) / 60)} hours {(formData.minHoursHalfDay || 0) % 60} mins</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Absent Threshold (mins)</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={formData.absentThreshold ?? ""}
                                                onChange={(e) => setFormData({ ...formData, absentThreshold: parseInt(e.target.value) || 0 })}
                                            />
                                            <p className="text-[10px] text-zinc-600 ml-1">Work less than this to be marked Absent</p>
                                        </div>

                                        {/* Break Rules */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Max Break (mins)</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                value={formData.maxBreakDuration ?? ""}
                                                onChange={(e) => setFormData({ ...formData, maxBreakDuration: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>

                                        <div className="space-y-4 col-span-2 py-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 p-4">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Additional Options</label>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input 
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                                                        checked={formData.isBreakIncludedInWorkingHours}
                                                        onChange={(e) => setFormData({ ...formData, isBreakIncludedInWorkingHours: e.target.checked })}
                                                    />
                                                    <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">Include Breaks in Working Hours</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input 
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                                                        checked={formData.isActive}
                                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                    />
                                                    <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">Policy Active</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Working Days */}
                                        <div className="space-y-4 col-span-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Working Days</label>
                                            <div className="flex flex-wrap gap-2">
                                                {dayLabels.map((day, idx) => (
                                                    <button 
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => toggleWorkingDay(idx)}
                                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-300 ${
                                                            formData.workingDays?.includes(idx) 
                                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                                                            : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                                                        }`}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 flex gap-4">
                                        <button 
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-bold transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                        >
                                            <Save size={20} />
                                            {editingPolicy ? 'Update Policy' : 'Create Policy'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #27272a;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #3f3f46;
                }
            `}</style>
        </div>
    );
}
