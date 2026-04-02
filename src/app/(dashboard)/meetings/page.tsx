"use client";

import { useState } from "react";
import {
    Calendar, Clock, Users, Plus, Search, X,
    MoreVertical, Video, MapPin, AlignLeft, CheckCircle2, Link
} from "lucide-react";
import clsx from "clsx";
import MiniCalendar from "@/frontend/components/MiniCalendar";

const mockMeetings = [
    {
        id: 1,
        title: "Weekly Sprint Planning",
        date: "Today, 10:00 AM - 11:30 AM",
        type: "Online",
        link: "meet.google.com/abc-defg-hij",
        location: "",
        organizer: "Alex TL",
        participants: ["S", "M", "J", "+2"],
        status: "Upcoming",
        notes: "Discuss tasks for Week 42 and potential blockers.",
    },
    {
        id: 2,
        title: "Q4 Performance Review Sync",
        date: "Tomorrow, 2:00 PM - 3:00 PM",
        type: "Online",
        link: "zoom.us/j/123456789",
        location: "",
        organizer: "Alex TL",
        participants: ["R"],
        status: "Upcoming",
        notes: "1-on-1 review regarding last quarter's deliverables.",
    },
    {
        id: 3,
        title: "Design System Architecture",
        date: "Oct 22, 11:00 AM - 12:00 PM",
        type: "In Person",
        link: "",
        location: "Conference Room A",
        organizer: "Alex TL",
        participants: ["D", "M"],
        status: "Completed",
        notes: "Finalized color tokens and typography scale.",
    }
];

const emptyForm = {
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    type: "Online" as "Online" | "In Person",
    link: "",
    location: "",
    participants: "",
    notes: "",
};

export default function MeetingsPage() {
    const [meetings, setMeetings] = useState(mockMeetings);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("Upcoming");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const filteredMeetings = meetings.filter(m =>
        (filter === "All" || m.status === filter) &&
        m.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.date || !form.startTime) return;
        setSaving(true);

        // Format date label
        const today = new Date();
        const selectedDate = new Date(form.date);
        const todayStr = today.toDateString();
        const tomorrowStr = new Date(today.getTime() + 86400000).toDateString();
        let dateLabel = selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (selectedDate.toDateString() === todayStr) dateLabel = "Today";
        else if (selectedDate.toDateString() === tomorrowStr) dateLabel = "Tomorrow";

        const timeLabel = `${form.startTime}${form.endTime ? ` - ${form.endTime}` : ""}`;
        const initials = form.participants
            .split(",")
            .map(p => p.trim().charAt(0).toUpperCase())
            .filter(Boolean);

        const newMeeting = {
            id: Date.now(),
            title: form.title,
            date: `${dateLabel}, ${timeLabel}`,
            type: form.type,
            link: form.link,
            location: form.location,
            organizer: "You",
            participants: initials.length ? initials : ["Y"],
            status: "Upcoming",
            notes: form.notes,
        };

        await new Promise(r => setTimeout(r, 400)); // simulate save
        setMeetings(prev => [newMeeting, ...prev]);
        setForm(emptyForm);
        setShowModal(false);
        setSaving(false);
        setFilter("Upcoming");
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meetings</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Schedule, organize, and review your team meetings.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1F6F8B] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#1e293b] transition-all"
                    >
                        <Plus className="w-4 h-4" /> Schedule Meeting
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200/60">
                        {['Upcoming', 'Completed', 'All'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-md text-[13px] font-bold transition-all",
                                    filter === tab ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search meetings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium"
                    />
                </div>
            </div>

            {/* Meetings List + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main List */}
                <div className="lg:col-span-2 space-y-4">
                    {filteredMeetings.length === 0 ? (
                        <div className="bg-white p-12 rounded-xl border border-slate-200/60 flex flex-col items-center justify-center text-center">
                            <Calendar className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-800 mb-1">No Meetings Found</h3>
                            <p className="text-sm text-slate-500">You don&apos;t have any {filter.toLowerCase()} meetings.</p>
                        </div>
                    ) : (
                        filteredMeetings.map(meeting => (
                            <div key={meeting.id} className="bg-white rounded-xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all group overflow-hidden flex flex-col sm:flex-row">
                                <div className="bg-slate-50 sm:w-48 p-5 border-b sm:border-b-0 sm:border-r border-slate-100 flex flex-col justify-center shrink-0">
                                    <div className="flex items-center gap-1.5 text-blue-600 mb-2">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-[11px] font-bold uppercase tracking-wider">{meeting.status}</span>
                                    </div>
                                    <h4 className="text-[15px] font-bold text-slate-900 leading-snug">{meeting.date.split(',')[0]}</h4>
                                    <p className="text-[13px] font-semibold text-slate-500 mt-1">{meeting.date.split(',')[1]?.trim() || meeting.date}</p>
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{meeting.title}</h3>
                                            <button className="text-slate-400 hover:text-slate-700 hover:bg-slate-50 p-1.5 rounded-md transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-4 mb-4">
                                            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                                                {meeting.type === 'Online' ? <Video className="w-3.5 h-3.5 text-blue-500" /> : <MapPin className="w-3.5 h-3.5 text-rose-500" />}
                                                {meeting.type === 'Online' ? 'Video Conference' : 'In Person'}
                                            </span>
                                            {meeting.type === 'Online' && meeting.link && (
                                                <a href={`https://${meeting.link}`} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
                                                    Join Link <CheckCircle2 className="w-3 h-3" />
                                                </a>
                                            )}
                                            {meeting.type === 'In Person' && meeting.location && (
                                                <span className="text-[12px] font-semibold text-slate-500">{meeting.location}</span>
                                            )}
                                        </div>
                                        {meeting.notes && (
                                            <div className="bg-slate-50 rounded-lg p-3 text-[13px] text-slate-600 flex gap-2.5 items-start">
                                                <AlignLeft className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                <p className="leading-relaxed font-medium">{meeting.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Organizer:</span>
                                            <span className="text-[12px] font-bold text-slate-700">{meeting.organizer}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" /> Team
                                            </span>
                                            <div className="flex -space-x-2">
                                                {meeting.participants.map((m, i) => (
                                                    <div key={i} className={clsx(
                                                        "w-7 h-7 rounded-full text-[10px] font-bold border-2 border-white flex items-center justify-center shadow-sm z-10",
                                                        m.startsWith('+') ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-700"
                                                    )}>{m}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Agenda</h3>
                            <button className="text-[12px] font-bold text-blue-600 hover:text-blue-700">View Month</button>
                        </div>
                        <MiniCalendar
                            meetingDates={meetings.map(m => {
                                const today = new Date();
                                if (m.date.startsWith("Today")) return today.toISOString();
                                if (m.date.startsWith("Tomorrow")) {
                                    const tom = new Date(today);
                                    tom.setDate(today.getDate() + 1);
                                    return tom.toISOString();
                                }
                                try {
                                    const datePart = m.date.split(",")[0].trim();
                                    const parsed = new Date(datePart);
                                    if (!isNaN(parsed.getTime())) return parsed.toISOString();
                                } catch { }
                                return null;
                            }).filter((d): d is string => d !== null && !isNaN(new Date(d).getTime()))}
                        />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5">
                        <h3 className="font-bold text-slate-900 mb-4">Meeting Action Items</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                                <div>
                                    <p className="text-[13px] font-bold text-slate-700">Send notes for Design Sync</p>
                                    <span className="text-[11px] font-semibold text-rose-500">Overdue by 1 day</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                                <div>
                                    <p className="text-[13px] font-bold text-slate-700">Prepare slide deck for Q4 Review</p>
                                    <span className="text-[11px] font-semibold text-slate-500">Due Tomorrow</span>
                                </div>
                            </div>
                            <button className="w-full mt-2 py-2 border border-dashed border-slate-300 rounded-lg text-[12px] font-bold text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
                                <Plus className="w-3.5 h-3.5" /> Add Action Item
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── SCHEDULE MEETING MODAL ─────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#1F6F8B] to-[#2289a8]">
                            <div className="flex items-center gap-2 text-white">
                                <Calendar className="w-5 h-5" />
                                <h2 className="text-base font-bold">Schedule Meeting</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meeting Title *</label>
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Weekly Sprint Planning"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                />
                            </div>

                            {/* Date + Times */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date *</label>
                                    <input
                                        name="date"
                                        type="date"
                                        value={form.date}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start *</label>
                                    <input
                                        name="startTime"
                                        type="time"
                                        value={form.startTime}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End</label>
                                    <input
                                        name="endTime"
                                        type="time"
                                        value={form.endTime}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meeting Type</label>
                                <div className="flex gap-2">
                                    {(["Online", "In Person"] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, type: t }))}
                                            className={clsx(
                                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-bold transition-all",
                                                form.type === t
                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                                            )}
                                        >
                                            {t === "Online" ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Link or Location */}
                            {form.type === "Online" ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meeting Link</label>
                                    <div className="relative">
                                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            name="link"
                                            value={form.link}
                                            onChange={handleChange}
                                            placeholder="meet.google.com/xxx or zoom.us/j/..."
                                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            name="location"
                                            value={form.location}
                                            onChange={handleChange}
                                            placeholder="e.g. Conference Room A"
                                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Participants */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Participants</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        name="participants"
                                        value={form.participants}
                                        onChange={handleChange}
                                        placeholder="Names separated by commas"
                                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Agenda / Notes</label>
                                <textarea
                                    name="notes"
                                    value={form.notes}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="What will be discussed in this meeting?"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-[#1F6F8B] text-white rounded-lg text-sm font-bold hover:bg-[#1e293b] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                    ) : (
                                        <><CheckCircle2 className="w-4 h-4" /> Schedule Meeting</>
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
