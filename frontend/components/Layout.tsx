"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";
import ConsentModal from "./monitoring/ConsentModal";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const getPageTitle = (path: string) => {
        const slug = path.split('/')[1];
        if (!slug) return "Dashboard";
        const map: Record<string, string> = {
            dashboard: "Dashboard",
            attendance: "Attendance",
            leads: "Leads",
            clients: "Clients",
            projects: "Projects",
            tasks: "Tasks",
            "daily-tasks": "Daily Tasks",
            "leave-tracker": "Leave Tracker",
            meetings: "Meetings",
        };
        return map[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
    };

    return (
        <SessionProvider>
            <div className="flex h-screen bg-[#f4f6f9] overflow-hidden">
                <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
                <div
                    className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
                    style={{ marginLeft: collapsed ? "72px" : "256px" }}
                >
                    <Header title={getPageTitle(pathname)} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                        <div className="max-w-7xl mx-auto w-full">
                            {children}
                        </div>
                    </main>
                    <ConsentModal />
                </div>
            </div>
        </SessionProvider>
    );
}
