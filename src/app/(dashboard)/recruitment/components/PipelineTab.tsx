"use client";

import { useState } from "react";
import { Search, Star, MessageSquare } from "lucide-react";
import clsx from "clsx";
import axios from "axios";

const STAGES = ['Applied', 'Screening', 'Interview Round 1', 'Interview Round 2', 'HR Round', 'Offered', 'Hired', 'Rejected'];

export default function PipelineTab({ applicants, onRefresh }: { applicants: any[], onRefresh: () => void }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

    const filtered = applicants.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleDragStart = (e: any, id: string) => { setDraggedAppId(id); e.dataTransfer.effectAllowed = "move"; };
    const handleDragOver = (e: any) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
    const handleDrop = async (e: any, newStage: string) => {
        e.preventDefault();
        if (!draggedAppId) return;
        const app = applicants.find(a => a.id === draggedAppId);
        if (app && app.stage !== newStage) {
            try { await axios.patch('/api/applicants', { id: draggedAppId, stage: newStage }); onRefresh(); } catch (err) { console.error(err); }
        }
        setDraggedAppId(null);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6">
                <div className="relative inline-block w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search applicants..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
                    {STAGES.map(stage => {
                        const stageApps = filtered.filter(a => a.stage === stage);
                        return (
                            <div key={stage} className="w-[300px] flex flex-col bg-gray-50 rounded-2xl p-4 border border-gray-100"
                                onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage)}>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-gray-800 text-sm">{stage}</h4>
                                    <span className="bg-white text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{stageApps.length}</span>
                                </div>
                                <div className="space-y-3 flex-1 overflow-y-auto min-h-[150px]">
                                    {stageApps.map(app => (
                                        <div key={app.id} draggable onDragStart={(e) => handleDragStart(e, app.id)}
                                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900 leading-tight">{app.name}</p>
                                                    <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{app.jobTitle}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Star className={clsx("w-3 h-3 text-amber-400", app.rating > 0 && "fill-amber-400")} />
                                                    <span className="text-xs font-bold">{app.rating > 0 ? app.rating.toFixed(1) : '-'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {app.skills.slice(0, 3).map((s: string, i: number) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">{s}</span>
                                                ))}
                                                {app.skills.length > 3 && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">+{app.skills.length - 3}</span>}
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400 mt-2 pt-3 border-t border-gray-50">
                                                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {app.experienceYears}y exp</span>
                                                <span>{app.applied}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {stageApps.length === 0 && (
                                        <div className="border border-dashed border-gray-300 rounded-xl h-24 flex items-center justify-center text-xs font-semibold text-gray-400 bg-white/50">
                                            Drop here
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
