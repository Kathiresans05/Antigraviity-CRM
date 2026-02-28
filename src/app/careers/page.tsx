"use client";

import { useState, useEffect } from "react";
import { Briefcase, MapPin, Clock, Search, Filter, ArrowRight } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function CareersPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await axios.get('/api/jobs/public');
                setJobs(res.data.jobs);
            } catch (err) {
                console.error("Failed to load jobs", err);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    const filtered = jobs.filter(j =>
        j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header / Hero */}
            <div className="bg-slate-900 text-white py-20 px-6">
                <div className="max-w-6xl mx-auto text-center">
                    <h1 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent italic">
                        JOIN OUR TEAM
                    </h1>
                    <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">
                        We are looking for passionate individuals to help us build the future of project management.
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-6xl mx-auto w-full px-6 -mt-10 mb-20 flex-1">
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-white">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by job title or department..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 px-4 py-2 bg-gray-50 rounded-xl">
                                <Briefcase className="w-4 h-4" />
                                {jobs.length} Openings
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filtered.length > 0 ? filtered.map(job => (
                                <Link
                                    href={`/careers/${job.id}`}
                                    key={job.id}
                                    className="group flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                                >
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-3 mb-2">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black uppercase tracking-wider">{job.department}</span>
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-wider">{job.jobType}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase italic">{job.title}</h3>
                                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-bold text-gray-500">
                                            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
                                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {job.experienceRequired}</span>
                                            <span className="text-gray-900">{job.salaryRange}</span>
                                        </div>
                                    </div>
                                    <div className="mt-6 md:mt-0 flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold group-hover:bg-blue-600 transition-colors">
                                        View Details <ArrowRight className="w-4 h-4" />
                                    </div>
                                </Link>
                            )) : (
                                <div className="text-center py-20">
                                    <p className="text-gray-400 font-bold text-lg italic">No active job openings found matching your search.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-500 py-10 px-6 mt-auto">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <span className="font-black text-white italic tracking-tighter text-xl">ANTIGRAVITY.</span>
                    <p className="text-sm font-medium">© 2026 Antigravity Careers. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
