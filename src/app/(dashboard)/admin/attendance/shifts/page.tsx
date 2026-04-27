"use client";

import { useState, useEffect } from "react";
import { 
    Clock, Plus, Save, Trash2, Edit2, X, Check, 
    AlertCircle, Timer, Calendar, Info, RefreshCw,
    Moon, Sun, Coffee
} from "lucide-react";
import toast from "react-hot-toast";

interface Shift {
    _id: string;
    name: string;
    shiftType: 'General' | 'Night' | 'Flexible' | 'Rotational';
    startTime: string;
    endTime: string;
    halfDayCutoffTime: string;
    description: string;
}

export default function ShiftManagement() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentShift, setCurrentShift] = useState<Partial<Shift>>({
        name: "",
        shiftType: 'General',
        startTime: "09:00",
        endTime: "18:00",
        halfDayCutoffTime: "11:30",
        description: ""
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/shifts");
            if (!res.ok) throw new Error("Failed to fetch shifts");
            const data = await res.json();
            setShifts(data.shifts);
        } catch (error) {
            toast.error("Failed to load shifts");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const url = currentShift._id ? `/api/admin/shifts/${currentShift._id}` : "/api/admin/shifts";
            const method = currentShift._id ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentShift)
            });

            if (!res.ok) throw new Error("Failed to save shift");

            toast.success(currentShift._id ? "Shift updated" : "Shift created");
            setIsDialogOpen(false);
            fetchShifts();
        } catch (error) {
            toast.error("Error saving shift");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this shift?")) return;

        try {
            const res = await fetch(`/api/admin/shifts/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete shift");
            toast.success("Shift deleted");
            fetchShifts();
        } catch (error) {
            toast.error("Error deleting shift");
        }
    };

    const openEdit = (shift: Shift) => {
        setCurrentShift({
            ...shift,
            halfDayCutoffTime: shift.halfDayCutoffTime || "11:30",
        });
        setIsDialogOpen(true);
    };

    const openCreate = () => {
        setCurrentShift({
            name: "",
            shiftType: 'General',
            startTime: "09:00",
            endTime: "18:00",
            halfDayCutoffTime: "11:30",
            description: ""
        });
        setIsDialogOpen(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-gray-500 font-medium animate-pulse">Synchronizing Schedules...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 sm:px-6">
            {/* Header section with glassmorphism */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-8 sm:p-10 rounded-[48px] border border-indigo-50 shadow-sm gap-6">
                <div className="flex items-center gap-6">
                    <div className="p-5 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] text-white shadow-xl shadow-indigo-100">
                        <Clock className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-none mb-2">Shift Configuration</h1>
                        <p className="text-gray-400 font-medium text-sm">Define operational windows and shift types.</p>
                    </div>
                </div>
                <button 
                    onClick={openCreate}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black text-sm hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Create New Shift
                </button>
            </div>

            {/* Shift Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shifts.map((shift) => (
                    <div 
                        key={shift._id} 
                        className="group bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500 relative overflow-hidden"
                    >
                        {/* Status badge */}
                        <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <Check className="w-3 h-3" /> Active
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {shift.shiftType || 'General'}
                            </span>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-50 text-indigo-600 rounded-2xl">
                                    {shift.shiftType === 'Night' ? <Moon className="w-6 h-6" /> : shift.shiftType === 'Flexible' ? <Coffee className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{shift.name}</h3>
                                    <p className="text-xs text-gray-400 font-medium line-clamp-1">{shift.description || "No description provided."}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-50">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Starts At</p>
                                    <p className="text-lg font-black text-indigo-950">{shift.startTime}</p>
                                </div>
                                <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-50">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ends At</p>
                                    <p className="text-lg font-black text-indigo-950">{shift.endTime}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button 
                                    onClick={() => openEdit(shift)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-2xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-gray-100"
                                >
                                    <Edit2 className="w-4 h-4" /> Edit
                                </button>
                                <button 
                                    onClick={() => handleDelete(shift._id)}
                                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-gray-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {shifts.length === 0 && (
                    <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[48px] p-20 flex flex-col items-center text-center">
                        <div className="p-6 bg-white rounded-full shadow-sm mb-6">
                            <Calendar className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No custom shifts defined</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">Create your first shift to begin customizing employee attendance windows.</p>
                    </div>
                )}
            </div>

            {/* Compliance Footer */}
            <div className="bg-indigo-900 text-white p-10 rounded-[56px] shadow-2xl shadow-indigo-100 flex flex-col md:flex-row items-center gap-10">
                <div className="p-6 bg-white/10 rounded-[32px] backdrop-blur-xl border border-white/10 shrink-0 shadow-lg">
                    <Info className="w-12 h-12 text-indigo-300" />
                </div>
                <div className="space-y-4">
                    <h3 className="text-2xl font-black tracking-tight leading-none uppercase italic">Shift Integrity Protocol</h3>
                    <p className="text-indigo-200 leading-relaxed text-sm font-medium">
                        Changes to shift timings will be applied to <span className="text-white font-bold underline decoration-indigo-400">future attendance sessions</span> only. Retroactive changes will not affect historical data to maintain auditing integrity. Employees assigned to a deleted shift will revert to the Global Default automatically.
                    </p>
                </div>
            </div>

            {/* Modal Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl border border-gray-100 ring-1 ring-black/5 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{currentShift._id ? "Edit Shift" : "New Shift Template"}</h2>
                                <button onClick={() => setIsDialogOpen(false)} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Shift Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Night Operation, Standard Morning"
                                        className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100"
                                        value={currentShift.name || ""}
                                        onChange={(e) => setCurrentShift({...currentShift, name: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Shift Type</label>
                                    <select 
                                        className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100"
                                        value={currentShift.shiftType || "General"}
                                        onChange={(e) => setCurrentShift({...currentShift, shiftType: e.target.value as any})}
                                    >
                                        <option value="General">General</option>
                                        <option value="Night">Night Shift</option>
                                        <option value="Flexible">Flexible</option>
                                        <option value="Rotational">Rotational</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Check-in Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100"
                                            value={currentShift.startTime || ""}
                                            onChange={(e) => setCurrentShift({...currentShift, startTime: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Check-out Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100"
                                            value={currentShift.endTime || ""}
                                            onChange={(e) => setCurrentShift({...currentShift, endTime: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Half-Day Cutoff</label>
                                    <input 
                                        type="time" 
                                        className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-100"
                                        value={currentShift.halfDayCutoffTime || ""}
                                        onChange={(e) => setCurrentShift({...currentShift, halfDayCutoffTime: e.target.value})}
                                    />
                                    <p className="text-[9px] text-gray-400 font-medium px-1 italic">Clock-in after this = Half Day</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Operational Description</label>
                                    <textarea 
                                        placeholder="Briefly describe the purpose or department for this shift..."
                                        className="w-full bg-gray-50 border-none rounded-3xl p-5 text-sm font-medium text-gray-600 focus:ring-2 focus:ring-indigo-100 resize-none min-h-[100px]"
                                        value={currentShift.description || ""}
                                        onChange={(e) => setCurrentShift({...currentShift, description: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4">
                                <button 
                                    onClick={() => setIsDialogOpen(false)}
                                    className="flex-1 py-5 bg-gray-50 text-gray-500 rounded-3xl font-black text-sm hover:bg-gray-100 transition-all uppercase tracking-widest"
                                >
                                    Discard
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 uppercase tracking-widest flex items-center justify-center gap-3"
                                >
                                    {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {currentShift._id ? "Deploy Update" : "Establish Shift"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
