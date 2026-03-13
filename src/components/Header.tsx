"use client";

import { Fragment, useState, useEffect, useRef, useCallback } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Bell, Search, User, ChevronDown, Settings, LogOut, Plus, UserPlus, CalendarPlus, Loader2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header({ title = "Dashboard" }: { title?: string }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchRef.current?.focus();
            searchRef.current?.select();
        }
        if (e.key === 'Escape') {
            setShowDropdown(false);
            setSearchQuery("");
            searchRef.current?.blur();
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                searchRef.current && !searchRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                setSearchResults(data.results || []);
                setShowDropdown(true);
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const userRole = (session?.user as any)?.role;
    const canViewOtherProfiles = ["Admin", "HR", "HR Manager", "Manager", "Assigned Manager", "TL"].includes(userRole);

    const handleResultClick = (href: string) => {
        if (!canViewOtherProfiles) return;
        setShowDropdown(false);
        setSearchQuery("");
        router.push(href);
    };

    return (
        <header className="h-16 bg-[#ffffff] border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <h2 className="text-[22px] font-semibold text-[#111827]">{title}</h2>
            </div>

            <div className="flex items-center gap-4 flex-1 max-w-xl mx-8">
                <div className="relative w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                    {searchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
                    )}
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                        placeholder="Search employees, documents, or settings..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all placeholder:text-gray-400"
                    />
                    {/* Search Results Dropdown */}
                    {mounted && showDropdown && (
                        <div
                            ref={dropdownRef}
                            className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                        >
                            {searchResults.length === 0 && !searchLoading ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-400 font-medium">
                                    No results for &ldquo;{searchQuery}&rdquo;
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {searchResults.map((result) => (
                                        <li key={result.id}>
                                            <button
                                                onMouseDown={() => handleResultClick(result.href)}
                                                disabled={!canViewOtherProfiles}
                                                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left group ${canViewOtherProfiles
                                                    ? "hover:bg-blue-50 cursor-pointer"
                                                    : "opacity-60 cursor-not-allowed"
                                                    }`}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm shrink-0">
                                                    {result.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700">{result.name}</p>
                                                    <p className="text-[11px] text-gray-400 font-medium truncate">{result.subtitle}</p>
                                                </div>
                                                {canViewOtherProfiles ? (
                                                    <span className="ml-auto text-[10px] font-bold text-blue-400 uppercase tracking-wider shrink-0">Employee</span>
                                                ) : (
                                                    <span className="ml-auto text-[10px] font-bold text-gray-300 uppercase tracking-wider shrink-0">No access</span>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Quick Add - Only for HR/Admin */}
                {mounted && ["Admin", "HR", "HR Manager", "Manager"].includes((session?.user as any)?.role) && (
                    <Menu as="div" className="relative hidden md:block">
                        <Menu.Button className="flex items-center gap-2 bg-[#1f6f8b] hover:bg-[#1a5d75] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95">
                            <Plus className="w-4 h-4" />
                            <span>Quick Add</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden z-20">
                                <div className="py-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link
                                                href="/employees?add=true"
                                                className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} flex items-center w-full px-4 py-2.5 text-sm font-semibold transition-colors`}
                                            >
                                                <UserPlus className="mr-3 h-4 w-4" />
                                                Add Employee
                                            </Link>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link
                                                href="/leave-tracker"
                                                className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} flex items-center w-full px-4 py-2.5 text-sm font-semibold transition-colors`}
                                            >
                                                <CalendarPlus className="mr-3 h-4 w-4" />
                                                Add Leave
                                            </Link>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                )}

                {/* Notifications */}
                {mounted && (
                    <Menu as="div" className="relative">
                        <Menu.Button className="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-all group focus:outline-none">
                            <Bell className="w-5 h-5 group-hover:scale-110" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden z-20">
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">New</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {/* Dummy notifications */}
                                    <div className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                                        <p className="text-sm font-semibold text-gray-800 leading-tight">New company policy updated</p>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Please review the new HR guidelines in the documents portal.</p>
                                        <p className="text-[10px] text-gray-400 mt-2 font-medium">2 hours ago</p>
                                    </div>
                                    <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                                        <p className="text-sm font-semibold text-gray-800 leading-tight">System maintenance scheduled</p>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Expect a 15-minute downtime tonight at 12:00 AM.</p>
                                        <p className="text-[10px] text-gray-400 mt-2 font-medium">5 hours ago</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 border-t border-gray-100 shrink-0 text-center">
                                    <Link
                                        href="/announcements"
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                        View all announcements
                                    </Link>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                )}

                {/* Profile Dropdown */}
                {mounted ? (
                    <Menu as="div" className="relative inline-block text-left pl-4 border-l border-gray-100">
                        <div>
                            <Menu.Button className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none">
                                <div className="w-9 h-9 bg-blue-100 text-[#1f6f8b] rounded-full flex items-center justify-center font-semibold shadow-sm text-sm">
                                    {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-sm font-semibold text-gray-800 leading-tight">{session?.user?.name || "User"}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{session?.user?.role || "Employee"}</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </Menu.Button>
                        </div>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden z-20">
                                <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                                    <p className="text-sm text-gray-900 truncate font-semibold">{session?.user?.name}</p>
                                    <p className="text-xs text-gray-500 truncate font-medium">{session?.user?.email || "No email"}</p>
                                </div>

                                <div className="py-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link
                                                href={`/employees/${session?.user?.id}`}
                                                className={`${active ? 'bg-blue-50 text-[#1f6f8b]' : 'text-gray-700'
                                                    } flex items-center px-5 py-2.5 text-sm font-semibold transition-colors`}
                                            >
                                                <User className="mr-3 h-4 w-4" />
                                                My Profile
                                            </Link>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                className={`${active ? 'bg-blue-50 text-[#1f6f8b]' : 'text-gray-700'
                                                    } flex items-center w-full px-5 py-2.5 text-sm font-semibold transition-colors`}
                                            >
                                                <Settings className="mr-3 h-4 w-4" />
                                                Settings
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>

                                <div className="py-1 border-t border-gray-100">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => signOut({ callbackUrl: '/login' })}
                                                className={`${active ? 'bg-rose-50 text-rose-700' : 'text-rose-600'
                                                    } flex items-center w-full px-5 py-2.5 text-sm font-bold transition-colors`}
                                            >
                                                <LogOut className="mr-3 h-4 w-4" />
                                                Sign out
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                ) : (
                    <div className="pl-4 border-l border-gray-100">
                        <div className="flex items-center gap-3 opacity-50">
                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="hidden sm:block text-left">
                                <div className="h-4 w-20 bg-gray-100 rounded mb-1 animate-pulse"></div>
                                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
