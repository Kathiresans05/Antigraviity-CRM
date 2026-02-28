"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

import DashboardTab from "./components/DashboardTab";
import JobsTab from "./components/JobsTab";
import ManpowerTab from "./components/ManpowerTab";
import PipelineTab from "./components/PipelineTab";

const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'jobs', label: 'Job Openings' },
    { id: 'manpower', label: 'Manpower Requests' },
    { id: 'pipeline', label: 'Candidate Pipeline' },
];

export default function RecruitmentPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    const [stats, setStats] = useState<any>(null);
    const [jobs, setJobs] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [applicants, setApplicants] = useState<any[]>([]);

    const userRole = (session?.user as any)?.role;
    const isAdmin = ['Admin', 'HR', 'HR Manager'].includes(userRole);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, jobsRes, reqRes, appsRes] = await Promise.all([
                axios.get('/api/recruitment/stats'),
                axios.get('/api/jobs'),
                axios.get('/api/manpower'),
                axios.get('/api/applicants')
            ]);
            setStats(statsRes.data);
            setJobs(jobsRes.data.jobs);
            setRequests(reqRes.data.requests);
            setApplicants(appsRes.data.applicants);
        } catch (err) {
            console.error('Data load error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="space-y-6 pb-10 min-h-screen flex flex-col">
            {/* Header & Tabs */}
            <div className="flex flex-col gap-5 border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-[26px] font-bold text-gray-900 tracking-tight">Recruitment CRM</h2>
                    <p className="text-sm font-medium text-gray-500">Manage jobs, manpower requests, and hiring pipelines</p>
                </div>
                <div className="flex gap-6 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "pb-3 text-sm font-bold whitespace-nowrap transition-colors relative",
                                activeTab === tab.id ? "text-blue-600" : "text-gray-500 hover:text-gray-800"
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <span className="absolute bottom-[-17px] left-0 w-full h-1 bg-blue-600 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-gray-500 font-semibold text-sm">Loading Live Data...</p>
                </div>
            ) : (
                <div className="flex-1 transition-all duration-300">
                    {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
                    {activeTab === 'jobs' && <JobsTab jobs={jobs} isAdmin={isAdmin} onRefresh={fetchData} />}
                    {activeTab === 'manpower' && <ManpowerTab requests={requests} isAdmin={isAdmin} onRefresh={fetchData} />}
                    {activeTab === 'pipeline' && <PipelineTab applicants={applicants} onRefresh={fetchData} />}
                </div>
            )}
        </div>
    );
}
