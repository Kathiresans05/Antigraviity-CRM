"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Tag, Flag, Clock, User, MessageSquare, Briefcase, Mail, Phone, Building2, PencilLine, Trash2, CheckCircle2 } from "lucide-react";

interface Ticket {
    _id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    createdBy: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    assignedTo?: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    createdAt: string;
}

interface UserData {
    id: string;
    name: string;
    role: string;
    email: string;
}

export default function SupportTicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "General",
        priority: "Medium",
    });

    const [processing, setProcessing] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/support");
            setTickets(res.data.tickets);
            setIsAdmin(res.data.isAdmin);
        } catch (error) {
            console.error("Failed to fetch tickets", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await axios.post("/api/support", form);
            setIsAddModalOpen(false);
            setForm({ title: "", description: "", category: "General", priority: "Medium" });
            fetchData();
        } catch (error) {
            console.error("Error creating ticket", error);
            alert("Failed to create ticket.");
        } finally {
            setProcessing(false);
        }
    };

    const updateTicketStatus = async (id: string, newStatus: string) => {
        try {
            await axios.patch(`/api/support/${id}`, { status: newStatus });
            fetchData();
        } catch (error: any) {
            console.error("Error updating ticket", error);
            alert(error.response?.data?.error || "Failed to update ticket.");
        }
    };

    const deleteTicket = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete the ticket: ${title}?`)) return;
        try {
            await axios.delete(`/api/support/${id}`);
            fetchData();
        } catch (error: any) {
            console.error("Error deleting ticket", error);
            alert(error.response?.data?.error || "Failed to delete ticket.");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-amber-100 text-amber-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Resolved': return 'bg-emerald-100 text-emerald-800';
            case 'Closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Low': return 'text-gray-500';
            case 'Medium': return 'text-blue-500';
            case 'High': return 'text-orange-500';
            case 'Urgent': return 'text-red-600 font-bold';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Support Tickets</h1>
                    <p className="text-sm text-gray-500 mt-1">Submit help desk requests or report issues</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-5 h-5" />
                    New Ticket
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : tickets.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No support tickets found</h3>
                    <p className="text-gray-500 mt-1">You haven't submitted any tickets yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map((ticket) => (
                        <div key={ticket._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">

                            {/* Card Header */}
                            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-start bg-gray-50/50">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                        <span className={`text-xs ${getPriorityColor(ticket.priority)} flex items-center gap-1`}>
                                            <Flag className="w-3 h-3" />
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1" title={ticket.title}>
                                        {ticket.title}
                                    </h3>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => deleteTicket(ticket._id, ticket.title)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Delete Ticket"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-6 flex-1 flex flex-col">
                                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                                    {ticket.description}
                                </p>

                                <div className="mt-auto space-y-3 pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Tag className="w-4 h-4 text-gray-400" />
                                        <span>Category: <strong>{ticket.category}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span>From: {ticket.createdBy?.name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer (Actions) */}
                            {isAdmin && (
                                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                                    {ticket.status !== 'Resolved' && (
                                        <button
                                            onClick={() => updateTicketStatus(ticket._id, 'Resolved')}
                                            className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
                                            title="Mark as Resolved"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Resolve
                                        </button>
                                    )}
                                    {ticket.status === 'Open' && (
                                        <button
                                            onClick={() => updateTicketStatus(ticket._id, 'In Progress')}
                                            className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
                                            title="Mark as In Progress"
                                        >
                                            <Clock className="w-3.5 h-3.5" />
                                            Start Work
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    ))}
                </div>
            )}

            {/* Create Ticket Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Create Support Ticket</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Brief description of the issue"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Please provide as much clear information as possible..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        <option value="General">General</option>
                                        <option value="IT">IT & Tech</option>
                                        <option value="HR">HR & Admin</option>
                                        <option value="Facilities">Facilities</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <select
                                        value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                                >
                                    {processing ? "Submitting..." : "Submit Ticket"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
