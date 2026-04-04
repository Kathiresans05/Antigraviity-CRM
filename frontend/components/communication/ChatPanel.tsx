"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Shield, Clock } from 'lucide-react';
import { useCommunication } from '@/frontend/context/CommunicationContext';
import { useSession } from 'next-auth/react';
import moment from 'moment';

const ChatPanel: React.FC = () => {
    const { messages, sendMessage, activeRoom } = useCommunication();
    const { data: session } = useSession();
    const [inputText, setInputText] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            sendMessage(inputText);
            setInputText("");
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const currentUserId = (session?.user as any)?.id;

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{activeRoom}</h3>
                        <p className="text-sm text-slate-500">Real-time collaboration</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 ring-4 ring-blue-50/50">
                        <Shield className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 opacity-50">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <Clock className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-medium">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender.id === currentUserId;
                        return (
                            <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{msg.sender.name}</span>
                                    <span className="text-[10px] text-slate-400">{moment(msg.createdAt).format('h:mm A')}</span>
                                </div>
                                <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                    isMe 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200/50'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-6 bg-slate-50/50 border-t border-slate-100">
                <div className="relative group">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-700 font-medium placeholder:text-slate-400 shadow-sm group-hover:border-slate-300"
                    />
                    <button 
                        type="submit"
                        disabled={!inputText.trim()}
                        className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="mt-3 text-[10px] text-center text-slate-400 font-medium">Messages are secure and internal only</p>
            </form>
        </div>
    );
};

export default ChatPanel;
