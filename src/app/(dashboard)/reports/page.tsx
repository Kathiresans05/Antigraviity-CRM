"use client";

import { useState, useEffect } from "react";
import { PieChart as PieIcon, BarChart3, TrendingUp, Users, Loader2 } from "lucide-react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import axios from "axios";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface ReportData {
    isAdmin: boolean;
    kpi: {
        performance: number;
        totalEmployees: number;
        totalTasks: number;
        completedTasks: number;
    };
    charts: {
        bar: { labels: string[]; data: number[] };
        pie: { labels: string[]; data: number[] };
        line: { labels: string[]; data: number[] };
    };
}

export default function ReportsPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await axios.get("/api/reports");
                setData(res.data);
            } catch (err: any) {
                console.error("Failed to fetch report data:", err);
                setError(err.response?.data?.error || "Failed to load reports. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const barChartData = {
        labels: data?.charts.bar.labels || [],
        datasets: [
            {
                label: data?.isAdmin ? 'Tasks Completed' : 'Completed Projects',
                data: data?.charts.bar.data || [],
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderRadius: 4,
            }
        ]
    };

    const pieChartData = {
        labels: data?.charts.pie.labels || ['Pending', 'In Progress', 'Completed'],
        datasets: [
            {
                data: data?.charts.pie.data || [0, 0, 0],
                backgroundColor: [
                    'rgba(245, 158, 11, 0.8)',  // Amber (Pending)
                    'rgba(59, 130, 246, 0.8)',  // Blue (In Progress)
                    'rgba(16, 185, 129, 0.8)',  // Emerald (Completed)
                ],
                borderWidth: 0,
            }
        ]
    };

    const lineChartData = {
        labels: data?.charts.line.labels || [],
        datasets: [
            {
                label: data?.isAdmin ? 'Employees Present' : 'Days Present',
                data: data?.charts.line.data || [],
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' as const } }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading reports & analytics...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <p className="text-xl font-bold text-gray-800 mb-2">Oops! Something went wrong.</p>
                <p className="text-gray-500 font-medium">{error || "No data available."}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">Analytics & Reports</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none flex-1 sm:flex-none cursor-not-allowed opacity-70" title="Coming soon">
                        <option>Overall (All Time)</option>
                    </select>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-not-allowed opacity-70" title="Exporting is coming soon">
                        Export Report
                    </button>
                </div>
            </div>

            {/* KPI Summary Rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "Task Completion Rate", val: `${data.kpi.performance}%`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-100" },
                    { title: data.isAdmin ? "Total Completed Tasks" : "My Completed Tasks", val: data.kpi.completedTasks.toString(), icon: PieIcon, color: "text-emerald-600", bg: "bg-emerald-100" },
                    { title: data.isAdmin ? "Active Employees" : "My Active Projects", val: data.isAdmin ? data.kpi.totalEmployees.toString() : data.charts.bar.labels.filter(p => p !== "No Data").length.toString(), icon: Users, color: "text-amber-600", bg: "bg-amber-100" },
                    { title: data.isAdmin ? "Total Tasks Created" : "My Assigned Tasks", val: data.kpi.totalTasks.toString(), icon: BarChart3, color: "text-blue-600", bg: "bg-blue-100" }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-default">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{kpi.title}</p>
                            <h3 className="text-2xl font-bold text-gray-800">{kpi.val}</h3>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="w-6 h-6" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart Rows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                {/* Chart 1 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[350px] flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{data.isAdmin ? "Top Performers (Completed Tasks)" : "My Completed Tasks by Project"}</h3>
                    <div className="flex-1 w-full min-h-[250px]">
                        <Bar
                            data={barChartData}
                            options={{
                                ...commonOptions,
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                            }}
                        />
                    </div>
                </div>

                {/* Chart 2 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[350px] flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Status Distribution</h3>
                    <div className="flex-1 w-full min-h-[250px]">
                        <Pie data={pieChartData} options={commonOptions} />
                    </div>
                </div>

                {/* Wide Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px] flex flex-col lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Summary (Last 7 Days)</h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        <Line
                            data={lineChartData}
                            options={{
                                ...commonOptions,
                                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
