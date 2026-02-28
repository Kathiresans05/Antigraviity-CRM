"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Users, Search, MoreHorizontal, User, CheckCircle2, Clock, XCircle, ChevronDown, CheckSquare, Loader2 } from "lucide-react";
import clsx from "clsx";
import axios from "axios";
import moment from "moment";

export default function MyTeamPage() {
    const { data: session } = useSession();
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const userId = (session?.user as any)?.id;

    const fetchData = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [usersRes, attendanceRes, tasksRes] = await Promise.all([
                axios.get('/api/users?strict=true'),
                axios.get('/api/attendance'),
                axios.get('/api/daily-tasks')
            ]);

            const users = usersRes.data.users || [];
            const attendance = attendanceRes.data.records || [];
            const tasks = tasksRes.data.records || [];
            const today = moment().startOf('day');

            // Filter out the current user (the TL/Manager) from their own "My Team" list
            const subordinates = users.filter((u: any) => u._id !== userId);

            const enrichedTeam = subordinates.map((u: any) => {
                const record = attendance.find((r: any) =>
                    r.userId?._id === u._id &&
                    moment(r.date).isSame(today, 'day')
                );

                const userTasks = tasks.filter((t: any) => t.assignedTo?._id === u._id);
                const latestTask = userTasks.length > 0 ? userTasks[userTasks.length - 1].title : "No task assigned";

                let status: any = 'Offline';
                if (record) {
                    status = record.status;
                } else if (u.isActive && moment().hour() >= 10) {
                    status = 'Absent';
                }

                return {
                    ...u,
                    attendanceStatus: status,
                    currentTask: latestTask,
                    performance: Math.floor(Math.random() * 20) + 80, // Mock performance for now as requested by UI
                };
            });

            setTeam(enrichedTeam);
        } catch (err) {
            console.error("Failed to fetch team", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userId]);

    const filteredTeam = team.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            Present: "bg-emerald-50 text-emerald-600 border-emerald-100",
            Absent: "bg-rose-50 text-rose-600 border-rose-100",
            Late: "bg-amber-50 text-amber-600 border-amber-100",
            Offline: "bg-slate-50 text-slate-400 border-slate-200"
        }[status] || "bg-slate-50 text-slate-500 border-slate-200";

        const Icon = status === 'Present' ? CheckCircle2 : status === 'Late' ? Clock : XCircle;

        return (
            <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", styles)}>
                <Icon className="w-3.5 h-3.5" />
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading team data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Team</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage your team members and view their real-time status.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search team..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full md:w-64 transition-all bg-white"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Task</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Performance</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTeam.map((member) => (
                                <tr key={member._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                {member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-bold text-slate-900 leading-none mb-1">{member.name}</p>
                                                <p className="text-xs font-medium text-slate-500">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-semibold text-slate-700">{member.role}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={member.attendanceStatus} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-700 truncate max-w-[150px]">{member.currentTask}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={clsx("h-full rounded-full", member.performance >= 90 ? "bg-emerald-500" : "bg-blue-500")}
                                                    style={{ width: `${member.performance}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{member.performance}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link href={`/daily-tasks?user=${member._id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Assign Task">
                                                <CheckSquare className="w-4 h-4" />
                                            </Link>
                                            <Link href={`/employees/${member._id}`} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="View Profile">
                                                <User className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredTeam.length === 0 && (
                    <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-900">No Team Members Found</h3>
                        <p className="text-sm text-slate-500 mt-1">You currently have no direct or indirect reports assigned to you.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
