"use client";

import { useState, useEffect, useRef } from "react";
import {
    Megaphone, Users, Eye, Calendar,
    Plus, Search, Filter, Share2,
    MoreHorizontal, ChevronRight, Bell,
    AlertTriangle, Info, CheckCircle2,
    Clock, Send, LayoutGrid, List, ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import axios from "axios";
import toast from "react-hot-toast";

// ─── Components ─────────────────────────────────────────────────────────────

function AnnouncementStatCard({ title, value, subtitle, icon: Icon, color }: any) {
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

function PriorityBadge({ priority }: { priority: string }) {
    const cfg: Record<string, { bg: string, text: string, icon: any }> = {
        Urgent: { bg: "bg-rose-50", text: "text-rose-600", icon: AlertTriangle },
        Important: { bg: "bg-amber-50", text: "text-amber-600", icon: Info },
        General: { bg: "bg-blue-50", text: "text-blue-600", icon: Bell },
    };
    const { bg, text, icon: Icon } = cfg[priority] || cfg.General;
    return (
        <span className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current", bg, text)}>
            <Icon className="w-3 h-3" />
            {priority}
        </span>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
    const { data: session } = useSession();
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const broadcastRef = useRef<HTMLDivElement>(null);

    // Quick Broadcast Form State
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newIncludeLink, setNewIncludeLink] = useState(false);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/api/announcements");
            setAnnouncements(res.data);

            // Mark each announcement as seen
            if (res.data && res.data.length > 0) {
                res.data.forEach(async (ann: any) => {
                    try {
                        const announcementId = ann._id;
                        await axios.post(`/api/announcements/${announcementId}/seen`);
                    } catch (err) {
                        console.error(`Failed to mark announcement ${ann._id} as seen:`, err);
                    }
                });
            }
        } catch (err) {
            console.error("Failed to fetch announcements:", err);
            toast.error("Failed to load announcements");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleBroadcast = async () => {
        if (!newTitle.trim() || !newContent.trim()) {
            return toast.error("Title and message are required.");
        }

        try {
            setSubmitting(true);
            await axios.post("/api/announcements", {
                title: newTitle,
                content: newContent,
                includeCrmLink: newIncludeLink,
                priority: "General", // Default for quick broadcast
                status: "Broadcasted",
            });

            toast.success("Announcement broadcasted successfully!");
            setNewTitle("");
            setNewContent("");
            setNewIncludeLink(false);
            fetchAnnouncements();
        } catch (error: any) {
            console.error("Failed to broadcast:", error);
            const errMsg = error.response?.data?.details || error.response?.data?.error || "Failed to broadcast announcement.";
            toast.error(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredAds = announcements.filter(ad =>
        ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.author.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const averageReach = announcements.length > 0
        ? Math.round(announcements.reduce((acc, curr) => acc + parseInt(curr.reach || "0"), 0) / announcements.length)
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">Announcements Management</h2>
                    <p className="text-sm font-medium text-gray-500">Coordinate company-wide communications and broadcasts</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                        <Calendar className="w-4 h-4" /> Schedule Broadcast
                    </button>
                    <button
                        onClick={() => broadcastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#0f172a] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md"
                    >
                        <Plus className="w-4 h-4" /> New Announcement
                    </button>
                </div>
            </div>

            {/* Comms Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnnouncementStatCard
                    title="Total Broadcasts"
                    value={announcements.length}
                    subtitle="Lifetime updates sent"
                    icon={Megaphone}
                    color="bg-blue-50 text-blue-600"
                />
                <AnnouncementStatCard
                    title="Current Reach"
                    value={`${averageReach}%`}
                    subtitle="Avg. engagement rate"
                    icon={Users}
                    color="bg-purple-50 text-purple-600"
                />
                <AnnouncementStatCard
                    title="Active Alerts"
                    value={announcements.filter(a => a.status === 'Active' || a.priority === 'Urgent').length}
                    subtitle="Pinned/Urgent right now"
                    icon={Bell}
                    color="bg-amber-50 text-amber-600"
                />
                <AnnouncementStatCard
                    title="Scheduled Items"
                    value={announcements.filter(a => a.status === 'Scheduled').length}
                    subtitle="Set for future release"
                    icon={Clock}
                    color="bg-emerald-50 text-emerald-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Broadcast History */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">Broadcast History</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search announcements..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {filteredAds.length > 0 ? filteredAds.map((ad) => (
                            <div key={ad._id || ad.id} className="p-6 hover:bg-gray-50/50 transition-colors group cursor-pointer border-l-4 border-transparent hover:border-blue-500 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-[15px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{ad.title}</h4>
                                            <PriorityBadge priority={ad.priority} />
                                        </div>
                                        <p className="text-xs font-semibold text-gray-400 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" /> {new Date(ad.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} • By {ad.author}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-black text-gray-900">{ad.reach}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Seen</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed font-medium whitespace-pre-wrap">
                                    {ad.content}
                                </p>
                                <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toast("Detailed result viewing coming soon!", { icon: '📊' }); }}
                                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> View Results
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(`Check out this announcement: ${ad.title}`);
                                                toast.success("Link copied to clipboard!");
                                            }}
                                            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700"
                                        >
                                            <Share2 className="w-3.5 h-3.5" /> Share
                                        </button>
                                        {ad.includeCrmLink && (
                                            <Link
                                                href="/dashboard"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-1.5 text-xs font-bold text-[#0f172a] hover:text-blue-700 ml-auto bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                Go to CRM <ArrowUpRight className="w-3.5 h-3.5" />
                                            </Link>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                        )) : (
                            <div className="p-12 text-center text-gray-500 font-semibold">
                                No announcements found.
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-gray-50/50 text-center">
                        <button className="text-xs font-bold text-blue-600 hover:underline">View Older Broadcasts</button>
                    </div>
                </div>

                {/* Create New Call-to-Action */}
                <div className="space-y-6">
                    <div ref={broadcastRef} className="bg-gradient-to-br from-[#0f172a] to-blue-800 p-8 rounded-2xl shadow-lg relative overflow-hidden text-white scroll-mt-24">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Send className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-4">Quick Broadcast</h3>
                            <p className="text-blue-100 text-sm leading-relaxed mb-6 font-medium">
                                Need to share an update fast? Use the quick broadcast tool to reach everyone in seconds.
                            </p>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Announcement Title..."
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                                />
                                <textarea
                                    placeholder="Write your message here..."
                                    rows={3}
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                                />
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        id="addCrmLink"
                                        checked={newIncludeLink}
                                        onChange={(e) => setNewIncludeLink(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="addCrmLink" className="text-xs font-bold text-blue-100 cursor-pointer">Include "Go to CRM" button</label>
                                </div>
                                <button
                                    onClick={handleBroadcast}
                                    disabled={submitting}
                                    className="w-full bg-white text-[#0f172a] py-3 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-[#0f172a]/30 border-t-[#0f172a] rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-3.5 h-3.5" />
                                    )}
                                    {submitting ? 'Broadcasting...' : 'Broadcast Now'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Announcement Guidelines */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-500" /> Comms Guidelines
                        </h4>
                        <ul className="space-y-3">
                            {[
                                "Keep titles short and punchy.",
                                "Use urgent priority for mission-critical info only.",
                                "Tag specific departments for relevancy.",
                                "Schedule townhalls 48h in advance."
                            ].map((rule, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-[11px] font-semibold text-gray-500">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
