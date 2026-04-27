"use client";

import { useState, useEffect } from "react";
import { X, Eye, EyeOff, CheckCircle, UserPlus, XCircle } from "lucide-react";
import axios from "axios";
import clsx from "clsx";

interface Employee {
    _id: string;
    id?: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
    department?: string;
    joinDate?: string;
    isActive: boolean;
    status?: 'active' | 'inactive';
    onboardingStatus: string;
    reportingManager?: {
        name: string;
        role: string;
    } | string | null;
}

const DEPARTMENTS = ["Engineering", "Design", "Product", "Marketing", "HR", "Sales", "Finance", "Support", "Operations", "Information Technology (IT)", "DevOps", "Cybersecurity"];

interface EmployeeEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingId: string | null;
    employees: Employee[];
    onSuccess: (msg: string) => void;
    initialData?: any;
    currentUserId?: string;
}

export default function EmployeeEditModal({ isOpen, onClose, editingId, employees, onSuccess, initialData, currentUserId }: EmployeeEditModalProps) {
    const [localEditingId, setLocalEditingId] = useState<string | null>(editingId);
    const [form, setForm] = useState({
        name: "", email: "", password: "",
        phone: "", department: "", role: "Employee",
        reportingManager: "",
        shift: ""
    });
    const [availableShifts, setAvailableShifts] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setLocalEditingId(editingId);
        if (initialData) {
            setForm({
                name: initialData.name || "",
                email: initialData.email || "",
                password: "",
                phone: initialData.phone || "",
                department: initialData.department || "",
                role: initialData.role || "Employee",
                reportingManager: (typeof initialData.reportingManager === 'object') ? initialData.reportingManager?._id : initialData.reportingManager || "",
                shift: initialData.shift || ""
            });
        } else {
            setForm({
                name: "", email: "", password: "",
                phone: "", department: "", role: "Employee",
                reportingManager: "",
                shift: ""
            });
        }

        // Fetch shifts for the dropdown
        const fetchShifts = async () => {
            try {
                const res = await axios.get("/api/admin/shifts");
                setAvailableShifts(res.data.shifts || []);
            } catch (err) {
                console.error("Failed to fetch shifts", err);
            }
        };
        fetchShifts();
        setError("");
    }, [initialData, editingId, isOpen]);

    if (!isOpen) return null;

    const handleSelectEmployee = (id: string) => {
        const emp = employees.find(e => e._id === id || e.id === id);
        if (emp) {
            setLocalEditingId(emp._id || emp.id || null);
            setForm({
                name: emp.name || "",
                email: emp.email || "",
                password: "",
                phone: emp.phone || "",
                department: emp.department || "",
                role: emp.role || "Employee",
                reportingManager: (typeof emp.reportingManager === 'object') ? (emp.reportingManager as any)?._id : emp.reportingManager || "",
                shift: (emp as any).shift || ""
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!localEditingId) {
            setError("Please select an employee to edit.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            await axios.patch("/api/users", { id: localEditingId, ...form });
            onSuccess(`${form.name} updated successfully!`);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-all duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Edit Employee Details</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Update employee records and professional details</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm flex items-center gap-2">
                            <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                        </div>
                    )}

                    {!editingId && (
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Select Employee to Manage</label>
                            <select
                                onChange={(e) => handleSelectEmployee(e.target.value)}
                                value={localEditingId || ""}
                                className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-800"
                            >
                                <option value="">Choose an employee...</option>
                                {employees.map(e => (
                                    <option key={e._id || e.id} value={e._id || e.id}>{e.name} ({e.department})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={clsx("grid grid-cols-2 gap-4 transition-all duration-300", !localEditingId && !editingId && "opacity-40 pointer-events-none grayscale")}>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                            <input
                                name="name" required value={form.name} onChange={handleChange}
                                placeholder="e.g. Priya Sharma"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                            <input
                                name="email" type="email" required value={form.email} onChange={handleChange}
                                placeholder="priya@company.com"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div className="col-span-2 relative">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Reset Password
                            </label>
                            <input
                                name="password" type={showPassword ? "text" : "password"}
                                value={form.password} onChange={handleChange}
                                placeholder="Leave blank to keep current"
                                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <p className="text-[10px] text-amber-600 font-medium mt-1">Leave blank to keep existing password</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone</label>
                            <input
                                name="phone" value={form.phone} onChange={handleChange}
                                placeholder="+91 99999 00000"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Department</label>
                            <select
                                name="department" value={form.department} onChange={handleChange}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            >
                                <option value="">Select dept…</option>
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
                            <select
                                name="role" value={form.role} onChange={handleChange}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            >
                                <option value="Employee">Employee</option>
                                <option value="HR">HR</option>
                                <option value="HR Manager">HR Manager</option>
                                <option value="Manager">Manager</option>
                                <option value="TL">TL</option>
                                <option value="Assigned Manager">Assigned Manager</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reporting Manager</label>
                            <select
                                name="reportingManager" value={form.reportingManager} onChange={handleChange}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
                            >
                                <option value="">Select manager…</option>
                                {employees.filter(e => {
                                    const employeeId = e._id || e.id;
                                    return employeeId !== localEditingId && ['Admin', 'Manager', 'HR Manager', 'TL'].includes(e.role);
                                }).map(e => (
                                    <option key={e._id || e.id} value={e._id || e.id}>{e.name} ({e.role})</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-bold text-indigo-600">Work Shift Assignment</label>
                            <select
                                name="shift" value={form.shift} onChange={handleChange}
                                className="w-full px-3 py-2.5 border border-indigo-100 rounded-xl text-sm bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-bold text-gray-800"
                            >
                                <option value="">Default (10:00 AM)</option>
                                {availableShifts.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.startTime} - {s.endTime})</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium italic">Assigning a specific shift overrides the global default attendance window.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting || (!localEditingId && !editingId)} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            {submitting ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
