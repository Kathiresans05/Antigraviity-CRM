"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CheckSquare, Search, Filter, Loader2, Users, Calendar, ArrowRight, ChevronDown, Download, CheckCircle2, X } from "lucide-react";
import axios from "axios";
import Modal from "@/components/Modal";
import moment from "moment";

export default function DailyReportsPage() {
    const { data: session } = useSession();
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchChecklists();
    }, []);

    const fetchChecklists = async () => {
        try {
            const res = await axios.get("/api/daily-checklist");
            setChecklists(res.data.records || []);
        } catch (error) {
            console.error("Failed to fetch checklists", error);
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

    const stats = {
        total: checklists.length,
        completed: checklists.filter((c: any) => c.items.every((i: any) => i.completed)).length,
        pending: checklists.length - checklists.filter((c: any) => c.items.every((i: any) => i.completed)).length,
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-[#f5f7f9]">
                <Loader2 className="w-8 h-8 text-[#0067ff] animate-spin mb-4" />
                <p className="text-slate-500 font-medium tracking-wide">Fetching team records...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f7f9] -m-6 p-6">
            <div className="max-w-[1400px] mx-auto space-y-4">
                {/* Zoho Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-[#0067ff]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Daily Team Reports</h1>
                            <p className="text-[12px] text-slate-500 font-medium">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex gap-8 border-r border-slate-100 pr-8">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Users</p>
                                <p className="text-lg font-bold text-slate-800">{stats.total}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Completed</p>
                                <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-0.5">Pending</p>
                                <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#0067ff] text-white text-xs font-bold rounded-md hover:bg-[#0052cc] transition-colors shadow-sm">
                            <Download className="w-3.5 h-3.5" />
                            Export Data
                        </button>
                    </div>
                </div>

                {/* Zoho Controls */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Find by employee name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all text-[13px]"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-3 py-2 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 text-[13px] font-medium transition-colors">
                            <Filter className="w-4 h-4" />
                            Filters
                            <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex bg-slate-50 p-1 rounded-md border border-slate-200">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'pending', label: 'Processing' },
                            { id: 'completed', label: 'Closed' }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setFilterStatus(btn.id)}
                                className={`px-5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-tight transition-all ${filterStatus === btn.id ? 'bg-white text-[#0067ff] shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Zoho Table Container */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
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
                                                <div className="w-10 h-10 rounded-full bg-[#f0f4ff] text-[#0067ff] flex items-center justify-center font-bold text-sm border border-blue-100 shadow-sm">
                                                    {userName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-[14px] hover:text-[#0067ff] cursor-pointer transition-colors">{userName}</p>
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
                                                        className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-[#0067ff]'}`}
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
                                                className="text-[12px] font-bold text-[#0067ff] hover:underline flex items-center gap-1 ml-auto group-hover:translate-x-1 transition-transform"
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

                    {filteredChecklists.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 bg-slate-50 rounded-full">
                                <Users className="w-12 h-12 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">No data found</h3>
                                <p className="text-sm text-slate-400 max-w-xs mx-auto">No daily reports found matching your criteria. Try adjusting your filters or search.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Zoho footer info */}
                <div className="flex items-center px-4 py-2 text-[11px] text-slate-400 font-medium">
                    <p>Showing {filteredChecklists.length} of {checklists.length} team members</p>
                </div>
            </div>

            {/* Report Review Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Daily Activity Report"
                maxWidth="max-w-2xl"
            >
                {selectedRecord && (
                    <div className="space-y-6">
                        {/* Modal Header Info */}
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white border border-blue-100 flex items-center justify-center text-[#0067ff] font-bold text-lg shadow-sm">
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

                        {/* Progress Tracker */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completion Status</h5>
                                <span className="text-[14px] font-bold text-[#0067ff]">
                                    {Math.round((selectedRecord.items.filter((i: any) => i.completed).length / selectedRecord.items.length) * 100)}%
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                <div
                                    className="h-full bg-[#0067ff] rounded-full transition-all duration-1000"
                                    style={{ width: `${(selectedRecord.items.filter((i: any) => i.completed).length / selectedRecord.items.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Checklist Details */}
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

                        {/* Comments/Summary Placeholder */}
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <h5 className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">Manager's Notes</h5>
                            <p className="text-[13px] text-slate-600 italic">No feedback provided yet. Approving this report marks it as reviewed.</p>
                        </div>

                        {/* Back Button */}
                        <div className="flex items-center pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X className="w-4 h-4" />
                                Back to Reports
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
