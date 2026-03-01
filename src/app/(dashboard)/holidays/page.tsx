"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
    Calendar, Plus, Trash2, Gift, Flag, Tent,
    Search, Filter, ChevronRight, Loader2
} from "lucide-react";
import moment from "moment";
import clsx from "clsx";
import { useSession } from "next-auth/react";

export default function HolidaysPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const isAdmin = ["Admin", "HR", "HR Manager"].includes(userRole);

    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Form state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDate, setNewDate] = useState("");
    const [newType, setNewType] = useState("Company Specific");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/api/holidays");
            setHolidays(res.data);
        } catch (err) {
            toast.error("Failed to load holidays");
        } finally {
            setLoading(false);
        }
    };

    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await axios.post("/api/holidays", {
                name: newName,
                date: newDate,
                type: newType
            });
            toast.success("Holiday added successfully");
            setNewName("");
            setNewDate("");
            setShowAddModal(false);
            fetchHolidays();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to add holiday");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredHolidays = holidays.filter(h =>
        h.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const upcomingHolidays = filteredHolidays.filter(h => moment(h.date).isSameOrAfter(moment(), 'day'));
    const pastHolidays = filteredHolidays.filter(h => moment(h.date).isBefore(moment(), 'day'));

    return (
        <div className="space-y-6 pb-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Company Holidays</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage National, Festival, and Company Specific holidays</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add Holiday
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search holidays..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="mt-4 text-sm font-medium text-gray-500">Loading holiday calendar...</p>
                </div>
            ) : upcomingHolidays.length === 0 && pastHolidays.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="p-4 bg-blue-50 rounded-full mb-4">
                        <Calendar className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-gray-900 font-bold">No Holidays Found</p>
                    <p className="text-sm text-gray-500 mt-1">Start by adding your first company holiday.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upcoming Holidays */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Upcoming Milestones
                        </h2>
                        <div className="space-y-3">
                            {upcomingHolidays.map((holiday) => (
                                <HolidayCard key={holiday._id} holiday={holiday} />
                            ))}
                            {upcomingHolidays.length === 0 && (
                                <p className="text-xs text-gray-400 italic p-4 bg-gray-50 rounded-xl">No upcoming holidays scheduled.</p>
                            )}
                        </div>
                    </div>

                    {/* Past Holidays */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                            Past Holidays
                        </h2>
                        <div className="space-y-3 opacity-60 grayscale-[0.5]">
                            {pastHolidays.map((holiday) => (
                                <HolidayCard key={holiday._id} holiday={holiday} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" />
                                New Holiday
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                        </div>
                        <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Holiday Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Independence Day"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Type</label>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option>National</option>
                                        <option>Festival</option>
                                        <option>Company Specific</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                disabled={submitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 mt-4 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Holiday"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function HolidayCard({ holiday }: { holiday: any }) {
    const isUpcoming = moment(holiday.date).isSameOrAfter(moment(), 'day');

    return (
        <div className={clsx(
            "group bg-white p-5 rounded-2xl border transition-all hover:shadow-lg flex items-center justify-between",
            isUpcoming ? "border-blue-50 hover:border-blue-200" : "border-gray-100 bg-gray-50/50"
        )}>
            <div className="flex items-center gap-4">
                <div className={clsx(
                    "p-3 rounded-xl",
                    holiday.type === 'National' ? "bg-amber-50 text-amber-600" :
                        holiday.type === 'Festival' ? "bg-rose-50 text-rose-600" :
                            "bg-blue-50 text-blue-600"
                )}>
                    {holiday.type === 'National' ? <Flag className="w-5 h-5" /> :
                        holiday.type === 'Festival' ? <Tent className="w-5 h-5" /> :
                            <Gift className="w-5 h-5" />}
                </div>
                <div>
                    <h4 className="font-bold text-gray-900">{holiday.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs font-semibold text-gray-500">{moment(holiday.date).format('MMMM DD, YYYY')}</p>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <p className="text-[10px] font-bold uppercase tracking-tight text-gray-400">{holiday.type}</p>
                    </div>
                </div>
            </div>

            {isUpcoming && (
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {moment(holiday.date).fromNow()}
                </div>
            )}
        </div>
    );
}
