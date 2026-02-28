"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Search, Plus, Users, Mail, Phone, Briefcase,
    CheckCircle, XCircle, Eye, EyeOff, X, UserPlus, ExternalLink,
    Filter, ChevronDown, MoreHorizontal, Download, LayoutGrid, List
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Lead {
    _id: string;
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    phone: string;
    leadSource: string;
    leadStatus: string;
    leadOwner: string;
    industry?: string;
}

const LEAD_SOURCES = ["Advertisement", "Cold Call", "Employee Referral", "External Referral", "Online Store", "Partner", "Public Relations", "Sales Mail", "Seminar Partner", "Internal Seminar", "Trade Show", "Web Download", "Web Research", "Chat"];
const LEAD_STATUSES = ["Attempted to Contact", "Contact in Future", "Contacted", "Junk Lead", "Lost Lead", "Not Contacted", "Pre-Qualified", "Not Qualified"];

export default function LeadsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const canManage = session?.user && ['Admin', 'Manager', 'HR', 'HR Manager', 'Sales'].includes((session?.user as any).role);

    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [viewType, setViewType] = useState<'list' | 'kanban'>('list');

    const [form, setForm] = useState({
        firstName: "", lastName: "", company: "", email: "",
        phone: "", leadSource: "Web Research", leadStatus: "Not Contacted",
        industry: ""
    });

    // Mock data for Zoho feel until real API is connected
    const fetchLeads = async () => {
        setLoading(true);
        try {
            // Simulating a fetching delay
            setTimeout(() => {
                const mockLeads: Lead[] = [
                    { _id: "1", firstName: "Robert", lastName: "Smith", company: "Zylker", email: "robert@zylker.com", phone: "555-0101", leadSource: "Web Research", leadStatus: "Contacted", leadOwner: "Admin User" },
                    { _id: "2", firstName: "Sarah", lastName: "Jones", company: "Atlas Corp", email: "sarah@atlas.com", phone: "555-0102", leadSource: "Cold Call", leadStatus: "Attempted to Contact", leadOwner: "Admin User" },
                    { _id: "3", firstName: "Michael", lastName: "Brown", company: "Global Tech", email: "michael@global.com", phone: "555-0103", leadSource: "Advertisement", leadStatus: "Pre-Qualified", leadOwner: "Admin User" },
                    { _id: "4", firstName: "Emily", lastName: "Davis", company: "Innovative Solutions", email: "emily@innovative.com", phone: "555-0104", leadSource: "Employee Referral", leadStatus: "Lost Lead", leadOwner: "Admin User" },
                    { _id: "5", firstName: "James", lastName: "Wilson", company: "Wilson & Co", email: "james@wilson.com", phone: "555-0105", leadSource: "Partner", leadStatus: "Not Contacted", leadOwner: "Admin User" },
                ];
                setLeads(mockLeads);
                setLoading(false);
            }, 800);
        } catch (e) {
            console.error("Failed to fetch leads", e);
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            // Mock submission
            const newLead: Lead = {
                ...form,
                _id: Math.random().toString(36).substr(2, 9),
                leadOwner: session?.user?.name || "Unassigned"
            };
            setLeads(prev => [newLead, ...prev]);
            setSuccessMsg(`✅ Lead for ${form.firstName} ${form.lastName} added successfully!`);
            setForm({ firstName: "", lastName: "", company: "", email: "", phone: "", leadSource: "Web Research", leadStatus: "Not Contacted", industry: "" });
            setShowModal(false);
            setTimeout(() => setSuccessMsg(""), 4000);
        } catch (err: any) {
            setError("Failed to add lead.");
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = leads.filter(l =>
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Contacted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Attempted to Contact': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'Pre-Qualified': return 'bg-violet-50 text-violet-700 border-violet-100';
            case 'Lost Lead': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'Junk Lead': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-orange-50 text-orange-700 border-orange-100';
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] -m-4 bg-[#f3f4f7]">
            {/* Zoho Top Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between sticky top-0 z-10 h-14">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 cursor-pointer group">
                        <h1 className="text-lg font-semibold text-gray-800">All Leads</h1>
                        <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="h-6 w-px bg-gray-200 mx-2" />
                    <div className="flex bg-gray-100 p-1 rounded-md">
                        <button
                            onClick={() => setViewType('list')}
                            className={`p-1 rounded ${viewType === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewType('kanban')}
                            className={`p-1 rounded ${viewType === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search Leads..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-1.5 bg-gray-50 border border-transparent rounded-md text-sm w-64 focus:bg-white focus:border-blue-400 focus:outline-none transition-all"
                        />
                    </div>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors border border-transparent hover:border-gray-200">
                        <Filter className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors border border-transparent hover:border-gray-200">
                        <Download className="w-4 h-4" />
                    </button>
                    <div className="h-6 w-px bg-gray-200 mx-1" />
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Create Lead
                    </button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
                {/* Success Message */}
                {successMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-md text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle className="w-4 h-4" /> {successMsg}
                    </div>
                )}

                {/* Zoho Table Container */}
                <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2.5 font-semibold text-gray-600 w-10">
                                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    </th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-600">Lead Name</th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-600">Company</th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-600">Email</th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-600">Phone</th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-600">Lead Source</th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-600">Lead Status</th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-600">Lead Owner</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={8} className="px-4 py-20 text-center text-gray-400">Loading Leads...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-20 text-center text-gray-400">No leads found.</td></tr>
                                ) : filtered.map((lead) => (
                                    <tr key={lead._id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                                        <td className="px-4 py-3">
                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/leads/${lead._id}`} className="font-medium text-blue-600 hover:underline">
                                                {lead.firstName} {lead.lastName}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{lead.company}</td>
                                        <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                                        <td className="px-4 py-3 text-gray-600">{lead.phone}</td>
                                        <td className="px-4 py-3 text-gray-600">{lead.leadSource}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusColor(lead.leadStatus)}`}>
                                                {lead.leadStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{lead.leadOwner}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Zoho footer info */}
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                        <div>Total Leads: {leads.length}</div>
                        <div className="flex items-center gap-4">
                            <span>Records per page: 10</span>
                            <div className="flex items-center gap-2">
                                <button className="p-1 hover:text-blue-600 disabled:opacity-30" disabled>Previous</button>
                                <span>1 - {filtered.length} of {filtered.length}</span>
                                <button className="p-1 hover:text-blue-600 disabled:opacity-30" disabled>Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Lead Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">Create Lead</h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="leadForm" onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-2 rounded-md text-sm mb-4">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1">Lead Information</h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">First Name <span className="text-red-500">*</span></label>
                                            <input name="firstName" required value={form.firstName} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">Last Name <span className="text-red-500">*</span></label>
                                            <input name="lastName" required value={form.lastName} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">Company <span className="text-red-500">*</span></label>
                                            <input name="company" required value={form.company} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">Email</label>
                                            <input name="email" type="email" value={form.email} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">Phone</label>
                                            <input name="phone" value={form.phone} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none transition-colors" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">Lead Source</label>
                                            <select name="leadSource" value={form.leadSource} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none transition-colors bg-white">
                                                {LEAD_SOURCES.map(source => <option key={source} value={source}>{source}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">Lead Status</label>
                                            <select name="leadStatus" value={form.leadStatus} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none transition-colors bg-white">
                                                {LEAD_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">Industry</label>
                                            <input name="industry" value={form.industry} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:underline">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="leadForm"
                                disabled={submitting}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting ? "Saving..." : "Save"}
                            </button>
                            <button
                                type="button"
                                className="px-6 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md text-sm font-semibold transition-colors shadow-sm"
                            >
                                Save and New
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
