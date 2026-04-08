"use client";

import { useState, useEffect } from "react";
import { Camera, Search, Filter, Calendar, Maximize2, User, Clock, ChevronLeft, ChevronRight, Monitor } from "lucide-react";
import clsx from "clsx";

export default function ScreenshotViewerPage() {
    const [screenshots, setScreenshots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<any>(null);
    const [filterUser, setFilterUser] = useState("");

    const COMM_URL = process.env.NEXT_PUBLIC_COMMUNICATION_URL || "http://localhost:3001";

    const fetchScreenshots = async () => {
        try {
            const res = await fetch(`${COMM_URL}/api/monitoring/screenshots`);
            const data = await res.json();
            if (data.success) {
                setScreenshots(data.screenshots || []);
            }
        } catch (err) {
            console.error("Failed to fetch screenshots:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScreenshots();
    }, []);

    const filteredShots = screenshots.filter(s => 
        s.employeeName.toLowerCase().includes(filterUser.toLowerCase()) ||
        s.userId.toLowerCase().includes(filterUser.toLowerCase())
    );

    if (loading) return <div className="p-12 text-center text-gray-400 animate-pulse font-bold uppercase tracking-widest">Scanning Remote Desktop Captures...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-rose-50 rounded-2xl text-rose-600 shadow-sm">
                        <Camera className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Desktop Screenshot Viewer</h2>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 shrink-0">Visual Compliance Audit Log</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                            className="pl-12 pr-6 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all w-full md:w-80"
                        />
                    </div>
                </div>
            </div>

            {filteredShots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredShots.map((shot) => (
                        <div 
                            key={shot._id} 
                            className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-rose-500/5 transition-all cursor-pointer relative"
                            onClick={() => setSelectedImage(shot)}
                        >
                            <div className="aspect-video relative overflow-hidden bg-gray-100">
                                <img 
                                    src={shot.imageUrl} 
                                    alt={`Capture from ${shot.employeeName}`} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <div className="flex items-center gap-2 text-white font-bold text-[10px] uppercase tracking-widest">
                                        <Maximize2 className="w-3 h-3" />
                                        Enlarge Preview
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-gray-900 truncate">{shot.employeeName}</h3>
                                    <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                                        {new Date(shot.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    <Monitor className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{shot.activeApp}</span>
                                </div>
                                <p className="text-[10px] text-gray-300 italic truncate">{shot.windowTitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] py-32 flex flex-col items-center justify-center text-gray-400 border border-gray-100 border-dashed">
                    <Camera className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">No desktop captures match your criteria.</p>
                </div>
            )}

            {/* Lightbox / Preview Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 transition-all animate-in fade-in zoom-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className="max-w-6xl w-full bg-[#111] rounded-3xl overflow-hidden shadow-2xl relative border border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl font-black text-white">
                                    {selectedImage.employeeName.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-white font-black text-lg leading-none">{selectedImage.employeeName}</h2>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                                        Captured at {new Date(selectedImage.capturedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="w-10 h-10 rounded-full bg-white/5 text-white hover:bg-rose-600 transition-all flex items-center justify-center"
                            >
                                <Maximize2 className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <div className="p-2">
                             <img 
                                src={selectedImage.imageUrl} 
                                alt="Full screenshot" 
                                className="w-full h-auto rounded-2xl shadow-inner border border-white/5"
                             />
                        </div>
                        <div className="p-6 bg-white/5 flex items-center justify-between text-white/50 text-[10px] font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-2"><Monitor className="w-3 h-3" /> {selectedImage.activeApp}</span>
                                <span className="opacity-30">|</span>
                                <span className="truncate max-w-md">{selectedImage.windowTitle}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
