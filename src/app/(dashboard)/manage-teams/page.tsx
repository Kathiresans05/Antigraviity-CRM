"use client";

import { useState, useEffect } from "react";
import { Users, Search, CheckCircle2, ChevronRight, ChevronDown, UserMinus, Plus, ShieldCheck, Loader2 } from "lucide-react";
import axios from "axios";
import clsx from "clsx";
import { useSession } from "next-auth/react";

interface Employee {
    _id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    reportingManager?: {
        name: string;
        role: string;
        _id: string;
    } | string | null;
    teamLeader?: {
        name: string;
        role: string;
        _id: string;
    } | string | null;
}

interface HierarchicalUser extends Employee {
    subordinates: HierarchicalUser[];
}

export default function ManageTeamsPage() {
    const { data: session } = useSession();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [hierarchy, setHierarchy] = useState<HierarchicalUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTl, setSelectedTl] = useState<string | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");
    const [assignTo, setAssignTo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const fetchAllData = async () => {
        try {
            const res = await axios.get("/api/users");
            const allUsers: Employee[] = res.data.users || [];
            setEmployees(allUsers);

            // Build Hierarchy: Manager -> TL -> Employee
            const managers = allUsers.filter(u => ['Manager', 'HR Manager', 'Admin', 'Assigned Manager'].includes(u.role));
            const tls = allUsers.filter(u => u.role === 'TL');
            const regularEmployees = allUsers.filter(u => u.role === 'Employee');

            const tree: HierarchicalUser[] = managers.map(m => {
                // Find TLs reporting to this manager
                const directTls = tls.filter(t => {
                    const managerId = typeof t.reportingManager === 'object' ? t.reportingManager?._id : t.reportingManager;
                    return String(managerId) === String(m._id);
                });

                // Find Employees reporting directly to this manager AND NOT assigned to a TL
                const directEmployees = regularEmployees.filter(e => {
                    const managerId = typeof e.reportingManager === 'object' ? e.reportingManager?._id : e.reportingManager;
                    const tlId = typeof e.teamLeader === 'object' ? e.teamLeader?._id : e.teamLeader;
                    return String(managerId) === String(m._id) && !tlId;
                });

                return {
                    ...m,
                    subordinates: [
                        ...directTls.map(t => ({
                            ...t,
                            subordinates: regularEmployees.filter(e => {
                                const tlId = typeof e.teamLeader === 'object' ? e.teamLeader?._id : e.teamLeader;
                                return String(tlId) === String(t._id);
                            }).map(e => ({ ...e, subordinates: [] }))
                        })),
                        ...directEmployees.map(e => ({ ...e, subordinates: [] }))
                    ]
                };
            });

            // Add lone TLs (not reporting to any manager)
            const assignedTlIds = new Set(tree.flatMap(m => m.subordinates.filter(s => s.role === 'TL').map(s => s._id)));
            const loneTls = tls.filter(t => !assignedTlIds.has(t._id)).map(t => ({
                ...t,
                subordinates: regularEmployees.filter(e => {
                    const tlId = typeof e.teamLeader === 'object' ? e.teamLeader?._id : e.teamLeader;
                    return String(tlId) === String(t._id);
                }).map(e => ({ ...e, subordinates: [] }))
            }));

            setHierarchy([...tree, ...loneTls]);
        } catch (e) {
            console.error("Failed to fetch users", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const getManagerId = (emp: Employee) => {
        return typeof emp.reportingManager === 'object' ? emp.reportingManager?._id : emp.reportingManager;
    };

    const getTeamLeaderId = (emp: Employee) => {
        return typeof emp.teamLeader === 'object' ? emp.teamLeader?._id : emp.teamLeader;
    };

    // Logic: If a TL is selected, show their assigned team members.
    // If a Manager is selected, show their direct reports (including TLs).
    const isSelectedTl = employees.find(e => e._id === selectedTl)?.role === 'TL';

    const assignedMembers = employees.filter(e => {
        if (isSelectedTl) {
            return String(getTeamLeaderId(e)) === String(selectedTl);
        } else {
            return String(getManagerId(e)) === String(selectedTl);
        }
    });

    const unassignedMembers = employees.filter(e => {
        if (String(e._id) === String(selectedTl)) return false;
        if (e.role === 'Admin') return false;

        const isAlreadyAssignedToThisNode = isSelectedTl
            ? String(getTeamLeaderId(e)) === String(selectedTl)
            : String(getManagerId(e)) === String(selectedTl);

        if (isAlreadyAssignedToThisNode) return false;

        const matchesSearch = searchTerm === "" ||
            e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === "All" || e.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    useEffect(() => {
        setAssignTo(selectedTl);
    }, [selectedTl]);

    const handleAssign = async (memberId: string) => {
        const targetNode = assignTo || selectedTl;
        if (!targetNode) return;

        const targetUser = employees.find(u => u._id === targetNode);
        const memberUser = employees.find(u => u._id === memberId);

        setSubmitting(memberId === 'bulk' ? true : false);
        try {
            let updateData: any = { id: memberId };

            if (targetUser?.role === 'TL') {
                // If assigning to a TL:
                // 1. Employee's reportingManager = TL's reportingManager (the Manager)
                // 2. Employee's teamLeader = TL's ID
                const tlManagerId = getManagerId(targetUser);
                updateData.reportingManager = tlManagerId || null;
                updateData.teamLeader = targetNode;
            } else {
                // If assigning directly to a Manager:
                // 1. Employee's reportingManager = Manager's ID
                // 2. Employee's teamLeader = null
                updateData.reportingManager = targetNode;
                updateData.teamLeader = null;
            }

            await axios.patch("/api/users", updateData);
            setEmployees(prev => prev.map(e => e._id === memberId ? { ...e, ...updateData } : e));
            setSuccessMsg("Member assigned successfully!");
            setTimeout(() => setSuccessMsg(""), 3000);
            fetchAllData(); // Refresh hierarchy
        } catch (err) {
            console.error("Assignment failed", err);
        }
    };

    const handleUnassign = async (memberId: string) => {
        try {
            // Logic for unassign:
            // If currently viewing a TL: only clear the teamLeader field.
            // If currently viewing a Manager: clear both reportingManager and teamLeader.
            const updateData: any = { id: memberId };
            if (isSelectedTl) {
                updateData.teamLeader = null;
            } else {
                updateData.reportingManager = null;
                updateData.teamLeader = null;
            }

            await axios.patch("/api/users", updateData);
            setEmployees(prev => prev.map(e => e._id === memberId ? { ...e, ...updateData } : e));
            setSuccessMsg("Member unassigned.");
            setTimeout(() => setSuccessMsg(""), 3000);
            fetchAllData();
        } catch (err) {
            console.error("Unassignment failed", err);
        }
    };

    const toggleNode = (nodeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
        } else {
            newExpanded.add(nodeId);
        }
        setExpandedNodes(newExpanded);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <Users className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Team Management</h1>
                        <p className="text-sm font-medium text-slate-500">Assign team members to Team Leaders and Managers</p>
                    </div>
                </div>
                {successMsg && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-4 h-4" /> {successMsg}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Hierarchical Team List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-[800px]">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Organizational Hierarchy</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="space-y-1">
                                {hierarchy.map(manager => (
                                    <div key={manager._id} className="flex flex-col">
                                        {/* Level 1: Manager */}
                                        <div className="group relative">
                                            <div className={clsx(
                                                "flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer",
                                                selectedTl === manager._id ? "bg-blue-50/80 ring-1 ring-blue-100" : "hover:bg-slate-50"
                                            )} onClick={() => setSelectedTl(manager._id)}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleNode(manager._id); }}
                                                    className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded transition-colors"
                                                >
                                                    {manager.subordinates.length > 0 && (
                                                        expandedNodes.has(manager._id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                <div className={clsx(
                                                    "w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm flex-shrink-0",
                                                    selectedTl === manager._id ? "opacity-100" : "opacity-80"
                                                )}>
                                                    {manager.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={clsx("text-xs font-bold truncate", selectedTl === manager._id ? "text-blue-700" : "text-slate-900")}>
                                                        {manager.name}
                                                    </p>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {manager.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Level 2: TLs */}
                                        {expandedNodes.has(manager._id) && manager.subordinates.length > 0 && (
                                            <div className="ml-6 relative border-l border-slate-200 mt-1 pl-4 space-y-1 py-1">
                                                {manager.subordinates.map((tl, tlIdx) => (
                                                    <div key={tl._id} className="relative">
                                                        {/* L-Shape Connector */}
                                                        <div className="absolute -left-4 top-4 w-4 h-px bg-slate-200" />

                                                        <div className={clsx(
                                                            "flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer",
                                                            selectedTl === tl._id ? "bg-emerald-50/80 ring-1 ring-emerald-100" : "hover:bg-slate-50"
                                                        )} onClick={() => setSelectedTl(tl._id)}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleNode(tl._id); }}
                                                                className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded transition-colors"
                                                            >
                                                                {tl.subordinates.length > 0 && (
                                                                    expandedNodes.has(tl._id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                                                                )}
                                                            </button>
                                                            <div className={clsx(
                                                                "w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px] shadow-sm flex-shrink-0",
                                                                selectedTl === tl._id ? "opacity-100" : "opacity-80"
                                                            )}>
                                                                {tl.name.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={clsx("text-[11px] font-bold truncate", selectedTl === tl._id ? "text-emerald-700" : "text-slate-700")}>
                                                                    {tl.name}
                                                                </p>
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                    {tl.role === 'TL' ? 'TL' : 'Employee'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Level 3: Employees */}
                                                        {expandedNodes.has(tl._id) && tl.subordinates.length > 0 && (
                                                            <div className="ml-5 relative border-l border-slate-100 mt-1 pl-4 space-y-1 py-1">
                                                                {tl.subordinates.map((emp) => (
                                                                    <div key={emp._id} className="relative flex items-center gap-2 p-1.5 pl-2 rounded hover:bg-white transition-colors group">
                                                                        <div className="absolute -left-4 top-3.5 w-4 h-px bg-slate-100" />
                                                                        <div className="w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[7px] font-black border border-slate-200/50">
                                                                            {emp.name.charAt(0)}
                                                                        </div>
                                                                        <span className="text-[10px] font-medium text-slate-500 truncate">{emp.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50/50 border-t border-slate-100">
                            <p className="text-[9px] text-slate-400 font-medium italic text-center">
                                Click name to manage reports • use chevrons to browse
                            </p>
                        </div>
                    </div>
                </div>

                {/* Team Details */}
                <div className="lg:col-span-8 space-y-6">
                    {!selectedTl ? (
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm border-dashed p-20 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mb-4">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">No TL Selected</h2>
                            <p className="text-sm text-slate-500 max-w-sm mt-2">
                                Select a Team Leader from the list on the left to manage their assigned team members.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Assigned Members */}
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        Managing — {employees.find(e => e._id === selectedTl)?.name}
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">
                                            {assignedMembers.length} reporters
                                        </span>
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {assignedMembers.length === 0 ? (
                                        <div className="p-8 text-center bg-slate-50/30">
                                            <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3">
                                                <Users className="w-6 h-6 text-slate-300" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-400">No members assigned to this TL yet.</p>
                                        </div>
                                    ) : (
                                        assignedMembers.map(member => (
                                            <div key={member._id} className="p-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{member.name}</p>
                                                        <p className="text-[11px] font-medium text-slate-500">{member.email}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnassign(member._id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Unassign Member"
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Add Members Section */}
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/20">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Assign New Members</h3>
                                        {hierarchy.find(m => m._id === selectedTl)?.role !== 'TL' && hierarchy.find(m => m._id === selectedTl)?.subordinates.filter(s => s.role === 'TL').length! > 0 && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Assign To:</span>
                                                <select
                                                    value={assignTo || ""}
                                                    onChange={(e) => setAssignTo(e.target.value)}
                                                    className="bg-transparent text-[10px] font-black text-blue-600 border-none outline-none cursor-pointer hover:underline p-0"
                                                >
                                                    <option value={selectedTl || ""}>Directly to {employees.find(e => e._id === selectedTl)?.name} (Manager)</option>
                                                    {hierarchy.find(m => m._id === selectedTl)?.subordinates
                                                        .filter(s => s.role === 'TL')
                                                        .map(tl => (
                                                            <option key={tl._id} value={tl._id}>Team Leader: {tl.name}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search name or email..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium shadow-sm"
                                            />
                                        </div>
                                        <select
                                            value={roleFilter}
                                            onChange={(e) => setRoleFilter(e.target.value)}
                                            className="px-3 py-2 text-[11px] font-bold bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer shadow-sm text-slate-600 min-w-[100px]"
                                        >
                                            <option value="All">All Roles</option>
                                            <option value="TL">Team Leaders</option>
                                            <option value="Manager">Managers</option>
                                            <option value="Employee">Employees</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                    {unassignedMembers.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm font-medium">
                                            No more employees found to assign.
                                        </div>
                                    ) : (
                                        unassignedMembers.map(member => (
                                            <div key={member._id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs uppercase tracking-tighter">
                                                        {member.name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{member.name}</p>
                                                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{member.role}</span>
                                                            <span className="text-[10px] text-slate-400 tracking-tight">• {member.email}</span>
                                                            {member.reportingManager && (
                                                                <>
                                                                    <span className="text-slate-300 text-[10px]">•</span>
                                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/50">
                                                                        Reports to: {typeof member.reportingManager === 'object' ? member.reportingManager.name : member.reportingManager}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {member.teamLeader && (
                                                                <>
                                                                    <span className="text-slate-300 text-[10px]">•</span>
                                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">
                                                                        Assigned to TL: {typeof member.teamLeader === 'object' ? member.teamLeader.name : member.teamLeader}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAssign(member._id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-sm shadow-blue-100"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Assign
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
