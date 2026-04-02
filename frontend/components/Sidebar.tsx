"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard, Users, Briefcase, Bug, TicketCheck,
    BarChart2, Clock, Settings, LogOut, ChevronLeft,
    ChevronRight, ListTodo, Calendar, CheckSquare,
    DollarSign, TrendingUp, Bell, GraduationCap, FileText, Megaphone,
    User, HardDrive, UserPlus, ShieldCheck, ListFilter, Activity
} from "lucide-react";
import clsx from "clsx";
import { Dispatch, SetStateAction, useState, useEffect } from "react";

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: Dispatch<SetStateAction<boolean>>;
}

const ADMIN_LINKS = [
    {
        label: "Main",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Employees", href: "/employees", icon: Users },
            { name: "Onboarding", href: "/onboarding", icon: UserPlus },
            { name: "Attendance", href: "/attendance", icon: Clock },
            { name: "Team Attendance", href: "/team-attendance", icon: Users },
            { name: "Manage Teams", href: "/manage-teams", icon: Users },
            { name: "Leave Management", href: "/leave-tracker", icon: Calendar },
            { name: "Holidays", href: "/holidays", icon: Calendar },
        ]
    },
    {
        label: "Finance & Performance",
        items: [
            { name: "Payroll", href: "/payroll", icon: DollarSign },
            { name: "Performance", href: "/performance", icon: TrendingUp },
        ]
    },
    {
        label: "Resources",
        items: [
            { name: "Recruitment", href: "/recruitment", icon: GraduationCap },
            { name: "Documents", href: "/documents", icon: FileText },
            { name: "Announcements", href: "/announcements", icon: Megaphone },
            { name: "Daily Reports", href: "/daily-reports", icon: FileText },
            { name: "Reports", href: "/reports", icon: BarChart2 },
        ]
    },
    {
        label: "System",
        items: [
            { name: "Settings", href: "/settings", icon: Settings },
        ]
    },
    {
        label: "Workforce Monitoring",
        items: [
            { name: "Real-time Tracker", href: "/monitoring/team-activity", icon: Activity },
            { name: "Productivity Reports", href: "/monitoring/productivity", icon: BarChart2 },
            { name: "Activity Settings", href: "/monitoring/settings", icon: ShieldCheck },
            { name: "Compliance Audit", href: "/monitoring/audit", icon: ListFilter },
        ]
    }
];

const MANAGER_LINKS = [
    {
        label: "MAIN",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Team Overview", href: "/team-overview", icon: Users },
            { name: "Employees", href: "/employees", icon: Users },
            { name: "Attendance", href: "/attendance", icon: Clock },
            { name: "Team Attendance", href: "/team-attendance", icon: Users },
            { name: "Manage Teams", href: "/manage-teams", icon: Users },
            { name: "Leave Approvals", href: "/leave-approvals", icon: Calendar },
            { name: "Holidays", href: "/holidays", icon: Calendar },
        ]
    },
    {
        label: "WORK MANAGEMENT",
        items: [
            { name: "Projects", href: "/projects", icon: Briefcase },
            { name: "Tasks", href: "/tasks", icon: ListTodo },
            { name: "Daily Reports", href: "/daily-reports", icon: FileText },
            { name: "Team Performance", href: "/performance", icon: TrendingUp },
        ]
    },
    {
        label: "REPORTS",
        items: [
            { name: "Reports", href: "/reports", icon: BarChart2 },
            { name: "Team Activity", href: "/monitoring/team-activity", icon: Activity },
        ]
    },
    {
        label: "SYSTEM",
        items: [
            { name: "Announcements", href: "/announcements", icon: Megaphone },
            { name: "My Profile", href: "/profile", icon: User },
        ]
    }
];

const TL_LINKS = [
    {
        label: "Team Leader Panel",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "My Team", href: "/my-team", icon: Users },
            { name: "Projects", href: "/projects", icon: Briefcase },
            { name: "Tasks", href: "/tasks", icon: ListTodo },
            { name: "Daily Reports", href: "/daily-reports", icon: FileText },
            { name: "Attendance", href: "/attendance", icon: Clock },
            { name: "Team Attendance", href: "/team-attendance", icon: Users },
            { name: "Leave Tracker", href: "/leave-tracker", icon: Calendar },
            { name: "Leave Approvals", href: "/leave-approvals", icon: Calendar },
            { name: "Reports", href: "/reports", icon: BarChart2 },
            { name: "Meetings", href: "/meetings", icon: Users },
            { name: "Team Activity", href: "/monitoring/team-activity", icon: Activity },
        ]
    }
];

const EMPLOYEE_LINKS = (userId: string) => [

    {
        label: "Activities",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Projects", href: "/projects", icon: TicketCheck },
            { name: "Tasks", href: "/tasks", icon: ListTodo },
            { name: "Daily Tasks", href: "/daily-tasks", icon: CheckSquare },
            { name: "Daily Reports", href: "/daily-reports", icon: FileText },
            { name: "My Activity", href: "/monitoring/my-activity", icon: Activity },
        ]
    },
    {
        label: "Worklog",
        items: [
            { name: "Attendance", href: "/attendance", icon: Clock },
            { name: "Leave Tracker", href: "/leave-tracker", icon: Calendar },
            { name: "Meetings", href: "/meetings", icon: Users },
        ]
    },
    {
        label: "Support",
        items: [
            { name: "Support", href: "/support", icon: Bug },
            { name: "My Profile", href: userId ? `/employees/${userId}` : "#", icon: User },
        ]
    }
];

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userName = session?.user?.name || "User";
    const userEmail = session?.user?.email || "";

    let sections: any[] = [];
    if (mounted) {
        if (userRole === "TL") {
            sections = TL_LINKS;
        } else if (userRole === "Manager" || userRole === "Assigned Manager") {
            sections = MANAGER_LINKS;
        } else if (["Admin", "HR", "HR Manager"].includes(userRole!)) {
            sections = ADMIN_LINKS;
        } else {
            sections = EMPLOYEE_LINKS(userId);
        }
    }


    const handleLogout = async () => {
        try {
            const res = await fetch("/api/attendance");
            if (res.ok) {
                const data = await res.json();
                const todayRecord = data.records?.find((r: any) =>
                    new Date(r.date).toDateString() === new Date().toDateString() && !r.clockOutTime
                );
                if (todayRecord) {
                    alert("Please Clock Out and submit your work status before logging out!");
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to check attendance status", error);
        }
        signOut({ callbackUrl: "/login" });
    };

    return (
        <aside className={clsx(
            "flex flex-col h-screen fixed top-0 left-0 z-40 transition-all duration-300 ease-in-out",
            "bg-[#0f172a] shadow-2xl",
            collapsed ? "w-[72px]" : "w-[256px]"
        )}>
            {/* Header / Logo */}
            <div className={clsx(
                "h-20 flex items-center border-b border-white/[0.05] relative flex-shrink-0 transition-all duration-300",
                collapsed ? "justify-center" : "px-6"
            )}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                        <HardDrive className="text-white w-6 h-6" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-lg leading-none tracking-tight">Antigraviity</span>
                            <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Enterprise CRM</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={clsx(
                        "absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#1e293b] border border-white/10 text-gray-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-200 shadow-lg z-50",
                        collapsed && "rotate-180"
                    )}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
                {sections.map((section, idx) => (
                    <div key={section.label} className={clsx(idx !== 0 && "mt-5")}>
                        {!collapsed && (
                            <h3 className="px-4 mb-1.5 text-[10px] font-bold text-blue-200/70 uppercase tracking-[0.15em]">
                                {section.label}
                            </h3>
                        )}
                        <ul className="space-y-1">
                            {section.items.map((item: any) => {
                                const Icon = item.icon;

                                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                return (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className={clsx(
                                                "group flex items-center gap-3 rounded-xl transition-all duration-200 relative",
                                                collapsed ? "p-2.5 justify-center" : "px-3.5 py-2",
                                                isActive
                                                    ? "bg-[#1F6F8B] text-white font-semibold shadow-sm"
                                                    : "text-blue-100/70 hover:bg-[#1F6F8B]/50 hover:text-white"
                                            )}
                                        >
                                            <Icon className={clsx(
                                                "w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110",
                                                isActive ? "text-white" : "text-blue-100/70 group-hover:text-white"
                                            )} />
                                            {!collapsed && (
                                                <span className="text-[14px]">{item.name}</span>
                                            )}

                                            {/* Active Indicator */}
                                            {isActive && !collapsed && (
                                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                                            )}

                                            {/* Tooltip for collapsed mode */}
                                            {collapsed && (
                                                <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1e293b] text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50 shadow-xl border border-white/10">
                                                    {item.name}
                                                </div>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* User Profile Section */}
            <div className="mt-auto p-3 bg-white/[0.02] border-t border-white/[0.05]">
                <div className={clsx(
                    "flex items-center gap-2.5 transition-all duration-300",
                    collapsed ? "justify-center" : "px-1.5 py-1.5"
                )}>
                    <div className="relative group flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-[#1e293b] border border-white/10 flex items-center justify-center text-blue-400 font-bold shadow-inner text-sm">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0f172a] rounded-full"></div>
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-white text-xs font-semibold truncate leading-tight">{userName}</span>
                            <span className="text-blue-200/70 text-[10px] font-medium truncate uppercase tracking-wider mt-0.5">{userRole}</span>
                        </div>
                    )}


                    {!collapsed && (
                        <button
                            onClick={handleLogout}
                            className="p-2 text-blue-200/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors group"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                </div>

                {collapsed && (
                    <button
                        onClick={handleLogout}
                        className="mt-4 w-full flex justify-center p-3 text-blue-200/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors group"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                )}
            </div>
        </aside>
    );
}

