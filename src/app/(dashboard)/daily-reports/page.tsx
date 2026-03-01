"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    CheckSquare, Search, Filter, Loader2, Users, Calendar,
    ArrowRight, ChevronDown, Download, CheckCircle2, X,
    Clock, Coffee, Hourglass, ExternalLink, FileText
} from "lucide-react";
import axios from "axios";
import Modal from "@/components/Modal";
import moment from "moment";
import clsx from "clsx";

export default function DailyReportsPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<"checklists" | "summaries">("checklists");
    const [checklists, setChecklists] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (activeTab === "checklists") {
            fetchChecklists();
        } else {
            fetchAttendance();
        }
    }, [activeTab]);

    const fetchChecklists = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/daily-checklist");
            setChecklists(res.data.records || []);
        } catch (error) {
            console.error("Failed to fetch checklists", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/attendance");
            // Filter only for today's records or let manager see recent ones
            // For managers, we want to see the logout summaries
            setAttendance(res.data.records || []);
        } catch (error) {
            console.error("Failed to fetch attendance records", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredChecklists = checklists.filter((checklist: any) => {
        const userName = checklist.userId?.name || checklist.userId?.email || "";
        const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase());
        const count = checklist.items.filter((i: any) => i.completed).length;
        const pct = Math.round((count / checklist.items.length) * 100);
        if (filterStatus === "completed") return pct === 100 && matchesSearch;
        if (filterStatus === "pending") return pct < 100 && matchesSearch;
        return matchesSearch;
    });

    const filteredAttendance = attendance.filter((record: any) => {
        const userName = record.userId?.name || record.userId?.email || "";
        const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase());
        // For work summaries, we mostly care about those who have clocked out or have a summary
        return matchesSearch;
    });

    const stats = {
        total: checklists.length,
        completed: checklists.filter((c: any) => c.items.every((i: any) => i.completed)).length,
        pending: checklists.length - checklists.filter((c: any) => c.items.every((i: any) => i.completed)).length,
    };

    if (loading && (activeTab === "checklists" ? checklists.length === 0 : attendance.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-[#f5f7f9]">
                <Loader2 className="w-8 h-8 text-[#0f172a] animate-spin mb-4" />
                <p className="text-slate-500 font-medium tracking-wide">Fetching team records...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f7f9] -m-6 p-6">
            <div className="max-w-[1400px] mx-auto space-y-4">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-[#0f172a]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Team Performance Reports</h1>
                            <p className="text-[12px] text-slate-500 font-medium">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex gap-8 border-r border-slate-100 pr-8">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Team Size</p>
                                <p className="text-lg font-bold text-slate-800">{stats.total}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Checklist Pct</p>
                                <p className="text-lg font-bold text-emerald-600">
                                    {checklists.length > 0 ? Math.round((stats.completed / checklists.length) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white text-xs font-bold rounded-md hover:bg-[#1e293b] transition-colors shadow-sm">
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200 w-fit shadow-sm">
                    <button
                        onClick={() => setActiveTab("checklists")}
                        className={clsx(
                            "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === "checklists" ? "bg-[#0f172a] text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        Activity Checklists
                    </button>
                    <button
                        onClick={() => setActiveTab("summaries")}
                        className={clsx(
                            "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === "summaries" ? "bg-[#0f172a] text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        Work Summaries
                    </button>
                </div>

                {/* Controls */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Find by employee name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-[#0f172a]/20 focus:border-[#0f172a] focus:bg-white transition-all text-[13px]"
                            />
                        </div>
                    </div>

                    {activeTab === "checklists" && (
                        <div className="flex bg-slate-50 p-1 rounded-md border border-slate-200">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'pending', label: 'Processing' },
                                { id: 'completed', label: 'Closed' }
                            ].map((btn) => (
                                <button
                                    key={btn.id}
                                    onClick={() => setFilterStatus(btn.id)}
                                    className={`px-5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-tight transition-all ${filterStatus === btn.id ? 'bg-white text-[#0f172a] shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                    {activeTab === "checklists" ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/4">Employee Details</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Progress</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Checklist Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredChecklists.map((checklist: any) => {
                                    const count = checklist.items.filter((i: any) => i.completed).length;
                                    const total = checklist.items.length;
                                    const pct = Math.round((count / total) * 100);
                                    const userName = checklist.userId?.name || checklist.userId?.email || "Unknown";

                                    return (
                                        <tr key={checklist._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 shadow-sm">
                                                        {userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-[14px] hover:text-[#0f172a] cursor-pointer transition-colors">{userName}</p>
                                                        <p className="text-[11px] text-slate-500 font-medium">Reporting to you</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-2 max-w-[200px]">
                                                    <div className="flex justify-between text-[11px] font-bold">
                                                        <span className={pct === 100 ? 'text-emerald-600' : 'text-slate-500'}>{pct}% Complete</span>
                                                        <span className="text-slate-400">{count}/{total}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-[#0f172a]'}`}
                                                            style={{ width: `${pct}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[300px]">
                                                    {checklist.items.slice(0, 4).map((item: any) => (
                                                        <div
                                                            key={item.id}
                                                            className={`w-2 h-2 rounded-full transition-all ${item.completed ? 'bg-emerald-400' : 'bg-slate-200'}`}
                                                            title={item.title}
                                                        ></div>
                                                    ))}
                                                    {total > 4 && <span className="text-[10px] text-slate-400 font-bold ml-1">+{total - 4}</span>}
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Items Tracked</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRecord(checklist);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="text-[12px] font-bold text-[#0f172a] hover:underline flex items-center gap-1 ml-auto group-hover:translate-x-1 transition-transform"
                                                >
                                                    Review Report
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="grid grid-cols-1 divide-y divide-slate-100">
                            {filteredAttendance.length > 0 ? filteredAttendance.map((record: any) => (
                                <div key={record._id} className="p-6 hover:bg-slate-50/50 transition-all group">
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        {/* Left: User Info */}
                                        <div className="lg:w-1/4 flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg border border-slate-200 shrink-0">
                                                {(record.userId?.name || "?").charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 group-hover:text-[#0f172a] transition-colors">{record.userId?.name || "Unknown User"}</h4>
                                                <p className="text-[11px] font-medium text-slate-500 mt-0.5">{record.userId?.department || "General"}</p>
                                                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[10px] font-bold text-slate-600">{moment(record.date).format("MMM DD, YYYY")}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Center: Punch Stats */}
                                        <div className="lg:w-1/3 grid grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Punch In</span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-700">
                                                    {record.clockInTime ? moment(record.clockInTime).format("hh:mm A") : "--:--"}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Punch Out</span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-700">
                                                    {record.clockOutTime ? moment(record.clockOutTime).format("hh:mm A") : "Active"}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Hourglass className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Net Hours</span>
                                                </div>
                                                <p className="text-sm font-bold text-[#0f172a]">
                                                    {record.totalHours ? `${record.totalHours}h` : "--"}
                                                </p>
                                            </div>
                                            <div className="col-span-3 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <Coffee className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Breaks Taken:</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">{Math.round(record.breakMinutes || 0)} mins</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Work Summary */}
                                        <div className="flex-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100 relative group/summary">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Daily Summary</span>
                                                </div>
                                                {record.workStatusFile && (
                                                    <a
                                                        href={record.workStatusFile}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                                                    >
                                                        <Download className="w-3 h-3" /> Attachment
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-[13px] text-slate-600 font-medium line-clamp-3 leading-relaxed">
                                                {record.workStatusUpload || <span className="text-slate-400 italic font-normal">No summary provided for this session yet.</span>}
                                            </p>
                                            {record.workStatusUpload && record.workStatusUpload.length > 150 && (
                                                <button className="mt-2 text-[11px] font-bold text-slate-400 hover:text-[#0f172a] transition-colors">Read More</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-full">
                                        <FileText className="w-12 h-12 text-slate-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">No summaries found</h3>
                                        <p className="text-sm text-slate-400 max-w-xs mx-auto">No work summaries have been logged by your team yet.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(activeTab === "checklists" ? filteredChecklists.length === 0 : filteredAttendance.length === 0) && (
                        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 bg-slate-50 rounded-full">
                                <Users className="w-12 h-12 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">No data found</h3>
                                <p className="text-sm text-slate-400 max-w-xs mx-auto">Try adjusting your filters or search.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer/Pagination */}
                <div className="flex items-center px-4 py-2 text-[11px] text-slate-400 font-medium">
                    <p>
                        Showing {activeTab === "checklists" ? filteredChecklists.length : filteredAttendance.length} records
                    </p>
                </div>
            </div>

            {/* Checklist View Modal */}
            <Modal
                isOpen={isModalOpen && activeTab === "checklists"}
                onClose={() => setIsModalOpen(false)}
                title="Daily Activity Report"
                maxWidth="max-w-2xl"
            >
                {selectedRecord && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white border border-[#0f172a]/20 flex items-center justify-center text-[#0f172a] font-bold text-lg shadow-sm">
                                    {(selectedRecord.userId?.name || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-base">{selectedRecord.userId?.name || "Unknown User"}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{selectedRecord.userId?.email}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Report Date</p>
                                <p className="text-sm font-bold text-slate-700">{moment(selectedRecord.date).format("MMMM DD, YYYY")}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completion Status</h5>
                                <span className="text-[14px] font-bold text-[#0f172a]">
                                    {Math.round((selectedRecord.items.filter((i: any) => i.completed).length / selectedRecord.items.length) * 100)}%
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                <div
                                    className="h-full bg-[#0f172a] rounded-full transition-all duration-1000"
                                    style={{ width: `${(selectedRecord.items.filter((i: any) => i.completed).length / selectedRecord.items.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Activity Checklist</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selectedRecord.items.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${item.completed ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}
                                    >
                                        {item.completed ? (
                                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0"></div>
                                        )}
                                        <span className={`text-[13px] font-medium ${item.completed ? 'text-emerald-700' : 'text-slate-600'}`}>
                                            {item.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X className="w-4 h-4" />
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
