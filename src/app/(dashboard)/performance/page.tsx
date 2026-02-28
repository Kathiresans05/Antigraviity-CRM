"use client";

import { useState, useEffect } from "react";
import {
    Star, Users, Target, Activity,
    Search, Filter, MoreHorizontal, Download,
    Plus, TrendingUp, Award, AlertCircle,
    ArrowUpRight, ArrowDownRight, ChevronRight,
    Loader2, ChevronDown, CalendarDays, ExternalLink,
    X, Save
} from "lucide-react";
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, ArcElement, Title, Tooltip, Legend, RadialLinearScale, Filler
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import axios from "axios";
import moment from "moment";

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler
);

// ─── Components ─────────────────────────────────────────────────────────────

function PerformanceStatCard({ title, value, subtitle, icon: Icon, color, trend }: any) {
    return (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-3">
                <div className={clsx("p-2 rounded-lg", color)}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <div className={clsx(
                        "flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold",
                        trend.up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        {trend.value}
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-none mb-1">{value}</h3>
                <p className="text-[13px] font-bold text-slate-500 uppercase tracking-tight">{title}</p>
                <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase">{subtitle}</p>
            </div>
        </div>
    );
}

function ReviewStatusBadge({ status }: { status: string }) {
    const cfg: Record<string, string> = {
        "Exceeds Expectations": "bg-emerald-50 text-emerald-600 border-emerald-100",
        "Met Expectations": "bg-blue-50 text-blue-600 border-blue-100",
        "Needs Improvement": "bg-amber-50 text-amber-600 border-amber-100",
        "Under Review": "bg-rose-50 text-rose-600 border-rose-100",
    };
    return (
        <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", cfg[status] || "bg-gray-50 text-gray-600 border-gray-100")}>
            {status}
        </span>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PerformancePage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [reviewCycle, setReviewCycle] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [trend, setTrend] = useState<any[]>([]);
    const [reportModal, setReportModal] = useState<any>(null);
    const [editingReport, setEditingReport] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);
    const [reviewModal, setReviewModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [reviewForm, setReviewForm] = useState({
        userId: '',
        score: 4.0,
        goalCompletion: 80,
        reviewerNotes: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('/api/performance');
                setReviews(res.data.reviews);
                setStats(res.data.stats);
                setReviewCycle(res.data.reviewCycle);
                if (res.data.trend) setTrend(res.data.trend);
            } catch (err) {
                console.error('Failed to fetch performance data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredReviews = reviews.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const avgScore = stats?.avgScore ?? '—';

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewForm.userId) return;
        setSubmitting(true);
        try {
            await axios.patch('/api/performance', reviewForm);
            setReviewModal(false);
            const res = await axios.get('/api/performance');
            setReviews(res.data.reviews);
            setStats(res.data.stats);
            if (res.data.trend) setTrend(res.data.trend);
        } catch (err) {
            console.error('Failed to save review', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReportEditSubmit = async () => {
        if (!editForm) return;
        setSubmitting(true);
        try {
            await axios.patch('/api/performance', {
                userId: reportModal.id,
                score: editForm.score,
                goalCompletion: editForm.goalCompletion,
                skills: editForm.skills,
            });
            const res = await axios.get('/api/performance');
            setReviews(res.data.reviews);
            setStats(res.data.stats);
            if (res.data.trend) setTrend(res.data.trend);
            // Update the modal with new data
            const updated = res.data.reviews.find((r: any) => String(r.id) === String(reportModal.id));
            if (updated) setReportModal(updated);
            setEditingReport(false);
        } catch (err) {
            console.error('Failed to update review', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-[#f5f7f9]">
                <Loader2 className="w-8 h-8 text-[#0067ff] animate-spin mb-4" />
                <p className="text-slate-500 font-medium tracking-wide">Synthesizing Analytics...</p>
            </div>
        );
    }

    const performanceTrendData = {
        labels: trend.length > 0 ? trend.map(d => d.month) : ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        datasets: [{
            label: 'Performance Trend',
            data: trend.length > 0 ? trend.map(d => d.value) : [85, 88, 92, 90, 94, 98],
            borderColor: '#0067ff',
            backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(0, 103, 255, 0.1)');
                gradient.addColorStop(1, 'rgba(0, 103, 255, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#0067ff',
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#0067ff',
            pointHoverBorderColor: '#fff',
        }]
    };

    const skillMatrixData = {
        labels: ["Communication", "Technical Skill", "Leadership", "Punctuality", "Teamwork", "Adaptability"],
        datasets: [{
            label: 'Organization Average',
            data: stats?.avgSkills ? [
                stats.avgSkills.communication,
                stats.avgSkills.technical,
                stats.avgSkills.leadership,
                stats.avgSkills.punctuality,
                stats.avgSkills.teamwork,
                stats.avgSkills.adaptability,
            ] : [88, 76, 65, 92, 85, 80],
            backgroundColor: '#0067ff',
            borderRadius: 4,
            barThickness: 24,
        }]
    };

    return (
        <>
            <div className="min-h-screen bg-[#f5f7f9] -m-6 p-6">
                <div className="max-w-[1400px] mx-auto space-y-4">
                    {/* Zoho Header */}
                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-[#0067ff]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">Performance Analytics</h1>
                                <p className="text-[12px] text-slate-500 font-medium">Review Cycle: {reviewCycle || 'Loading...'} • Org-wide growth &amp; appraisals</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 text-[13px] font-bold transition-colors">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                            <button
                                onClick={() => {
                                    setReviewForm({ userId: '', score: 4.0, goalCompletion: 80, reviewerNotes: '' });
                                    setReviewModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0067ff] text-white text-[13px] font-bold rounded-md hover:bg-[#0052cc] transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                New Review
                            </button>
                        </div>
                    </div>

                    {/* KPI Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <PerformanceStatCard
                            title="Avg Performance"
                            value={`${avgScore}/5.0`}
                            subtitle="Current cycle average"
                            icon={Star}
                            color="bg-amber-50 text-amber-600"
                            trend={{ up: true, value: "+0.4" }}
                        />
                        <PerformanceStatCard
                            title="Top Performers"
                            value={stats?.topPerformers ?? '—'}
                            subtitle="Above 4.5 rating"
                            icon={Award}
                            color="bg-emerald-50 text-emerald-600"
                            trend={{ up: true, value: "+2" }}
                        />
                        <PerformanceStatCard
                            title="Needs Improvement"
                            value={stats?.needsImprovement ?? '—'}
                            subtitle="Priority counseling"
                            icon={AlertCircle}
                            color="bg-rose-50 text-rose-600"
                        />
                        <PerformanceStatCard
                            title="Goal Completion"
                            value={`${stats?.avgGoal ?? 0}%`}
                            subtitle="Avg project targets met"
                            icon={Target}
                            color="bg-blue-50 text-blue-600"
                            trend={{ up: true, value: "+5%" }}
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Performance Trend Chart */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Performance Trend</h3>
                                    <p className="text-[11px] font-bold text-slate-400">Monthly efficiency (Live Data)</p>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-[#0067ff] bg-blue-50 px-2 py-1 rounded">
                                    <Activity className="w-3.5 h-3.5" /> LIVE CONNECTED
                                </div>
                            </div>
                            <div className="h-[300px]">
                                <Line data={performanceTrendData} options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        y: {
                                            grid: { color: "#f1f5f9" },
                                            ticks: {
                                                font: { size: 10, weight: 600 },
                                                color: '#94a3b8'
                                            },
                                            max: 100,
                                            min: 60
                                        },
                                        x: {
                                            grid: { display: false },
                                            ticks: {
                                                font: { size: 10, weight: 600 },
                                                color: '#94a3b8'
                                            }
                                        }
                                    }
                                }} />
                            </div>
                        </div>

                        {/* Skill Matrix */}
                        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Skill Matrix</h3>
                                <p className="text-[11px] font-bold text-slate-400">Organization-wide skill score</p>
                            </div>
                            <div className="h-[300px]">
                                <Bar data={skillMatrixData} options={{
                                    indexAxis: 'y' as const,
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        y: {
                                            grid: { display: false },
                                            ticks: {
                                                font: { size: 10, weight: 700 },
                                                color: '#475569'
                                            }
                                        },
                                        x: {
                                            grid: { color: "#f1f5f9" },
                                            max: 100,
                                            ticks: {
                                                font: { size: 10, weight: 600 },
                                                color: '#94a3b8'
                                            }
                                        }
                                    }
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Zoho Controls */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by employee or department..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all text-[13px]"
                                />
                            </div>
                            <button className="flex items-center gap-2 px-3 py-2 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 text-[13px] font-medium transition-colors">
                                <Filter className="w-4 h-4" />
                                Filters
                            </button>
                        </div>

                        <div className="flex bg-slate-50 p-1 rounded-md border border-slate-200">
                            {['All Reviews', 'Met Expectations', 'Improvement'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setSearchTerm(status === 'All Reviews' ? '' : status)}
                                    className={clsx(
                                        "px-5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-tight transition-all",
                                        (searchTerm === status || (status === 'All Reviews' && searchTerm === '')) ? 'bg-white text-[#0067ff] shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                                    )}
                                >
                                    {status === 'Improvement' ? 'Needs Imp.' : status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Performance Review Table */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Internal Score</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Review Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Next Appraisal</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReviews.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="p-4 bg-slate-50 rounded-full">
                                                <Activity className="w-12 h-12 text-slate-300" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">No review data</h3>
                                                <p className="text-sm text-slate-400 max-w-xs mx-auto">No matching performance reviews found in the directory.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReviews.map((rev, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#f0f4ff] text-[#0067ff] flex items-center justify-center font-bold text-sm border border-blue-100 shadow-sm">
                                                        {rev.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-[14px] hover:text-[#0067ff] cursor-pointer transition-colors">{rev.name}</p>
                                                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">{rev.dept}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={clsx("h-full rounded-full", parseFloat(rev.score) >= 4.0 ? "bg-emerald-500" : (parseFloat(rev.score) >= 3.0 ? "bg-blue-500" : "bg-rose-500"))}
                                                            style={{ width: `${(parseFloat(rev.score) / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[13px] font-bold text-slate-700">{rev.score}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <ReviewStatusBadge status={rev.status} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[13px] font-bold text-slate-700 leading-none mb-1">{rev.nextReview}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Last: {rev.lastReview}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setReportModal(rev)}
                                                    className="text-[12px] font-bold text-[#0067ff] hover:underline flex items-center gap-1 ml-auto group-hover:translate-x-1 transition-transform"
                                                >
                                                    Report
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Info Footer */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-slate-200 p-6 rounded-lg shadow-sm mt-6">
                        <div className="flex items-start gap-4 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                <Award className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 mb-1">Performance Integrity</h4>
                                <p className="text-[12px] text-slate-500 leading-relaxed font-medium">
                                    Data is computed based on task completion rates, project milestones, and peer feedback in real-time. Consistency is validated against historical trends.
                                </p>
                            </div>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium text-right italic">
                            Enterprise Grade Analytics • Synced Profile
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Detail Modal */}
            {reportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-br from-[#0067ff] to-[#0052cc] text-white flex justify-between items-start flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-xl">{reportModal.name?.charAt(0).toUpperCase()}</div>
                                <div>
                                    <h2 className="text-lg font-bold">{reportModal.name}</h2>
                                    <p className="text-blue-100 text-sm font-medium">{reportModal.dept}</p>
                                    <div className="mt-1"><ReviewStatusBadge status={reportModal.status} /></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (!editingReport) {
                                            setEditForm({
                                                score: parseFloat(reportModal.score),
                                                goalCompletion: reportModal.goalCompletion,
                                                skills: { ...reportModal.skills },
                                            });
                                        }
                                        setEditingReport(!editingReport);
                                    }}
                                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors"
                                >
                                    {editingReport ? 'Cancel' : '✏️ Edit'}
                                </button>
                                <button onClick={() => { setReportModal(null); setEditingReport(false); }} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto flex-1 p-6 space-y-5">
                            {!editingReport ? (
                                /* — VIEW MODE — */
                                <>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                                            <p className="text-2xl font-black text-slate-800">{reportModal.score}</p>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase mt-1">Score / 5.0</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                                            <p className="text-2xl font-black text-emerald-600">{reportModal.goalCompletion}%</p>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase mt-1">Goal Met</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                                            <p className="text-sm font-black text-slate-800 leading-tight mt-1">{reviewCycle}</p>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase mt-1">Cycle</p>
                                        </div>
                                    </div>
                                    {reportModal.skills && (
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Skill Breakdown</h4>
                                            <div className="space-y-2">
                                                {Object.entries(reportModal.skills).map(([k, v]: any) => (
                                                    <div key={k} className="flex items-center gap-3">
                                                        <span className="text-[12px] font-semibold text-slate-600 w-28 capitalize">{k}</span>
                                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#0067ff] rounded-full" style={{ width: `${v}%` }} />
                                                        </div>
                                                        <span className="text-[12px] font-bold text-slate-700 w-8 text-right">{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Last Review</p>
                                            <p className="font-bold text-slate-700">{reportModal.lastReview}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Next Appraisal</p>
                                            <p className="font-bold text-slate-700">{reportModal.nextReview}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* — EDIT MODE — */
                                editForm && <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Performance Score: <span className="text-[#0067ff]">{editForm.score} / 5.0</span></label>
                                        <input type="range" min="1" max="5" step="0.1" value={editForm.score}
                                            onChange={e => setEditForm({ ...editForm, score: parseFloat(e.target.value) })}
                                            className="w-full accent-[#0067ff]" />
                                        <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-1"><span>1.0 Poor</span><span>3.0 Average</span><span>5.0 Excellent</span></div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Goal Completion: <span className="text-emerald-600">{editForm.goalCompletion}%</span></label>
                                        <input type="range" min="0" max="100" step="1" value={editForm.goalCompletion}
                                            onChange={e => setEditForm({ ...editForm, goalCompletion: parseInt(e.target.value) })}
                                            className="w-full accent-emerald-500" />
                                    </div>
                                    {editForm.skills && <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Skill Scores (out of 100)</h4>
                                        <div className="space-y-3">
                                            {Object.entries(editForm.skills).map(([k, v]: any) => (
                                                <div key={k} className="flex items-center gap-3">
                                                    <span className="text-[12px] font-semibold text-slate-600 w-28 capitalize">{k}</span>
                                                    <input type="range" min="0" max="100" step="1" value={v}
                                                        onChange={e => setEditForm({ ...editForm, skills: { ...editForm.skills, [k]: parseInt(e.target.value) } })}
                                                        className="flex-1 accent-[#0067ff]" />
                                                    <span className="text-[12px] font-bold text-[#0067ff] w-8 text-right">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                            {editingReport ? (
                                <button
                                    onClick={handleReportEditSubmit}
                                    disabled={submitting}
                                    className="w-full py-2.5 bg-[#0067ff] text-white text-sm font-bold rounded-xl hover:bg-[#0052cc] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setEditForm({
                                            score: parseFloat(reportModal.score),
                                            goalCompletion: reportModal.goalCompletion,
                                            skills: { ...reportModal.skills },
                                        });
                                        setEditingReport(true);
                                    }}
                                    className="w-full py-2.5 bg-[#0067ff] text-white text-sm font-bold rounded-xl hover:bg-[#0052cc] transition-all"
                                >
                                    ✏️ Edit This Review
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* New Review Modal */}
            {
                reviewModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Submit Performance Review</h3>
                                    <p className="text-sm text-slate-500">{reviewCycle}</p>
                                </div>
                                <button onClick={() => setReviewModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employee</label>
                                    <select
                                        value={reviewForm.userId}
                                        onChange={e => setReviewForm({ ...reviewForm, userId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-700"
                                        required
                                    >
                                        <option value="">Select employee...</option>
                                        {reviews.map((r: any) => <option key={r.id} value={r.id}>{r.name} — {r.dept}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Score: <span className="text-[#0067ff]">{reviewForm.score} / 5.0</span></label>
                                    <input type="range" min="1" max="5" step="0.1" value={reviewForm.score} onChange={e => setReviewForm({ ...reviewForm, score: parseFloat(e.target.value) })} className="w-full accent-[#0067ff]" />
                                    <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-1"><span>1.0 Poor</span><span>3.0 Average</span><span>5.0 Excellent</span></div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Goal Completion: <span className="text-emerald-600">{reviewForm.goalCompletion}%</span></label>
                                    <input type="range" min="0" max="100" step="1" value={reviewForm.goalCompletion} onChange={e => setReviewForm({ ...reviewForm, goalCompletion: parseInt(e.target.value) })} className="w-full accent-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reviewer Notes</label>
                                    <textarea value={reviewForm.reviewerNotes} onChange={e => setReviewForm({ ...reviewForm, reviewerNotes: e.target.value })} rows={3} placeholder="Optional notes..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-700 resize-none" />
                                </div>
                                <div className="pt-2 flex justify-end gap-3">
                                    <button type="button" onClick={() => setReviewModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl">Cancel</button>
                                    <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 bg-[#0067ff] text-white text-sm font-bold rounded-xl hover:bg-[#0052cc] disabled:opacity-50">
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Review
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </>
    );
}
