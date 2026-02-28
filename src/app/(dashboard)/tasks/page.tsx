"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Filter, LayoutGrid, List, MoreHorizontal, Clock, X, Trash2, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";
import axios from "axios";

interface ITask {
    _id: string;
    title: string;
    project: string;
    status: string;
    priority: string;
    due: string;
    assignedTo: string;
}

export default function TasksPage() {
    const { data: session, status } = useSession();
    const isManagerOrAdmin = session?.user && ["Admin", "Manager", "HR", "HR Manager", "TL"].includes((session?.user as any).role);

    const [view, setView] = useState<'board' | 'list'>('board');
    const [searchTerm, setSearchTerm] = useState("");
    const [tasks, setTasks] = useState<ITask[]>([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<{ _id: string, name: string, reportingManager?: any, teamLeader?: any }[]>([]);

    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ priority: "All", project: "All" });

    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({ title: "", project: "", priority: "Medium", due: "", assignedTo: "" });
    const [reassignModal, setReassignModal] = useState({ isOpen: false, taskId: "", targetMemberId: "" });

    const columns = ["To Do", "In Progress", "Review", "Done"];

    useEffect(() => {
        fetchTasks();
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get("/api/users");
            setEmployees(res.data.users);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await fetch("/api/tasks");
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newTask, status: "To Do" })
            });
            if (res.ok) {
                const createdTask = await res.json();
                setTasks([createdTask, ...tasks]);
                setIsModalOpen(false);
                setNewTask({ title: "", project: "", priority: "Medium", due: "", assignedTo: "" });
            }
        } catch (error) {
            console.error("Failed to create task", error);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setTasks(prev => prev.filter(t => t._id !== taskId));
            } else {
                const error = await res.json();
                alert(error.error || "Failed to delete task");
            }
        } catch (error) {
            console.error("Failed to delete task", error);
            alert("An error occurred while deleting the task");
        }
    };

    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // allow drop
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
        const taskId = e.dataTransfer.getData("taskId");
        if (!taskId) return;

        // Optimistic UI Update
        setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

        // API Update
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (error) {
            console.error("Failed to move task", error);
            fetchTasks(); // revert on fail
        }
    };

    const handleForwardTask = async () => {
        if (!reassignModal.taskId || !reassignModal.targetMemberId) return;

        try {
            const res = await fetch(`/api/tasks/${reassignModal.taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignedTo: reassignModal.targetMemberId })
            });

            if (res.ok) {
                setTasks(prev => prev.map(t => t._id === reassignModal.taskId ? { ...t, assignedTo: reassignModal.targetMemberId } : t));
                setReassignModal({ isOpen: false, taskId: "", targetMemberId: "" });
            } else {
                const error = await res.json();
                alert(error.error || "Failed to forward task");
            }
        } catch (error) {
            console.error("Failed to forward task", error);
            alert("An error occurred");
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'Critical': return 'bg-red-50 text-red-600';
            case 'High': return 'bg-orange-50 text-orange-600';
            case 'Medium': return 'bg-blue-50 text-blue-600';
            case 'Low': return 'bg-gray-50 text-gray-600';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    const getAssigneeInitials = (userId: string) => {
        const emp = employees.find(e => e._id === userId);
        if (!emp) return "??";
        return emp.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
    };

    if (loading || status === "loading") {
        return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPriority = filters.priority === "All" || t.priority === filters.priority;
        const matchesProject = filters.project === "All" || t.project === filters.project;
        return matchesSearch && matchesPriority && matchesProject;
    });

    const uniqueProjects = Array.from(new Set(tasks.map(t => t.project))).filter(Boolean);

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                    </div>
                    <div className="flex bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                        <button
                            onClick={() => setView('board')}
                            className={`p-1.5 rounded-md transition-all ${view === 'board' ? 'bg-white shadow-sm text-blue-600 border border-gray-200' : 'text-gray-400 hover:text-gray-600 border border-transparent'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white shadow-sm text-blue-600 border border-gray-200' : 'text-gray-400 hover:text-gray-600 border border-transparent'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto relative">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border rounded-lg transition-all shadow-sm ${isFilterOpen || filters.priority !== "All" || filters.project !== "All" ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters {(filters.priority !== "All" || filters.project !== "All") && <span className="w-2 h-2 rounded-full bg-blue-600 ml-1" />}
                    </button>

                    {/* Filter Dropdown */}
                    {isFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-gray-900">Filters</h4>
                                <button
                                    onClick={() => {
                                        setFilters({ priority: "All", project: "All" });
                                        setIsFilterOpen(false);
                                    }}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                                >
                                    Reset All
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Priority</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {["All", "Critical", "High", "Medium", "Low"].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setFilters({ ...filters, priority: p })}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filters.priority === p ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-200'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Project</label>
                                    <select
                                        value={filters.project}
                                        onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="All">All Projects</option>
                                        {uniqueProjects.map(proj => (
                                            <option key={proj} value={proj}>{proj}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {isManagerOrAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20 w-full sm:w-auto justify-center"
                        >
                            <Plus className="w-4 h-4" />
                            Add Task
                        </button>
                    )}
                </div>
            </div>

            {/* Task Content Area */}
            {view === 'board' ? (
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-6 min-w-max h-full">
                        {columns.map(col => (
                            <div
                                key={col}
                                className="w-[320px] bg-white rounded-xl flex flex-col h-full border border-gray-100/50 shadow-[0_2px_15px_rgba(0,0,0,0.03)]"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col)}
                            >
                                <div className="p-5 border-b border-gray-50 flex justify-between items-center rounded-t-xl bg-white sticky top-0 z-10">
                                    <h3 className="font-bold text-[15px] text-gray-800 tracking-tight">{col}</h3>
                                    <span className="bg-gray-50 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-md border border-gray-100">
                                        {filteredTasks.filter(t => t.status === col).length}
                                    </span>
                                </div>

                                <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto bg-gray-50/30">
                                    {filteredTasks.filter(t => t.status === col).map(task => (
                                        <div
                                            key={task._id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task._id)}
                                            className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-gray-200 transition-all cursor-grab active:cursor-grabbing group relative"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`text-[11px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isManagerOrAdmin && (
                                                        <button
                                                            onClick={() => handleDeleteTask(task._id)}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            title="Delete Task"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <div className="relative dropdown-container group/dropdown">
                                                        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                        
                                                        {/* Task Actions Dropdown */}
                                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-20 overflow-hidden">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setReassignModal({ isOpen: true, taskId: task._id, targetMemberId: "" });
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors border-b border-slate-50"
                                                            >
                                                                <TrendingUp className="w-3.5 h-3.5" />
                                                                Forward to Team
                                                            </button>
                                                            {isManagerOrAdmin && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTask(task._id);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    Delete Task
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-[15px] text-gray-900 mb-1.5 leading-snug">{task.title}</h4>
                                            <p className="text-[13px] text-gray-500 mb-5 font-medium">{task.project}</p>

                                            <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                                                <div className="flex items-center gap-1.5 text-[12px] text-gray-500 font-bold">
                                                    <Clock className="w-3.5 h-3.5 text-gray-400" /> {task.due || "No date"}
                                                </div>
                                                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-blue-600/20 select-none" title={employees.find(e => e._id === task.assignedTo)?.name || "Unknown"}>
                                                    {getAssigneeInitials(task.assignedTo)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Task Button in Column */}
                                    {isManagerOrAdmin && (
                                        <button
                                            onClick={() => {
                                                setNewTask(prev => ({ ...prev, status: col }));
                                                setIsModalOpen(true);
                                            }}
                                            className="mt-1 flex items-center justify-center gap-2 p-3.5 border border-dashed border-gray-200 rounded-xl text-gray-400 hover:bg-white hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all text-sm font-semibold"
                                        >
                                            <Plus className="w-4 h-4" /> Add Task
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden flex-1 overflow-y-auto">
                    {/* List View */}
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm shadow-gray-100">
                            <tr className="text-gray-400 text-[11px] uppercase tracking-widest font-bold border-b border-gray-100">
                                <th className="px-6 py-5">Task Name</th>
                                <th className="px-6 py-5">Project</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Priority</th>
                                <th className="px-6 py-5">Due Date</th>
                                <th className="px-6 py-5">Assignee</th>
                                {isManagerOrAdmin && <th className="px-6 py-5 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredTasks.map(task => (
                                <tr key={task._id} className="hover:bg-gray-50/80 transition-colors bg-white group cursor-pointer">
                                    <td className="px-6 py-5 text-[14px] font-bold text-gray-800">{task.title}</td>
                                    <td className="px-6 py-5 text-[13px] font-medium text-gray-500">{task.project}</td>
                                    <td className="px-6 py-5">
                                        <span className="text-[12px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-md">{task.status}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`text-[12px] font-bold px-3 py-1.5 rounded-md ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-[13px] font-semibold text-gray-600">{task.due || "—"}</td>
                                    <td className="px-6 py-5">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-blue-600/20 select-none" title={employees.find(e => e._id === task.assignedTo)?.name || "Unknown"}>
                                            {getAssigneeInitials(task.assignedTo)}
                                        </div>
                                    </td>
                                    {isManagerOrAdmin && (
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTask(task._id);
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Task"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Task Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">Create New Task</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleCreateTask} className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Task Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Design Homepage UI"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Project Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Mobile App Dev"
                                        value={newTask.project}
                                        onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Due Date</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Oct 25"
                                        value={newTask.due}
                                        onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Priority</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Assignee</label>
                                    <select
                                        required
                                        value={newTask.assignedTo}
                                        onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                    >
                                        <option value="" disabled>Select Employee</option>
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp._id}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20 active:scale-95"
                                >
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Forward Task Modal */}
            {reassignModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">Forward Task</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Select a team member to reassign this task.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Assignee</label>
                                <select
                                    required
                                    value={reassignModal.targetMemberId}
                                    onChange={(e) => setReassignModal({ ...reassignModal, targetMemberId: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                >
                                    <option value="" disabled>Select Team Member</option>
                                    {(() => {
                                        const userRole = (session?.user as any)?.role;
                                        const userId = (session?.user as any)?.id;
                                        
                                        // Admins and HR Managers can see everyone
                                        if (['Admin', 'HR Manager', 'HR'].includes(userRole)) {
                                            return employees.map(emp => (
                                                <option key={emp._id} value={emp._id}>{emp.name}</option>
                                            ));
                                        }

                                        // Managers and TLs see only their subordinates
                                        return employees
                                            .filter(emp => 
                                                emp.teamLeader?._id === userId || 
                                                emp.reportingManager?._id === userId
                                            )
                                            .map(emp => (
                                                <option key={emp._id} value={emp._id}>{emp.name}</option>
                                            ));
                                    })()}
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button
                                    onClick={() => setReassignModal({ isOpen: false, taskId: "", targetMemberId: "" })}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleForwardTask}
                                    disabled={!reassignModal.targetMemberId}
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50"
                                >
                                    Forward Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
