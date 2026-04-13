"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search, Plus, Users, Mail, Phone, Briefcase,
    CheckCircle, XCircle, Eye, EyeOff, X, UserPlus, ExternalLink, Edit, FileWarning,
    Upload, Download, Trash2, FileText, Check, AlertCircle
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import EmployeeEditModal from "@/frontend/components/EmployeeEditModal";

interface DocumentInfo {
    url?: string;
    status: 'Pending' | 'Uploaded' | 'Verified' | 'Rejected';
    uploadedAt?: string;
    feedback?: string;
}

interface Employee {
    _id: string;
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
    documents?: {
        aadharCard?: DocumentInfo;
        panCard?: DocumentInfo;
        resume?: DocumentInfo;
        offerLetter?: DocumentInfo;
        certificates?: DocumentInfo;
    };
}

const DEPARTMENTS = ["Engineering", "Design", "Product", "Marketing", "HR", "Sales", "Finance", "Support", "Operations", "Information Technology (IT)", "DevOps", "Cybersecurity"];
const AVATAR_COLORS = [
    "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500",
    "bg-orange-500", "bg-blue-500", "bg-pink-500", "bg-yellow-500", "bg-blue-500"
];

function IOSSwitch({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onChange();
            }}
            disabled={disabled}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
                checked ? "bg-emerald-500" : "bg-gray-200"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    checked ? "translate-x-4" : "translate-x-1"
                }`}
            />
        </button>
    );
}

function EmployeesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const canManage = !!(session?.user && ['Admin', 'Manager', 'HR', 'HR Manager'].includes((session?.user as any).role));
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [showDocsModal, setShowDocsModal] = useState(false);
    const [selectedEmployeeForDocs, setSelectedEmployeeForDocs] = useState<Employee | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [initialFormData, setInitialFormData] = useState<any>(null);
    const [successMsg, setSuccessMsg] = useState("");

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
        const editId = searchParams.get("edit");
        if (editId && employees.length > 0) {
            const emp = employees.find(e => e._id === editId);
            if (emp) {
                setEditingId(emp._id);
                setInitialFormData(emp);
                setShowEditModal(true);
            }
            // Clean up URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete("edit");
            router.replace(`/employees${params.toString() ? `?${params.toString()}` : ""}`);
        }
    }, [searchParams, employees, router]);

    useEffect(() => {
        const addParam = searchParams.get("add");
        const filterParam = searchParams.get("filter");

        if (addParam === "true") {
            setEditingId(null);
            setInitialFormData(null);
            setShowEditModal(true);
            router.replace("/employees");
        } else if (filterParam === "pending-docs") {
            setFilterStatus("All");
            // We'll handle the actual filtering in the 'filtered' memo
        }
    }, [searchParams, router, session]);


    const toggleActive = async (id: string, currentStatus: string | undefined, currentActive: boolean) => {
        const newStatus = (currentStatus === 'active' || (currentStatus === undefined && currentActive)) ? 'inactive' : 'active';
        try {
            await axios.patch("/api/users", { id, status: newStatus });
            setEmployees(prev => prev.map(e => e._id === id ? { ...e, status: newStatus, isActive: newStatus === 'active' } : e));
        } catch (e) {
            console.error("Failed to toggle status", e);
        }
    };

    const filtered = (employees || []).filter(e => {
        if (!e) return false;
        const isActive = e.status === 'active' || (e.status === undefined && e.isActive);
        if (filterStatus === "Active" && !isActive) return false;
        if (filterStatus === "Inactive" && isActive) return false;
        if (filterDepartment && e.department !== filterDepartment) return false;
        if (filterRole && e.role !== filterRole) return false;

        // Dashboard Filter: Pending Docs
        if (searchParams.get("filter") === "pending-docs") {
            const docs = e.documents || {};
            const required = ['aadharCard', 'panCard', 'resume', 'offerLetter'];
            const hasPending = required.some(key => {
                const doc = (docs as any)[key];
                return !doc || doc.status !== 'Verified';
            });
            if (!hasPending) return false;
        }

        const name = (e.name || "").toLowerCase();
        const email = (e.email || "").toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || email.includes(search);
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
                        <h2 className="text-base font-bold text-gray-900">Employee Directory</h2>
                        <p className="text-xs text-gray-500">
                            {filtered.length} visible · {(employees || []).length} total
                        </p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-end gap-3 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search employees…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active Only</option>
                            <option value="Inactive">Inactive Only</option>
                        </select>
                        <select
                            value={filterDepartment}
                            onChange={(e) => setFilterDepartment(e.target.value)}
                            className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        >
                            <option value="">All Departments</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        >
                            <option value="">All Roles</option>
                            {Array.from(new Set(employees.map(e => e.role))).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
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
                                onClick={() => { 
                                    setEditingId(null);
                                    setInitialFormData(null);
                                    setShowEditModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                            >
                                <Edit className="w-4 h-4" /> Edit Employee
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
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Link href={`/employees/${emp._id || (emp as any).id}`} prefetch={false} className="block group/item">
                                            <div className="flex items-center gap-3 p-1 -m-1 rounded-lg hover:bg-blue-50/50 transition-all duration-200">
                                                <div className={`w-9 h-9 rounded-full ${getAvatarColor(emp.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover/item:scale-105 transition-transform`}>
                                                    {getInitials(emp.name)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-800 group-hover/item:text-blue-600 transition-colors flex items-center gap-1 whitespace-nowrap">
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
                                    <td className="px-6 py-4 whitespace-nowrap">
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
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {emp.department ? (
                                            <div className="flex items-center gap-1.5">
                                                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm text-gray-700">{emp.department}</span>
                                            </div>
                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${emp.role === 'Admin' ? 'bg-violet-100 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
                                            {emp.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                        {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <IOSSwitch 
                                                checked={emp.status === 'active' || (emp.status === undefined && emp.isActive)} 
                                                onChange={() => toggleActive(emp._id, emp.status, emp.isActive)}
                                                disabled={!canManage}
                                            />
                                            <span className={`text-xs font-bold transition-colors ${ (emp.status === 'active' || (emp.status === undefined && emp.isActive)) ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {(emp.status === 'active' || (emp.status === undefined && emp.isActive)) ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {canManage && (
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedEmployeeForDocs(emp);
                                                        setShowDocsModal(true);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Manage Documents"
                                                >
                                                    <FileWarning className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(emp._id);
                                                        setInitialFormData(emp);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Employee"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleActive(emp._id, emp.status, emp.isActive)}
                                                    title={(emp.status === 'active' || (emp.status === undefined && emp.isActive)) ? "Deactivate" : "Activate"}
                                                    className={`p-1.5 rounded-lg transition-colors ${(emp.status === 'active' || (emp.status === undefined && emp.isActive)) ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                >
                                                    {(emp.status === 'active' || (emp.status === undefined && emp.isActive)) ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
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

            {/* Shared Employee Edit Modal */}
            <EmployeeEditModal 
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                editingId={editingId}
                employees={employees}
                initialData={initialFormData}
                onSuccess={(msg) => {
                    setSuccessMsg(`✅ ${msg}`);
                    fetchEmployees();
                    setTimeout(() => setSuccessMsg(""), 4000);
                }}
            />

            {/* Employee Documents Modal */}
            {showDocsModal && selectedEmployeeForDocs && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <EmployeeDocumentsModal 
                        employee={selectedEmployeeForDocs} 
                        onClose={() => {
                            setShowDocsModal(false);
                            setSelectedEmployeeForDocs(null);
                            fetchEmployees(); // Refresh to get updated doc status
                        }}
                        canManage={canManage}
                    />
                </div>
            )}
        </div>
    );
}

function EmployeeDocumentsModal({ employee, onClose, canManage }: { employee: Employee, onClose: () => void, canManage: boolean }) {
    const [docs, setDocs] = useState(employee.documents || {});
    const [uploading, setUploading] = useState<string | null>(null);
    const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);

    const documentTypes = [
        { id: 'aadharCard', name: 'Aadhar Card', required: true },
        { id: 'panCard', name: 'PAN Card', required: true },
        { id: 'resume', name: 'Resume / CV', required: true },
        { id: 'offerLetter', name: 'Offer Letter', required: true },
        { id: 'certificates', name: 'Educational Certificates', required: false },
    ];

    const handleUpload = async (type: string, file: File) => {
        setUploading(type);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('documentType', type);

            const res = await axios.post(`/api/users/${employee._id}/documents`, formData);
            setDocs(res.data.user.documents);
        } catch (e) {
            console.error("Upload failed", e);
            alert("Failed to upload document. Please try again.");
        } finally {
            setUploading(null);
        }
    };

    const handleStatusUpdate = async (type: string, status: string) => {
        setSubmittingStatus(type);
        try {
            const res = await axios.patch(`/api/users/${employee._id}/documents`, {
                documentType: type,
                status
            });
            setDocs(res.data.user.documents);
        } catch (e) {
            console.error("Status update failed", e);
        } finally {
            setSubmittingStatus(null);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Verified': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Uploaded': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-gray-50 text-gray-500 border-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {employee.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{employee.name}</h3>
                        <p className="text-sm text-gray-500">{employee.role} • {employee.department}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="p-6">
                <div className="overflow-hidden border border-gray-100 rounded-xl shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold">Document Name</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Last Updated</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {documentTypes.map((type) => {
                                const doc = (docs as any)[type.id];
                                const status = doc?.status || 'Pending';
                                
                                return (
                                    <tr key={type.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${status === 'Verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{type.name}</p>
                                                    {type.required && !doc?.url && <p className="text-[10px] text-rose-500 font-bold uppercase">Required</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyles(status)}`}>
                                                {status === 'Pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {doc?.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {doc?.url ? (
                                                    <>
                                                        <a 
                                                            href={doc.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="View Document"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                        {canManage && status === 'Uploaded' && (
                                                            <div className="flex items-center gap-1 ml-2 border-l pl-2 border-gray-100">
                                                                <button
                                                                    onClick={() => handleStatusUpdate(type.id, 'Verified')}
                                                                    disabled={submittingStatus === type.id}
                                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                    title="Verify"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusUpdate(type.id, 'Rejected')}
                                                                    disabled={submittingStatus === type.id}
                                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                    title="Reject"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : null}
                                                
                                                <label className={`cursor-pointer p-1.5 rounded-lg transition-all ${uploading === type.id ? 'bg-gray-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleUpload(type.id, file);
                                                        }}
                                                        disabled={!!uploading}
                                                    />
                                                    {uploading === type.id ? (
                                                        <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                                                    ) : (
                                                        <Upload className="w-4 h-4" />
                                                    )}
                                                </label>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                    <span className="font-bold text-gray-700">Note:</span> Files must be PDF or Images (Max 5MB).
                </p>
                <button 
                    onClick={onClose}
                    className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                >
                    Close
                </button>
            </div>
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
