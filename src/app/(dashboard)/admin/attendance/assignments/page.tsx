"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Clock, Shield, Search, Plus, Calendar, 
    ArrowRight, CheckCircle2, AlertCircle, X, ChevronDown, UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import moment from 'moment';

interface User {
    _id: string;
    name: string;
    employeeCode: string;
    department: string;
}

interface Shift {
    _id: string;
    name: string;
    startTime: string;
    endTime: string;
}

interface AttendancePolicy {
    _id: string;
    name: string;
}

interface Assignment {
    _id: string;
    userId: User;
    shiftId: Shift;
    policyId: AttendancePolicy;
    effectiveFrom: string;
    notes: string;
}

export default function AttendanceAssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userSearch, setUserSearch] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        userIds: [] as string[],
        shiftId: "",
        policyId: "",
        effectiveFrom: moment().format('YYYY-MM-DD'),
        notes: ""
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [assRes, userRes, shiftRes, policyRes] = await Promise.all([
                axios.get('/api/admin/shift-assignments'),
                axios.get('/api/users?status=active'),
                axios.get('/api/admin/shifts'),
                axios.get('/api/admin/attendance-policies')
            ]);
            setAssignments(assRes.data.assignments);
            setUsers(userRes.data.users);
            setShifts(shiftRes.data.shifts);
            setPolicies(policyRes.data.policies);
        } catch (error) {
            toast.error("Failed to fetch data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/shift-assignments', formData);
            toast.success("Shift and Policy assigned successfully");
            fetchData();
            setIsModalOpen(false);
            setFormData({
                userIds: [],
                shiftId: "",
                policyId: "",
                effectiveFrom: moment().format('YYYY-MM-DD'),
                notes: ""
            });
            setUserSearch("");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to assign");
        }
    };

    const filteredAssignments = assignments.filter(a => 
        a.userId?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.userId?.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-xl">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
                        Attendance Assignments
                    </h1>
                    <p className="text-zinc-400 mt-1">Map employees to operational shifts and policies</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20 active:scale-95 font-medium"
                >
                    <UserPlus size={20} />
                    Assign Shift
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-2">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Assignments</p>
                    <p className="text-4xl font-black text-white">{assignments.length}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-2">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Active Users</p>
                    <p className="text-4xl font-black text-white">{users.length}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-2">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Coverage</p>
                    <p className="text-4xl font-black text-white">
                        {Math.round((assignments.length / users.length) * 100) || 0}%
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                <input 
                    type="text" 
                    placeholder="Search by employee name or code..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-zinc-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Assignments List */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-950/50 border-b border-zinc-800">
                                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Employee</th>
                                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Assigned Shift</th>
                                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Attendance Policy</th>
                                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Effective Date</th>
                                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {filteredAssignments.map((ass) => (
                                <tr key={ass._id} className="hover:bg-zinc-800/30 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-zinc-700">
                                                {ass.userId?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-100">{ass.userId?.name}</p>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase">{ass.userId?.employeeCode || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-zinc-300">
                                            <Clock size={14} className="text-emerald-400" />
                                            <span className="font-medium">{ass.shiftId?.name}</span>
                                            <span className="text-[10px] text-zinc-500 ml-1">({ass.shiftId?.startTime} - {ass.shiftId?.endTime})</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-zinc-300">
                                            <Shield size={14} className="text-teal-400" />
                                            <span className="font-medium">{ass.policyId?.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <Calendar size={14} />
                                            <span className="text-sm">{moment(ass.effectiveFrom).format('DD MMM YYYY')}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <button className="text-zinc-500 hover:text-white transition-colors">
                                            <ArrowRight size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredAssignments.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-zinc-500 italic">
                                        No assignments found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Assignment Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-[2.5rem] relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">New Assignment</h2>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white">
                                        <X size={28} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                     <div className="space-y-4">
                                         {/* Multi-User Selection */}
                                         <div className="space-y-2">
                                             <div className="flex items-center justify-between ml-1">
                                                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Select Employees ({formData.userIds.length} selected)</label>
                                                 <div className="flex gap-4">
                                                     <button 
                                                         type="button" 
                                                         onClick={() => setFormData({ ...formData, userIds: users.map(u => u._id) })}
                                                         className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest"
                                                     >
                                                         Select All
                                                     </button>
                                                     <button 
                                                         type="button" 
                                                         onClick={() => setFormData({ ...formData, userIds: [] })}
                                                         className="text-[10px] font-bold text-rose-500 hover:text-rose-400 uppercase tracking-widest"
                                                     >
                                                         Clear All
                                                     </button>
                                                 </div>
                                             </div>
                                             
                                             <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
                                                 <div className="relative">
                                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                                     <input 
                                                         type="text"
                                                         placeholder="Search employees..."
                                                         className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                         onChange={(e) => {
                                                             const q = e.target.value.toLowerCase();
                                                             // Local filter for the list below
                                                             setUserSearch(q);
                                                         }}
                                                         value={userSearch}
                                                     />
                                                 </div>
                                                 
                                                 <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                                                     {users.filter(u => 
                                                         u.name.toLowerCase().includes(userSearch) || 
                                                         u.employeeCode?.toLowerCase().includes(userSearch)
                                                     ).map(u => (
                                                         <label key={u._id} className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors group">
                                                             <input 
                                                                 type="checkbox"
                                                                 className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600 focus:ring-emerald-500"
                                                                 checked={formData.userIds.includes(u._id)}
                                                                 onChange={(e) => {
                                                                     const current = formData.userIds;
                                                                     if (e.target.checked) {
                                                                         setFormData({ ...formData, userIds: [...current, u._id] });
                                                                     } else {
                                                                         setFormData({ ...formData, userIds: current.filter(id => id !== u._id) });
                                                                     }
                                                                 }}
                                                             />
                                                             <div className="flex flex-col">
                                                                 <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">{u.name}</span>
                                                                 <span className="text-[10px] text-zinc-500 font-medium uppercase">{u.employeeCode}</span>
                                                             </div>
                                                         </label>
                                                     ))}
                                                 </div>
                                             </div>
                                         </div>

                                         <div className="grid grid-cols-2 gap-4">
                                             {/* Shift Selection */}
                                             <div className="space-y-2">
                                                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Assigned Shift</label>
                                                 <select 
                                                     required
                                                     className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none text-sm font-bold"
                                                     value={formData.shiftId}
                                                     onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                                                 >
                                                     <option value="">Select shift...</option>
                                                     {shifts.map(s => (
                                                         <option key={s._id} value={s._id}>{s.name}</option>
                                                     ))}
                                                 </select>
                                             </div>

                                             {/* Policy Selection */}
                                             <div className="space-y-2">
                                                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Attendance Policy</label>
                                                 <select 
                                                     required
                                                     className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none text-sm font-bold"
                                                     value={formData.policyId}
                                                     onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                                                 >
                                                     <option value="">Select policy...</option>
                                                     {policies.map(p => (
                                                         <option key={p._id} value={p._id}>{p.name}</option>
                                                     ))}
                                                 </select>
                                             </div>
                                         </div>

                                         {/* Effective From */}
                                         <div className="space-y-2">
                                             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Effective From</label>
                                             <input 
                                                 type="date"
                                                 required
                                                 className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all text-sm font-bold"
                                                 value={formData.effectiveFrom}
                                                 onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                             />
                                         </div>

                                         {/* Notes */}
                                         <div className="space-y-2">
                                             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Assignment Notes</label>
                                             <textarea 
                                                 className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all h-24 resize-none text-sm font-medium"
                                                 value={formData.notes}
                                                 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                 placeholder="Any additional details..."
                                             />
                                         </div>
                                     </div>

                                     <button 
                                         type="submit"
                                         disabled={formData.userIds.length === 0}
                                         className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] mt-4"
                                     >
                                         Execute Bulk Assignment
                                     </button>
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
