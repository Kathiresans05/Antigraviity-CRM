"use client";

import { useState, useEffect } from "react";
import {
    IndianRupee, Users, CreditCard, ChevronDown,
    Download, PieChart, BarChart3, TrendingUp,
    Filter, Search, CheckCircle2, Clock,
    AlertCircle, MoreHorizontal, ArrowUpRight, ArrowDownRight, TrendingDown,
    X, Save, FileText
} from "lucide-react";
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import axios from "axios";
import { toast } from "react-hot-toast";

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── Components ─────────────────────────────────────────────────────────────

function PayrollStatCard({ title, value, subtitle, icon: Icon, color, trend }: any) {
    return (
        <div className="bg-white rounded-[16px] p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-3 rounded-xl transition-colors duration-300", color)}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={clsx(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold",
                        trend.up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        {trend.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {trend.value}
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-[28px] font-bold text-gray-900 tracking-tight leading-none mb-2">{value}</h3>
                <p className="text-sm font-semibold text-gray-500">{title}</p>
                <p className="text-[12px] font-medium text-gray-400 mt-1">{subtitle}</p>
            </div>
        </div>
    );
}

function PayoutStatusBadge({ status }: { status: string }) {
    const cfg: Record<string, string> = {
        Processed: "bg-emerald-50 text-emerald-600 border-emerald-100",
        Pending: "bg-amber-50 text-amber-600 border-amber-100",
        Held: "bg-rose-50 text-rose-600 border-rose-100",
    };
    return (
        <span className={clsx("px-2.5 py-1 rounded-full text-[11px] font-bold border", cfg[status] || "bg-gray-50 text-gray-600 border-gray-100")}>
            {status}
        </span>
    );
}

// ─── Payout History Chart Data ───────────────────────────────────────────

const payoutHistoryData = {
    labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
    datasets: [{
        label: 'Payout (in ₹)',
        data: [410000, 425000, 418000, 435000, 442000, 452180],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
    }]
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PayrollPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalGross: 0,
        totalBonus: 0,
        totalDeductions: 0,
        netPayout: 0,
        pendingCount: 0
    });
    const [monthYear, setMonthYear] = useState("");
    const [trend, setTrend] = useState({
        data: [] as any[],
        growth: "+0.0% MoM",
        isUp: true
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");

    // Modals state
    const [editModalData, setEditModalData] = useState<any>(null);
    const [payslipModalData, setPayslipModalData] = useState<any>(null);

    const fetchPayroll = async () => {
        try {
            const res = await axios.get("/api/payroll");
            setPayrolls(res.data.payrolls);
            setStats(res.data.stats);
            setMonthYear(res.data.monthYear);
            if (res.data.trend) {
                setTrend(res.data.trend);
            }
        } catch (err: any) {
            console.error("Failed to fetch payroll", err);
            toast.error(err.response?.data?.error || "Failed to load payroll data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayroll();
    }, []);

    const handleProcessPayroll = async () => {
        if (!confirm(`Are you sure you want to process payrolls for ${monthYear}? This action cannot be undone.`)) return;

        setProcessing(true);
        const processingToast = toast.loading("Processing payrolls...");
        try {
            const res = await axios.post("/api/payroll");
            toast.success(res.data.message, { id: processingToast });
            fetchPayroll(); // Refresh data to show 'Processed' statuses
        } catch (err: any) {
            console.error("Failed to process payrolls", err);
            toast.error(err.response?.data?.error || "Error processing payrolls", { id: processingToast });
        } finally {
            setProcessing(false);
        }
    };

    const handleHoldPayout = async (userId: string, currentStatus: string) => {
        if (currentStatus === 'Processed') {
            toast.error("Cannot modify a payout that has already been processed.");
            return;
        }

        const isHolding = currentStatus !== 'Held';
        const newStatus = isHolding ? 'Held' : 'Pending';

        if (!confirm(`Are you sure you want to ${isHolding ? 'hold' : 'release'} this payout for ${monthYear}?`)) return;

        const actionToast = toast.loading(`${isHolding ? 'Holding' : 'Releasing'} payout...`);
        try {
            const res = await axios.patch("/api/payroll", { userId, monthYear, status: newStatus });
            toast.success(res.data.message, { id: actionToast });
            fetchPayroll();
        } catch (err: any) {
            console.error(`Failed to ${isHolding ? 'hold' : 'release'} payout`, err);
            toast.error(err.response?.data?.error || `Error ${isHolding ? 'holding' : 'releasing'} payout`, { id: actionToast });
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const savingToast = toast.loading("Saving details...");
        try {
            await axios.patch("/api/payroll", {
                userId: editModalData.userId,
                monthYear,
                baseSalary: editModalData.baseSalary,
                bonus: editModalData.bonus,
                deductions: editModalData.deductions,
                action: 'edit'
            });
            toast.success("Payroll details updated successfully", { id: savingToast });
            setEditModalData(null);
            fetchPayroll();
        } catch (err: any) {
            console.error("Failed to update details", err);
            toast.error(err.response?.data?.error || "Error saving details", { id: savingToast });
        }
    };

    const filteredPayrolls = payrolls.filter(emp => {
        const matchesSearch = emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.department || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = departmentFilter ? emp.department === departmentFilter : true;
        return matchesSearch && matchesDept;
    });

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
                    <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">Payroll Management</h2>
                    <p className="text-sm font-medium text-gray-500">
                        {monthYear || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Payout Cycle
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                        <Download className="w-4 h-4" /> Export Report
                    </button>
                    <button
                        onClick={handleProcessPayroll}
                        disabled={processing || stats.pendingCount === 0}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0f172a] text-white rounded-xl text-sm font-bold hover:bg-[#164e63] transition-all shadow-md shadow-cyan-900/10 disabled:opacity-50 min-w-[200px]"
                    >
                        {processing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Process Monthly Payroll"}
                    </button>
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PayrollStatCard
                    title="Total Gross Payroll"
                    value={`₹${(stats.totalGross / 1000).toFixed(1)}K`}
                    subtitle="Current month estimate"
                    icon={IndianRupee}
                    color="bg-blue-50 text-blue-600"
                    trend={{ up: true, value: "+4.2%" }}
                />
                <PayrollStatCard
                    title="Net Payout"
                    value={`₹${(stats.netPayout / 1000).toFixed(1)}K`}
                    subtitle="After all deductions"
                    icon={CreditCard}
                    color="bg-emerald-50 text-emerald-600"
                    trend={{ up: true, value: "+2.5%" }}
                />
                <PayrollStatCard
                    title="Tax Deductions"
                    value={`₹${(stats.totalDeductions / 1000).toFixed(1)}K`}
                    subtitle="Withheld for agencies"
                    icon={BarChart3}
                    color="bg-purple-50 text-purple-600"
                    trend={{ up: false, value: "-1.2%" }}
                />
                <PayrollStatCard
                    title="Pending Payouts"
                    value={stats.pendingCount}
                    subtitle="Action required"
                    icon={Clock}
                    color="bg-rose-50 text-rose-600"
                />
            </div>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">Payroll Trend</h3>
                            <p className="text-xs font-semibold text-gray-500">6-month payout analysis</p>
                        </div>
                        <div className={clsx("flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-lg", trend.isUp ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50")}>
                            {trend.isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />} {trend.growth}
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <Line
                            data={{
                                labels: trend.data.length > 0 ? trend.data.map((d: any) => d.month) : ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
                                datasets: [{
                                    label: 'Payout (in ₹)',
                                    data: trend.data.length > 0 ? trend.data.map((d: any) => d.amount) : [410000, 425000, 418000, 435000, 442000, 452180],
                                    borderColor: '#3b82f6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                    fill: true,
                                    tension: 0.4,
                                    pointRadius: 4,
                                    pointBackgroundColor: '#fff',
                                    pointBorderWidth: 2,
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { grid: { color: "#f3f4f6" }, ticks: { font: { size: 11, weight: 600 } } },
                                    x: { grid: { display: false }, ticks: { font: { size: 11, weight: 600 } } }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Important Notice Card */}
                <div className="bg-[#1f2937] p-8 rounded-2xl shadow-lg relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <AlertCircle className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-4">Compliance Notice</h3>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            Tax filing for the previous quarter is due by the end of this month. Please ensure all tax-saving declarations are verified.
                        </p>
                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-sm font-medium text-gray-300">PF Contribution Review</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-sm font-medium text-gray-300">Bonuses Finalized</span>
                            </div>
                        </div>
                        <button className="w-full bg-white text-gray-900 py-3 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all">
                            View Compliance Checklist
                        </button>
                    </div>
                </div>
            </div>

            {/* Employee Payout Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Employee Payout Details</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search employee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:font-semibold font-semibold"
                            />
                        </div>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">All Departments</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Design">Design</option>
                            <option value="Product">Product</option>
                            <option value="Marketing">Marketing</option>
                            <option value="HR">HR</option>
                            <option value="Sales">Sales</option>
                            <option value="Finance">Finance</option>
                            <option value="Support">Support</option>
                            <option value="Operations">Operations</option>
                            <option value="Information Technology (IT)">Information Technology (IT)</option>
                            <option value="DevOps">DevOps</option>
                            <option value="Cybersecurity">Cybersecurity</option>
                        </select>
                    </div>
                </div>
                <div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Base Salary</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Stats (Bonus/Tax)</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Net Pay</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredPayrolls.map((emp, idx) => (
                                <tr key={emp._id || idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                {emp.employeeName[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{emp.employeeName}</p>
                                                <p className="text-xs font-semibold text-gray-400">{emp.department || "General"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900">₹{emp.baseSalary.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase">+ Bonus</span>
                                                <span className="text-sm font-bold text-gray-900">₹{emp.bonus.toLocaleString()}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-rose-600 uppercase">- Tax</span>
                                                <span className="text-sm font-bold text-gray-900">₹{emp.deductions.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-base font-bold text-[#0f172a] tracking-tight">
                                            ₹{emp.netPay.toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <PayoutStatusBadge status={emp.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="relative group/menu inline-block">
                                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500/20">
                                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible group-focus-within/menu:opacity-100 group-focus-within/menu:visible transition-all z-10 py-1">
                                                <button
                                                    onClick={() => setPayslipModalData(emp)}
                                                    className="w-full px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                                >
                                                    View Payslip
                                                </button>
                                                <button
                                                    onClick={() => setEditModalData({ ...emp })}
                                                    className="w-full px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                                >
                                                    Edit Details
                                                </button>
                                                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                                <button
                                                    onClick={() => handleHoldPayout(emp.userId, emp.status)}
                                                    className={clsx(
                                                        "w-full px-4 py-2 text-left text-sm font-semibold transition-colors",
                                                        emp.status === 'Held' ? "text-amber-600 hover:bg-amber-50" : "text-rose-600 hover:bg-rose-50"
                                                    )}
                                                >
                                                    {emp.status === 'Held' ? 'Release Payout' : 'Hold Payout'}
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Details Modal */}
            {editModalData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Edit Payout Details</h3>
                                <p className="text-sm text-gray-500 font-medium">{editModalData.employeeName}</p>
                            </div>
                            <button onClick={() => setEditModalData(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Base Salary (₹)</label>
                                <input
                                    type="number"
                                    value={editModalData.baseSalary}
                                    onChange={(e) => setEditModalData({ ...editModalData, baseSalary: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-gray-900"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bonus (₹)</label>
                                <input
                                    type="number"
                                    value={editModalData.bonus}
                                    onChange={(e) => setEditModalData({ ...editModalData, bonus: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-gray-900"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tax Deductions (₹)</label>
                                <input
                                    type="number"
                                    value={editModalData.deductions}
                                    onChange={(e) => setEditModalData({ ...editModalData, deductions: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-gray-900"
                                    required
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditModalData(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-[#0f172a] text-white text-sm font-bold rounded-xl hover:bg-[#164e63] shadow-md shadow-cyan-900/10 transition-all">
                                    <Save className="w-4 h-4" /> Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Payslip Modal */}
            {payslipModalData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Payslip Preview</h3>
                                    <p className="text-sm text-gray-500 font-medium">{monthYear}</p>
                                </div>
                            </div>
                            <button onClick={() => setPayslipModalData(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors bg-white border border-gray-200">
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-100 to-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl border border-blue-100 shadow-sm">
                                    {payslipModalData.employeeName[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{payslipModalData.employeeName}</h2>
                                    <p className="text-sm font-semibold text-gray-500">{payslipModalData.department}</p>
                                </div>
                                <div className="ml-auto">
                                    <PayoutStatusBadge status={payslipModalData.status} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-gray-500">Base Salary</span>
                                    <span className="text-sm font-bold text-gray-900">₹{payslipModalData.baseSalary.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-gray-500">Allowances & Bonus</span>
                                    <span className="text-sm font-bold text-emerald-600">+ ₹{payslipModalData.bonus.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-gray-500">Taxes & Deductions</span>
                                    <span className="text-sm font-bold text-rose-600">- ₹{payslipModalData.deductions.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 p-4 rounded-xl">
                                <span className="text-base font-bold text-gray-700">Net Payable</span>
                                <span className="text-2xl font-black text-[#0f172a] tracking-tight">₹{payslipModalData.netPay.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all flex justify-center items-center gap-2">
                                <Download className="w-4 h-4" /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
