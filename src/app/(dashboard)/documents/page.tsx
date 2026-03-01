"use client";

import { useState, useEffect, useRef } from "react";
import {
    FileText, Folder, HardDrive, Upload,
    Plus, Search, Filter, Download,
    MoreHorizontal, Share2, Trash2, Clock,
    File, Shield, Briefcase, DollarSign,
    X, AlertCircle
} from "lucide-react";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import axios from "axios";
import toast from "react-hot-toast";

// ─── Utility ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number, decimals = 1) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ─── Components ─────────────────────────────────────────────────────────────

function DocumentStatCard({ title, value, subtitle, icon: Icon, color }: any) {
    return (
        <div className="bg-white rounded-[16px] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4">
                <div className={clsx("p-3 rounded-xl", color)}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-[24px] font-bold text-gray-900 tracking-tight leading-none mb-1">{value}</h3>
                    <p className="text-sm font-semibold text-gray-500">{title}</p>
                    <p className="text-[11px] font-medium text-gray-400 mt-0.5">{subtitle}</p>
                </div>
            </div>
        </div>
    );
}

function CategoryFolder({ name, count, size, color, icon: Icon, onClick }: any) {
    return (
        <div onClick={onClick} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-[#1F6F8B]/30 hover:shadow-md transition-all duration-300 group cursor-pointer">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-3 rounded-xl group-hover:scale-110 transition-transform", color)}>
                    <Icon className="w-6 h-6" />
                </div>
                <button className="p-1.5 text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>
            <h4 className="text-sm font-bold text-gray-900 mb-1">{name}</h4>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-400">
                <span>{count} Files</span>
                <span>•</span>
                <span>{formatBytes(size)}</span>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DocumentsPage() {
    const { data: session } = useSession();
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<any[]>([]);

    // Upload Modal State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadCategory, setUploadCategory] = useState("Employee Records");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const CACHE_CATEGORIES = [
        { name: "Employee Records", color: "bg-blue-50 text-blue-600", icon: Briefcase },
        { name: "Company Policies", color: "bg-purple-50 text-purple-600", icon: Shield },
        { name: "Legal Contracts", color: "bg-amber-50 text-amber-600", icon: FileText },
        { name: "Payroll & Finance", color: "bg-emerald-50 text-emerald-600", icon: DollarSign },
    ];

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/api/documents");
            setDocuments(res.data);
        } catch (error) {
            console.error("Failed to fetch documents", error);
            toast.error("Failed to fetch documents");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleUploadClick = () => {
        setIsUploadOpen(true);
        setSelectedFile(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return toast.error("Please select a file to upload.");

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("category", uploadCategory);

            await axios.post("/api/documents", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Document uploaded successfully!");
            setIsUploadOpen(false);
            fetchDocuments();
        } catch (error: any) {
            console.error("Upload error", error);
            toast.error(error.response?.data?.error || "Failed to upload document");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirm = window.confirm("Are you sure you want to delete this document? This action cannot be undone.");
        if (!confirm) return;

        try {
            await axios.delete(`/api/documents/${id}`);
            toast.success("Document deleted");
            setDocuments(prev => prev.filter(d => d._id !== id));
        } catch (error: any) {
            console.error("Delete error", error);
            toast.error(error.response?.data?.error || "Failed to delete document");
        }
    };

    const filteredDocs = documents.filter(doc => {
        const query = searchTerm.toLowerCase();
        const docName = doc.name.toLowerCase();
        const docCategory = doc.category.toLowerCase();

        // Treat "Onboarding - " documents as "Employee Records" for search
        const isEmployeeRecordSearch = "employee records".includes(query);
        const isOnboardingDoc = docCategory.startsWith("onboarding -");

        return docName.includes(query) ||
            docCategory.includes(query) ||
            (isEmployeeRecordSearch && isOnboardingDoc);
    });

    // Dynamic Statistics
    const totalStorageBytes = documents.reduce((sum, doc) => sum + doc.size, 0);
    const recentUploads = documents.filter(d => {
        const diffDays = (new Date().getTime() - new Date(d.createdAt).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
    }).length;

    // Enhance categories with dynamic counts
    const computedCategories = CACHE_CATEGORIES.map(cat => {
        const catDocs = documents.filter(d => {
            if (cat.name === "Employee Records") {
                return d.category === "Employee Records" || d.category.startsWith("Onboarding -");
            }
            return d.category === cat.name;
        });
        return {
            ...cat,
            count: catDocs.length,
            size: catDocs.reduce((sum, d) => sum + d.size, 0)
        };
    });

    if (loading && documents.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">Document Center</h2>
                    <p className="text-sm font-medium text-gray-500">Secure storage and management for all company files</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                        <Folder className="w-4 h-4" /> New Folder
                    </button>
                    <button onClick={handleUploadClick} className="flex items-center gap-2 px-5 py-2.5 bg-[#1F6F8B] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md">
                        <Upload className="w-4 h-4" /> Upload Document
                    </button>
                </div>
            </div>

            {/* Storage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DocumentStatCard
                    title="Total Documents"
                    value={documents.length}
                    subtitle="Files across all categories"
                    icon={FileText}
                    color="bg-blue-50 text-blue-600"
                />
                <DocumentStatCard
                    title="Storage Used"
                    value={formatBytes(totalStorageBytes)}
                    subtitle="of 10 GB limit"
                    icon={HardDrive}
                    color="bg-purple-50 text-purple-600"
                />
                <DocumentStatCard
                    title="Recent Uploads"
                    value={recentUploads}
                    subtitle="Added this week"
                    icon={Clock}
                    color="bg-amber-50 text-amber-600"
                />
                <DocumentStatCard
                    title="Shared Files"
                    value={documents.length}
                    subtitle="Collaborative access"
                    icon={Share2}
                    color="bg-emerald-50 text-emerald-600"
                />
            </div>

            {/* Folder Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Categories</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {computedCategories.map((cat, idx) => (
                        <CategoryFolder key={idx} {...cat} onClick={() => {
                            setSearchTerm(cat.name);
                            tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }} />
                    ))}
                </div>
            </div>

            {/* Document Table */}
            <div ref={tableRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-6">
                <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Recent Documents</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                            />
                        </div>
                        <button className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                            <Filter className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">File Name</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Size</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Upload Date</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Owner</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredDocs.length > 0 ? filteredDocs.map((doc, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                <File className="w-4 h-4" />
                                            </div>
                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer limit-text max-w-[200px] truncate">{doc.name}</a>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md whitespace-nowrap">
                                            {doc.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-xs text-gray-500 whitespace-nowrap">
                                        {formatBytes(doc.size)}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-xs text-gray-500 whitespace-nowrap">
                                        {new Date(doc.createdAt).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-gray-700 whitespace-nowrap">{doc.owner}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={doc.fileUrl} download={doc.name} className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-blue-600 border border-transparent hover:border-gray-200">
                                                <Download className="w-4 h-4" />
                                            </a>
                                            <button className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-emerald-600 border border-transparent hover:border-gray-200">
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(doc._id)} className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-rose-600 border border-transparent hover:border-gray-200">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="inline-flex flex-col items-center justify-center text-gray-400">
                                            <FileText className="w-12 h-12 mb-4 opacity-50" />
                                            <p className="text-sm font-semibold">No documents found.</p>
                                            <p className="text-xs mt-1">Upload a file to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F6F8B]/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Upload Document</h3>
                            <button
                                onClick={() => setIsUploadOpen(false)}
                                className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Category</label>
                                <select
                                    value={uploadCategory}
                                    onChange={(e) => setUploadCategory(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                >
                                    {CACHE_CATEGORIES.map(cat => (
                                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                                    ))}
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upload File</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={clsx(
                                        "w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center",
                                        selectedFile ? "border-emerald-500 bg-emerald-50/50" : "border-slate-300 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400"
                                    )}
                                >
                                    {selectedFile ? (
                                        <>
                                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-emerald-700 truncate max-w-[250px]">{selectedFile.name}</p>
                                            <p className="text-xs font-semibold text-emerald-600/70 mt-1">{formatBytes(selectedFile.size)}</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mb-3">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700">Click to browse or drag and drop</p>
                                            <p className="text-xs font-medium text-slate-500 mt-1">PDF, DOCX, XLSX, images (max 10MB)</p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadOpen(false)}
                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedFile || uploading}
                                    className="flex-1 py-3 bg-[#1F6F8B] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        'Upload Document'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
