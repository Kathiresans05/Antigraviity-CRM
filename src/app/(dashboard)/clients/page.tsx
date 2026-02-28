"use client";

import { useState } from "react";
import { Search, Plus, Mail, Phone, MapPin, ExternalLink, Briefcase } from "lucide-react";

const MOCK_CLIENTS = [
    { id: 1, name: "Acme Corp", contactPerson: "John Doe", email: "john@acme.com", phone: "+1 234 567 8900", location: "New York, USA", activeProjects: 3, status: "Active" },
    { id: 2, name: "Stark Industries", contactPerson: "Tony Stark", email: "tony@stark.com", phone: "+1 987 654 3210", location: "Los Angeles, USA", activeProjects: 1, status: "Active" },
    { id: 3, name: "Wayne Enterprises", contactPerson: "Bruce Wayne", email: "bruce@wayne.com", phone: "+1 555 123 4567", location: "Gotham, USA", activeProjects: 0, status: "Inactive" },
];

export default function ClientsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>

                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto justify-center">
                    <Plus className="w-4 h-4" />
                    New Client
                </button>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {MOCK_CLIENTS.map((client) => (
                    <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                        {/* Card Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-blue-100">
                                    {client.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer">{client.name}</h3>
                                    <p className="text-sm text-gray-500">{client.contactPerson}</p>
                                </div>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${client.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {client.status}
                            </span>
                        </div>

                        {/* Card Body */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <a href={`mailto:${client.email}`} className="hover:text-blue-600 truncate">{client.email}</a>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{client.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{client.location}</span>
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <Briefcase className="w-4 h-4 text-blue-500" />
                                {client.activeProjects} Active Projects
                            </div>
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                View Profile <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
