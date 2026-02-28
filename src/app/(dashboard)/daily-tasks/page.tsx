"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckSquare, Square, Plus, Trash2, User as UserIcon, AlertCircle, Loader2, ArrowLeft, RotateCcw } from "lucide-react";
import axios from "axios";
import clsx from "clsx";

const DEFAULT_TASKS = [
    { id: 'login', title: 'Office login time marked', completed: false },
    { id: 'email', title: 'Email checked', completed: false },
    { id: 'tasks_reviewed', title: 'Today tasks reviewed', completed: false },
    { id: 'pending_noted', title: 'Pending work noted', completed: false },
    { id: 'tasks_marked', title: 'Today completed tasks marked', completed: false },
    { id: 'tasks_moved', title: 'Pending tasks moved to tomorrow', completed: false },
    { id: 'attendance_logout', title: 'Attendance logout completed', completed: false },
    { id: 'report_submitted', title: 'Daily report submitted', completed: false }
];

function DailyTasksContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetUserId = searchParams.get('user');

    const userRole = session?.user?.role;
    const currentUserId = (session?.user as any)?.id;
    const isManagementNode = ["Admin", "HR", "HR Manager", "Manager", "Assigned Manager", "TL"].includes(userRole as string);

    const [allChecklists, setAllChecklists] = useState([]);
    const [checklistItems, setChecklistItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loginTime, setLoginTime] = useState("");
    const [employeeName, setEmployeeName] = useState("");
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchChecklist = async () => {
        try {
            setLoading(true);
            const url = targetUserId ? `/api/daily-checklist?userId=${targetUserId}` : "/api/daily-checklist";
            const res = await axios.get(url);

            if (res.data.records) {
                setAllChecklists(res.data.records || []);
            } else if (res.data.record) {
                setChecklistItems(res.data.record.items || []);
                // If viewing someone else, get their name
                if (targetUserId && targetUserId !== currentUserId) {
                    const userRes = await axios.get(`/api/users`);
                    const user = userRes.data.users.find((u: any) => u._id === targetUserId);
                    if (user) setEmployeeName(user.name);
                }
            }

            // Fetch attendance for login time
            const attUrl = targetUserId ? `/api/attendance?userId=${targetUserId}` : "/api/attendance";
            const attRes = await axios.get(attUrl);
            const todayRecord = attRes.data.records.find((r: any) =>
                new Date(r.date).toDateString() === new Date().toDateString()
            );

            if (todayRecord) {
                setLoginTime(new Date(todayRecord.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            } else {
                setLoginTime("");
            }
        } catch (error) {
            console.error("Failed to fetch checklist", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) fetchChecklist();
    }, [session, targetUserId]);

    const saveChecklist = async (items: any[]) => {
        await axios.post("/api/daily-checklist", {
            items,
            targetUserId: targetUserId || undefined
        });
    };

    const handleToggleTask = async (itemId: string, currentStatus: boolean) => {
        const isAssignmentMode = !!(targetUserId && targetUserId !== currentUserId);
        if (isAssignmentMode) return; // Management can't toggle items for employees

        try {
            const updatedItems = checklistItems.map((item) =>
                item.id === itemId ? { ...item, completed: !currentStatus } : item
            );
            setChecklistItems(updatedItems);
            await saveChecklist(updatedItems);
        } catch (error) {
            alert("Failed to update status");
            fetchChecklist();
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        setSubmitting(true);
        try {
            const newItem = {
                id: `custom-${Date.now()}`,
                title: newTaskTitle.trim(),
                completed: false
            };
            const updatedItems = [...checklistItems, newItem];
            setChecklistItems(updatedItems);
            await saveChecklist(updatedItems);
            setNewTaskTitle("");
        } catch (error) {
            alert("Failed to add task");
            fetchChecklist();
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTask = async (itemId: string) => {
        if (!confirm("Are you sure you want to remove this task?")) return;

        try {
            const updatedItems = checklistItems.filter(item => item.id !== itemId);
            setChecklistItems(updatedItems);
            await saveChecklist(updatedItems);
        } catch (error) {
            alert("Failed to delete task");
            fetchChecklist();
        }
    };

    const handleResetToDefaults = async () => {
        if (!confirm("This will restore the standard 8 daily tasks. Any custom tasks assigned today will be removed. Proceed?")) return;

        try {
            setChecklistItems(DEFAULT_TASKS);
            await saveChecklist(DEFAULT_TASKS);
        } catch (error) {
            alert("Failed to reset checklist");
            fetchChecklist();
        }
    };

    const completedCount = checklistItems.filter(i => i.completed).length;
    const progressPercent = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium tracking-tight">Loading checklist...</p>
            </div>
        );
    }

    const isAssignmentMode = !!(targetUserId && targetUserId !== currentUserId);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className={clsx(
                        "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                        isAssignmentMode ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                    )}>
                        {isAssignmentMode ? <UserIcon className="w-6 h-6" /> : <CheckSquare className="w-6 h-6" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                {isAssignmentMode ? `Task Assignment` : "Daily Checklist"}
                            </h3>
                            {isAssignmentMode && (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-tighter rounded-full border border-amber-100/50">
                                    For {employeeName}
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 min-w-[160px] text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            {isAssignmentMode ? "Employee Login" : "My Login Time"}
                        </p>
                        <p className={clsx("text-lg font-black tracking-tight", loginTime ? "text-slate-900" : "text-slate-300 italic text-sm")}>
                            {loginTime || "Not logged in yet"}
                        </p>
                    </div>
                    {isAssignmentMode && (
                        <button
                            onClick={() => router.push('/my-team')}
                            className="p-3 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all shadow-sm group"
                            title="Back to My Team"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            </div>

            {isAssignmentMode && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 shadow-sm shadow-blue-500/5">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                        <p className="font-bold">Assignment Mode Active</p>
                        <p className="font-medium opacity-80">You are currently assigning and managing tasks for <strong>{employeeName}</strong>. These updates appear instantly on their dashboard.</p>
                    </div>
                </div>
            )}

            {!isAssignmentMode && isManagementNode && allChecklists.length > 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allChecklists.map((checklist: any) => {
                        const count = checklist.items.filter((i: any) => i.completed).length;
                        const pct = Math.round((count / (checklist.items.length || 1)) * 100);
                        return (
                            <div key={checklist._id} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:border-blue-300 transition-all group">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/30">
                                    <h3 className="font-bold text-slate-900 text-[15px] mb-3">{checklist.userId?.name || "Employee"}</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs font-black text-blue-600">{pct}%</span>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto bg-white">
                                    {checklist.items.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-3 py-1.5">
                                            <div className={clsx("w-4 h-4 rounded border flex items-center justify-center shrink-0", item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent")}>
                                                <CheckSquare className="w-3 h-3" />
                                            </div>
                                            <span className={clsx("text-xs font-medium truncate", item.completed ? "text-slate-400 line-through" : "text-slate-600")}>{item.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold text-slate-900 text-lg tracking-tight">
                                {isAssignmentMode ? "Assigned Daily Responsibilities" : "Your Daily Responsibilities"}
                            </h3>
                            {isAssignmentMode && (
                                <button
                                    onClick={handleResetToDefaults}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-200 rounded-full text-[10px] font-bold transition-all"
                                    title="Restore default 8 tasks"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Reset to Defaults
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-64">
                            <span className="text-sm font-black text-blue-600">{progressPercent}%</span>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out shadow-sm"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-3">
                        {isAssignmentMode && (
                            <form onSubmit={handleAddTask} className="flex gap-2 pb-6 mb-4 border-b border-slate-100">
                                <input
                                    type="text"
                                    placeholder="Type a custom task (e.g., 'Finish recruitment report')..."
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all placeholder:text-slate-400"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !newTaskTitle.trim()}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-black flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Assign Task
                                </button>
                            </form>
                        )}

                        {checklistItems.map((item) => (
                            <div
                                key={item.id}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-xl border transition-all relative group shadow-sm",
                                    item.completed ? "bg-slate-50/50 border-slate-100 opacity-70" : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                                )}
                            >
                                <button
                                    onClick={() => handleToggleTask(item.id, item.completed)}
                                    disabled={isAssignmentMode}
                                    className={clsx(
                                        "flex flex-shrink-0 items-center justify-center w-7 h-7 rounded-xl border transition-all duration-200",
                                        item.completed ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" : "border-slate-300 text-transparent hover:border-blue-500 bg-white",
                                        isAssignmentMode && "cursor-default select-none"
                                    )}
                                >
                                    <CheckSquare className={clsx("w-4 h-4 transition-all duration-200", item.completed ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
                                </button>

                                <div className="flex-1 min-w-0" onClick={() => !isAssignmentMode && handleToggleTask(item.id, item.completed)}>
                                    <p className={clsx(
                                        "text-[15px] font-bold transition-colors duration-200 truncate cursor-pointer",
                                        item.completed ? "text-slate-400 line-through" : "text-slate-800"
                                    )}>
                                        {item.title}
                                    </p>
                                    {item.id.startsWith('custom-') && (
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5 inline-block">Assigned Task</span>
                                    )}
                                </div>

                                {isAssignmentMode && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(item.id); }}
                                        className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Remove Task"
                                    >
                                        <Trash2 className="w-4.5 h-4.5" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {checklistItems.length === 0 && (
                            <div className="py-20 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 font-bold text-lg">No tasks assigned yet.</p>
                                <p className="text-slate-400 text-sm mt-1 mb-6">Start by adding a custom task or reset to defaults.</p>
                                <button
                                    onClick={handleResetToDefaults}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-black text-sm hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Restore Standard Task List
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DailyTasksPage() {
    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}>
            <DailyTasksContent />
        </Suspense>
    );
}
