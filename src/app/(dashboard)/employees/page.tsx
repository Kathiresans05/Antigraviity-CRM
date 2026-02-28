"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search, Plus, Users, Mail, Phone, Briefcase,
    CheckCircle, XCircle, Eye, EyeOff, X, UserPlus, ExternalLink, Edit
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Employee {
    _id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
    department?: string;
    joinDate?: string;
    isActive: boolean;
    onboardingStatus: string;
    reportingManager?: {
        name: string;
        role: string;
    } | string | null;
}

const DEPARTMENTS = ["Engineering", "Design", "Product", "Marketing", "HR", "Sales", "Finance", "Support", "Operations", "Information Technology (IT)", "DevOps", "Cybersecurity"];
const AVATAR_COLORS = [
    "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500",
    "bg-orange-500", "bg-blue-500", "bg-pink-500", "bg-yellow-500", "bg-blue-500"
];

function EmployeesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const canManage = session?.user && ['Admin', 'Manager', 'HR', 'HR Manager'].includes((session?.user as any).role);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "", email: "", password: "",
        phone: "", department: "", role: "Employee",
        reportingManager: ""
    });

    const fetchEmployees = async () => {
        try {
            const res = await axios.get("/api/users");
            setEmployees(res.data?.users || []);
        } catch (e) {
            console.error("Failed to fetch employees", e);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEmployees(); }, []);

    useEffect(() => {
        if (searchParams.get("add") === "true") {
            setShowModal(true);
            setEditingId(null);
            setForm({
                name: "", email: "", password: "",
                phone: "", department: "", role: "Employee",
                reportingManager: session?.user?.role === 'Manager' ? (session.user as any).id : ""
            });
            // Optional: clean up the URL
            router.replace("/employees");
        }
    }, [searchParams, router, session]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            if (editingId) {
                await axios.patch("/api/users", { id: editingId, ...form });
                setSuccessMsg(`✅ ${form.name} updated successfully!`);
            } else {
                await axios.post("/api/users", form);
                setSuccessMsg(`✅ ${form.name} added successfully!`);
            }
            setForm({ name: "", email: "", password: "", phone: "", department: "", role: "Employee", reportingManager: "" });
            setEditingId(null);
            setShowModal(false);
            fetchEmployees();
            setTimeout(() => setSuccessMsg(""), 4000);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to save employee.");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleActive = async (id: string, current: boolean) => {
        try {
            await axios.patch("/api/users", { id, isActive: !current });
            setEmployees(prev => prev.map(e => e._id === id ? { ...e, isActive: !current } : e));
        } catch (e) {
            console.error("Failed to toggle status", e);
        }
    };

    const filtered = (employees || []).filter(e => e && e.isActive).filter(e => {
        const name = (e.name || "").toLowerCase();
        const email = (e.email || "").toLowerCase();
        const dept = (e.department || "").toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || email.includes(search) || dept.includes(search);
    });

    const getInitials = (name: string) => {
        if (!name) return "??";
        const parts = name.split(" ").filter(Boolean);
        if (parts.length === 0) return "??";
        return parts.map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    const getAvatarColor = (name: string) => {
        if (!name) return "bg-gray-400";
        return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
    };

    return (
        <div className="space-y-6">

            {/* Success toast */}
            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-300">
                    <CheckCircle className="w-4 h-4" /> {successMsg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Employees</h2>
                        <p className="text-xs text-gray-500">
                            {(employees || []).length} total · {(employees || []).filter(e => e?.isActive).length} active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search employees…"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                    </div>
                    {canManage && (
                        <div className="flex gap-2">
                            <Link
                                href="/manage-teams"
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm whitespace-nowrap"
                            >
                                <Users className="w-4 h-4" /> Manage Teams
                            </Link>
                            <button
                                onClick={() => { setShowModal(true); setError(""); }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                            >
                                <UserPlus className="w-4 h-4" /> Add Employee
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                <th className="px-6 py-4 font-semibold">Employee</th>
                                <th className="px-6 py-4 font-semibold">Contact</th>
                                <th className="px-6 py-4 font-semibold">Department</th>
                                <th className="px-6 py-4 font-semibold">Role</th>
                                <th className="px-6 py-4 font-semibold">Join Date</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">Loading employees…</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No employees found.</td></tr>
                            ) : filtered.map((emp) => (
                                <tr key={emp._id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <Link href={`/employees/${emp._id || (emp as any).id}`} prefetch={false} className="block group/item">
                                            <div className="flex items-center gap-3 p-1 -m-1 rounded-lg hover:bg-blue-50/50 transition-all duration-200">
                                                <div className={`w-9 h-9 rounded-full ${getAvatarColor(emp.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover/item:scale-105 transition-transform`}>
                                                    {getInitials(emp.name)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-800 group-hover/item:text-blue-600 transition-colors flex items-center gap-1">
                                                        {emp.name}
                                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <p className="text-xs text-gray-400 font-medium">{emp.role}</p>
                                                        {emp.reportingManager && typeof emp.reportingManager === 'object' && (
                                                            <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                                                                Rep. to: {emp.reportingManager.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Mail className="w-3 h-3" />{emp.email}
                                            </div>
                                            {emp.phone && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <Phone className="w-3 h-3" />{emp.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {emp.department ? (
                                            <div className="flex items-center gap-1.5">
                                                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm text-gray-700">{emp.department}</span>
                                            </div>
                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${emp.role === 'Admin' ? 'bg-violet-100 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
                                            {emp.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                    </td>
                                    <td className="px-6 py-4">
                                        {emp.isActive ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {canManage && (
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(emp._id);
                                                        setForm({
                                                            name: emp.name,
                                                            email: emp.email,
                                                            password: "", // Empty means no change
                                                            phone: emp.phone || "",
                                                            department: emp.department || "",
                                                            role: emp.role,
                                                            reportingManager: (emp as any).reportingManager || ""
                                                        });
                                                        setShowModal(true);
                                                        setError("");
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Employee"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleActive(emp._id, emp.isActive)}
                                                    title={emp.isActive ? "Deactivate" : "Activate"}
                                                    className={`p-1.5 rounded-lg transition-colors ${emp.isActive ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                >
                                                    {emp.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        Showing {filtered.length} of {employees.length} employees
                    </span>
                </div>
            </div>

            {/* Add Employee Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-all duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{editingId ? 'Update employee details and reporting lines' : 'Create a new employee account'}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm flex items-center gap-2">
                                    <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
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
                                        {editingId ? "Reset Password" : "Password"} {!editingId && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        name="password" type={showPassword ? "text" : "password"}
                                        required={!editingId}
                                        value={form.password} onChange={handleChange}
                                        placeholder={editingId ? "Leave blank to keep current" : "Min. 6 characters"}
                                        className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    {editingId && <p className="text-[10px] text-amber-600 font-medium mt-1">Leave blank to keep existing password</p>}
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
                                        {employees.filter(e => ['Admin', 'Manager', 'HR Manager', 'TL'].includes(e.role)).map(e => (
                                            <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
                                    {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : editingId ? <CheckCircle className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                    {submitting ? "Saving…" : editingId ? "Save Changes" : "Add Employee"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EmployeesPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[400px] items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            </div>
        }>
            <EmployeesContent />
        </Suspense>
    );
}
