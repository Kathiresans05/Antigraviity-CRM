"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Briefcase, MapPin, Clock, ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await axios.get(`/api/jobs/public/${params.id}`);
                setJob(res.data);
            } catch (err: any) {
                console.error("Job load error", err);
                setError(err.response?.data?.error || "An unexpected error occurred.");
            } finally {
                setLoading(false);
            }
        };
        if (params.id) fetchJob();
    }, [params.id]);

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!job) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-black text-gray-900 mb-4 uppercase italic">Job Not Found</h1>
            <p className="text-gray-500 font-bold mb-4 max-w-md">
                {error || "The job posting you are looking for has expired or does not exist."}
            </p>
            {error && (
                <div className="mb-8 p-4 bg-gray-100 rounded-xl text-[10px] font-mono text-left max-w-xs overflow-auto">
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                </div>
            )}
            <Link href="/careers" className="px-6 py-3 bg-[#1F6F8B] text-white rounded-xl text-sm font-bold flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Careers
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 py-6 px-6 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 text-sm font-bold transition-colors uppercase tracking-tight">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <span className="font-black text-gray-900 italic tracking-tighter text-lg">ANTIGRAVITY.</span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-10">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black uppercase tracking-wider">{job.department}</span>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-wider">{job.jobType}</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase italic leading-tight mb-6">{job.title}</h1>
                        <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-gray-500">
                            <span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500" /> {job.location}</span>
                            <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-500" /> {job.experienceRequired}</span>
                            <span className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg text-gray-900 italic">💰 {job.salaryRange}</span>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none">
                        <h2 className="text-xl font-black text-gray-900 uppercase italic border-b-4 border-blue-600 inline-block mb-6">Responsibilities</h2>
                        <div className="text-gray-600 font-medium leading-relaxed whitespace-pre-line bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            {job.responsibilities}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase italic border-b-4 border-emerald-600 inline-block mb-6">Required Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {job.skills.map((skill: string) => (
                                <span key={skill} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase italic border-b-4 border-blue-600 inline-block mb-6">Benefits & Perks</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {job.benefits?.split(',').map((benefit: string) => (
                                <div key={benefit} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <span className="text-sm font-bold text-gray-700">{benefit.trim()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar / Application */}
                <div className="md:col-start-3">
                    <div className="bg-[#1F6F8B] text-white rounded-3xl p-8 sticky top-28 shadow-2xl">
                        <h3 className="text-2xl font-black mb-2 italic uppercase">Interested?</h3>
                        <p className="text-slate-400 text-sm font-medium mb-8">Help us reach the escape velocity of innovation.</p>

                        <div className="space-y-4">
                            <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-base font-black uppercase italic tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                Apply Now
                            </button>
                            <button onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert("Job link copied to clipboard!");
                            }} className="w-full py-4 bg-[#1e293b] hover:bg-slate-700 text-slate-300 rounded-2xl text-sm font-bold transition-all">
                                Copy Share Link
                            </button>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-800">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Hiring Process</h4>
                            <div className="space-y-4">
                                {['Application Review', 'Technical Round', 'HR Interview'].map((step, i) => (
                                    <div key={step} className="flex items-center gap-4">
                                        <span className="w-6 h-6 rounded-full bg-[#1e293b] text-xs font-black flex items-center justify-center border border-slate-700">{i + 1}</span>
                                        <span className="text-xs font-bold text-slate-400">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
