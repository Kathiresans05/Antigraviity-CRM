"use client";

import { useState, useEffect, useCallback } from "react";
import { Briefcase, Clock, Users, MoreHorizontal, Plus, AlertCircle, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, Loader2, TrendingUp, Play, Save } from "lucide-react";
import clsx from "clsx";
import axios from "axios";
import { useSession } from "next-auth/react";
import moment from "moment";
import Modal from "@/components/Modal";
import { toast } from "react-hot-toast";

export default function ProjectsPage() {
    const { data: session } = useSession();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [manualProgress, setManualProgress] = useState<number>(0);
    const [updatingProgress, setUpdatingProgress] = useState(false);
    const [newProject, setNewProject] = useState({
        name: "",
        client: "",
        startDate: moment().format("YYYY-MM-DD"),
        endDate: moment().add(10, 'days').format("YYYY-MM-DD"),
        status: "In Progress"
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projectsRes, tasksRes, usersRes] = await Promise.all([
                axios.get("/api/projects"),
                axios.get("/api/tasks"),
                axios.get("/api/users")
            ]);

            const allTasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
            const allUsers = usersRes.data.users || [];
            const rawProjects = projectsRes.data.projects || [];

            const processedProjects = rawProjects.map((proj: any) => {
                const projName = proj.name?.toLowerCase().trim();
                const projectTasks = allTasks.filter((t: any) =>
                    t.project?.toLowerCase().trim() === projName || t.project === proj._id
                );
                const totalTasks = projectTasks.length;
                const completedTasks = projectTasks.filter((t: any) => t.status === "Completed" || t.status === "Done").length;

                const calculatedProgress = proj.progress || 0;

                let risk = "Low";
                const deadlineDate = moment(proj.endDate);
                const daysUntilDeadline = deadlineDate.diff(moment(), 'days');

                if (proj.status !== "Completed") {
                    if (daysUntilDeadline < 7 && calculatedProgress < 80) risk = "High";
                    else if (daysUntilDeadline < 14 && calculatedProgress < 50) risk = "Medium";
                }

                const assignedUserIds = Array.from(new Set(projectTasks.map((t: any) => t.assignedTo).filter(Boolean)));
                const members = assignedUserIds.map((userId: any) => {
                    const user = allUsers.find((u: any) => u._id === userId);
                    if (!user) return { name: "Unknown", initials: "??" };
                    const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
                    return { name: user.name, initials };
                });

                return {
                    ...proj,
                    id: proj._id,
                    totalTasks,
                    completedTasks,
                    progress: calculatedProgress,
                    risk,
                    members,
                    teamSize: members.length > 0 ? members.length : proj.team || 1
                };
            });

            setProjects(processedProjects);
        } catch (error) {
            console.error("Failed to fetch project data", error);
            toast.error("Failed to sync with backend");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await axios.post("/api/projects", newProject);
            toast.success("Project created successfully");
            setIsModalOpen(false);
            fetchData();
            setNewProject({
                name: "",
                client: "",
                startDate: moment().format("YYYY-MM-DD"),
                endDate: moment().add(10, 'days').format("YYYY-MM-DD"),
                status: "In Progress"
            });
        } catch (err) {
            console.error("Failed to create project:", err);
            toast.error("Could not create project");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateProgress = async () => {
        if (!selectedProject) return;
        try {
            setUpdatingProgress(true);
            await axios.patch("/api/projects", {
                id: selectedProject.id,
                progress: manualProgress,
                status: selectedProject.status,
            });
            toast.success("Progress updated successfully");
            fetchData();
            setIsDetailsModalOpen(false);
        } catch (err) {
            console.error("Failed to update progress:", err);
            toast.error("Could not update progress");
        } finally {
            setUpdatingProgress(false);
        }
    };

    useEffect(() => {
        if (session) fetchData();
    }, [session]);

    const filteredProjects = projects.filter(p => filter === "All" || p.status === filter);

    const stats = {
        total: projects.filter(p => p.status !== "Completed").length,
        onTrack: projects.filter(p => p.status !== "Completed" && p.risk === "Low").length,
        atRisk: projects.filter(p => p.status !== "Completed" && p.risk === "High").length,
        completed: projects.filter(p => p.status === "Completed").length
    };

    const RiskIndicator = ({ level }: { level: string }) => {
        const styles = {
            Low: "text-emerald-500 bg-emerald-50 border-emerald-100",
            Medium: "text-amber-500 bg-amber-50 border-amber-100",
            High: "text-rose-500 bg-rose-50 border-rose-100"
        }[level] || "text-slate-500 bg-slate-50 border-slate-100";

        const Icon = level === 'Low' ? CheckCircle2 : level === 'Medium' ? AlertTriangle : AlertCircle;

        return (
            <span className={clsx("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border", styles)}>
                <Icon className="w-3 h-3" />
                {level} Risk
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Syncing with server...</p>
            </div>
        );
    }

    const userRole = (session?.user as any)?.role || "Employee";
    const canUpdateProgress = ["Admin", "Manager", "Assigned Manager", "TL", "HR Manager"].includes(userRole);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Track and manage your team's project deliverables.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-lg hover:border-blue-100 transition-all shadow-sm"
                        title="Sync Projects"
                    >
                        <Clock className={clsx("w-5 h-5", loading && "animate-spin")} />
                    </button>
                    <div className="relative group">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="appearance-none flex items-center gap-2 pl-4 pr-10 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition-all outline-none focus:ring-2 focus:ring-blue-500/10"
                        >
                            <option value="All">All Projects</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Completed">Completed</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-600/10 hover:bg-blue-700 transition-all"
                    >
                        <Plus className="w-4 h-4" /> New Project
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Active</p>
                        <p className="text-2xl font-bold text-slate-900 leading-none">{stats.total}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Briefcase className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">On Track</p>
                        <p className="text-2xl font-bold text-slate-900 leading-none">{stats.onTrack}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">At Risk</p>
                        <p className="text-2xl font-bold text-slate-900 leading-none">{stats.atRisk}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Completed</p>
                        <p className="text-2xl font-bold text-slate-900 leading-none">{stats.completed}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Project Cards Grid */}
            {filteredProjects.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-20 text-center">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No projects found</h3>
                    <p className="text-slate-500 text-sm mt-1">Try changing your filter or add a new project.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <div key={project.id} className="bg-white rounded-[10px] border border-slate-200 hover:border-blue-200 transition-all flex flex-col group h-full">

                            {/* Card Header */}
                            <div className="p-5 border-b border-slate-100 flex items-start justify-between relative group/header">
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 leading-tight mb-1 truncate">{project.name}</h3>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight truncate">{project.client}</p>
                                </div>
                                <div className="relative dropdown-container">
                                    <button className="p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded transition-colors shrink-0">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>

                                    {/* Action Dropdown - Simple hover or CSS based for now */}
                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover/header:opacity-100 group-hover/header:visible transition-all z-20 overflow-hidden">
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
                                                    try {
                                                        await axios.delete(`/api/projects?id=${project.id}`);
                                                        toast.success("Project deleted");
                                                        fetchData();
                                                    } catch (err) {
                                                        toast.error("Failed to delete project");
                                                    }
                                                }
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                                        >
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Deadline</span>
                                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
                                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                                            {moment(project.endDate).format("MMM DD, YYYY")}
                                        </div>
                                    </div>
                                    <RiskIndicator level={project.risk} />
                                </div>

                                {/* Progress Bar */}
                                <div>
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-[11px] font-bold text-slate-500">Progress</span>
                                        <span className="text-[14px] font-bold text-slate-900">{project.progress}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className={clsx("h-full rounded-full transition-all duration-700 ease-out",
                                                project.progress >= 80 ? "bg-emerald-500" :
                                                    project.progress < 30 ? "bg-rose-500" : "bg-blue-500"
                                            )}
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center mt-3">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            {project.completedTasks}/{project.totalTasks} Tasks Completed
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between rounded-b-[10px]">
                                <div className="flex -space-x-2">
                                    {project.members && project.members.map((m: any, i: number) => (
                                        <div key={i} title={m.name} className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 border border-white flex items-center justify-center text-[10px] font-bold shadow-sm relative group cursor-help">
                                            {m.initials}
                                        </div>
                                    ))}
                                    <button className="w-7 h-7 rounded-full bg-white border border-dashed border-slate-200 text-slate-300 flex items-center justify-center hover:text-blue-500 hover:border-blue-200 transition-colors z-10">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedProject(project);
                                        setManualProgress(project.progress);
                                        setIsDetailsModalOpen(true);
                                    }}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                                >
                                    View Details <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Project"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleCreateProject} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Project Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Website Redesign"
                            value={newProject.name}
                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Client Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Acme Corp"
                            value={newProject.client}
                            onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                            <input
                                type="date"
                                required
                                value={newProject.startDate}
                                onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                            <input
                                type="date"
                                required
                                value={newProject.endDate}
                                onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? "Creating..." : "Create Project"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Project Details Modal */}
            <Modal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                title="Project Details"
                maxWidth="max-w-xl"
            >
                {selectedProject && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{selectedProject.name}</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{selectedProject.client}</p>
                            </div>
                            <RiskIndicator level={selectedProject.risk} />
                        </div>

                        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Status</p>
                                <p className="text-sm font-bold text-slate-700">{selectedProject.status}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Progress</p>
                                <p className="text-sm font-bold text-slate-700">{selectedProject.progress}% Completed</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Start Date</p>
                                <p className="text-sm font-bold text-slate-700">{moment(selectedProject.startDate).format("MMM DD, YYYY")}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Deadline</p>
                                <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    {moment(selectedProject.endDate).format("MMM DD, YYYY")}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                Project Progress
                                {canUpdateProgress && manualProgress !== selectedProject.progress && (
                                    <button
                                        onClick={handleUpdateProgress}
                                        disabled={updatingProgress}
                                        className="inline-flex items-center gap-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded shadow-sm disabled:opacity-50 transition-colors"
                                    >
                                        <Save className="w-3 h-3" /> Save Changes
                                    </button>
                                )}
                            </h4>
                            {canUpdateProgress ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={manualProgress}
                                            onChange={(e) => setManualProgress(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <span className="text-sm font-bold text-slate-700 min-w-[3rem] text-right">{manualProgress}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner mt-1 hidden">
                                        <div
                                            className={clsx("h-full rounded-full transition-all duration-1000",
                                                manualProgress >= 80 ? "bg-emerald-500" :
                                                    manualProgress < 30 ? "bg-rose-500" : "bg-blue-500"
                                            )}
                                            style={{ width: `${manualProgress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                    <div
                                        className={clsx("h-full rounded-full transition-all duration-1000",
                                            selectedProject.progress >= 80 ? "bg-emerald-500" :
                                                selectedProject.progress < 30 ? "bg-rose-500" : "bg-blue-500"
                                        )}
                                        style={{ width: `${selectedProject.progress}%` }}
                                    />
                                </div>
                            )}

                            <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                <span>{selectedProject.completedTasks} tasks finished</span>
                                <span>{selectedProject.totalTasks} total tasks</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Team Assigned
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full normal-case tracking-normal">
                                    {selectedProject.teamSize} Member{selectedProject.teamSize !== 1 ? 's' : ''}
                                </span>
                            </h4>
                            <div className="flex flex-col gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 max-h-48 overflow-y-auto">
                                {selectedProject.members && selectedProject.members.length > 0 ? (
                                    selectedProject.members.map((m: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                                                {m.initials}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 truncate">{m.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center py-4">
                                        <span className="text-sm text-slate-400 italic font-medium">No active tasks assigned out yet</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

