"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowLeft, Bell, FileText, Calendar,
    RefreshCw, Edit2, ChevronDown, Check, X
} from "lucide-react";
import axios from "axios";

export default function AboutMePage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const empId = Array.isArray(id) ? id[0] : id;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"personal" | "contact">("personal");
    const [approverOpen, setApproverOpen] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

    const userRole = (session?.user as any)?.role;
    const isAdmin = ["Admin", "HR", "HR Manager", "Manager"].includes(userRole);

    useEffect(() => {
        if (!session) return;
        fetchAboutData();
    }, [id, session]);

    const fetchAboutData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/employees/${id}/about`);
            if (!res.ok) throw new Error("Failed to load about details");
            const result = await res.json();
            setData(result);

            // Initialize edit form with flat structure
            setEditForm({
                salutation: result.personalDetails.salutation === "-" ? "" : result.personalDetails.salutation,
                firstName: result.personalDetails.firstName === "-" ? "" : result.personalDetails.firstName,
                middleName: result.personalDetails.middleName === "-" ? "" : result.personalDetails.middleName,
                lastName: result.personalDetails.lastName === "-" ? "" : result.personalDetails.lastName,
                gender: result.personalDetails.gender === "Not Specified" ? "" : result.personalDetails.gender,
                maritalStatus: result.personalDetails.maritalStatus === "Not Specified" ? "" : result.personalDetails.maritalStatus,
                bloodGroup: result.personalDetails.bloodGroup === "Not Specified" ? "" : result.personalDetails.bloodGroup,
                dob: result.personalDetails.dobRaw || "", // We'll need dobRaw from API
                nationality: result.personalDetails.nationality === "Not Specified" ? "" : result.personalDetails.nationality,
                countryOfBirth: result.personalDetails.countryOfBirth === "Not Specified" ? "" : result.personalDetails.countryOfBirth,
                stateOfBirth: result.personalDetails.stateOfBirth === "Not Specified" ? "" : result.personalDetails.stateOfBirth,
                placeOfBirth: result.personalDetails.placeOfBirth === "Not Specified" ? "" : result.personalDetails.placeOfBirth,
                phone: result.contactDetails.mobileNumber === "Not Provided" ? "" : result.contactDetails.mobileNumber,
                alternatePhone: result.contactDetails.alternateMobileNumber === "Not Provided" ? "" : result.contactDetails.alternateMobileNumber,
                residentialLandline: result.contactDetails.residentialLandline === "Not Provided" ? "" : result.contactDetails.residentialLandline,
                personalEmail: result.contactDetails.personalEmail === "Not Provided" ? "" : result.contactDetails.personalEmail,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await axios.patch(`/api/employees/${id}/about`, editForm);
            setIsEditing(false);
            fetchAboutData();
        } catch (err) {
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center mt-10 p-6 bg-red-50 text-red-600 rounded-lg">
                <p className="font-semibold text-lg">{error || "Data not found"}</p>
            </div>
        );
    }

    const { personalDetails, contactDetails, approvers } = data;

    const renderField = (label: string, value: string, name?: string, type: string = "text") => {
        const isEditable = name && isEditing;

        return (
            <div key={label} className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-50 last:border-0 min-h-[56px]">
                <span className="text-sm text-gray-500 sm:w-1/3 mb-1 sm:mb-0">{label}</span>
                {isEditable ? (
                    <div className="sm:w-2/3">
                        {type === "select" ? (
                            <select
                                value={editForm[name] || ""}
                                onChange={(e) => setEditForm({ ...editForm, [name]: e.target.value })}
                                className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-sm bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
                            >
                                <option value="">Select...</option>
                                {label === "Gender" && ["Male", "Female", "Other"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                {label === "Marital Status" && ["Single", "Married", "Divorced", "Widowed"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                {label === "Salutation" && ["Mr.", "Ms.", "Mrs.", "Dr."].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : (
                            <input
                                type={type}
                                value={editForm[name] || ""}
                                onChange={(e) => setEditForm({ ...editForm, [name]: e.target.value })}
                                className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-sm bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
                            />
                        )}
                    </div>
                ) : (
                    <span className="text-sm font-medium text-gray-800 sm:w-2/3">{value || "-"}</span>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto pb-12 bg-gray-50/50 min-h-screen">

            {/* 1. HEADER SECTION */}
            <header className="bg-white px-4 sm:px-6 py-4 flex items-center justify-between border-b border-gray-200 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">About Me</h1>
                </div>

            </header>

            {/* Profile Overview (Below Header) */}
            <div className="px-4 sm:px-6 py-6 pb-2 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4 align-middle">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold shadow-inner shrink-0">
                    {personalDetails.firstName.charAt(0)}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{personalDetails.salutation} {personalDetails.firstName} {personalDetails.lastName}</h2>
                    <p className="text-sm text-gray-500 font-mono mt-1">EMP-{empId?.slice(-6).toUpperCase()}</p>
                </div>
            </div>

            {/* 2. TAB SECTION (Pill Style) */}
            <div className="px-4 sm:px-6 my-6">
                <div className="flex flex-col sm:flex-row bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-full sm:w-fit mx-auto sm:mx-0">
                    <button
                        onClick={() => setActiveTab("personal")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "personal"
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        Personal Details
                    </button>
                    <button
                        onClick={() => setActiveTab("contact")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === "contact"
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-gray-600 hover:bg-gray-50"
                            }`}
                    >
                        Contact Details
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-4 sm:px-6 space-y-6">

                {/* 3 & 4. DETAILS CARD */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-800">
                            {activeTab === "personal" ? "Personal Details" : "Contact Details"}
                        </h3>
                        {isAdmin && (
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                                        >
                                            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => { setIsEditing(false); fetchAboutData(); }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-1.5 px-3 flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-xs font-bold border border-blue-100"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Update Details
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6">
                        {/* Smooth toggle using standard React conditional rendering, tailwind handles visual snaps */}
                        {activeTab === "personal" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 animate-in fade-in duration-300">
                                <div className="space-y-1">
                                    {renderField("Salutation", personalDetails.salutation, "salutation", "select")}
                                    {renderField("First Name", personalDetails.firstName, "firstName")}
                                    {renderField("Middle Name", personalDetails.middleName, "middleName")}
                                    {renderField("Last Name", personalDetails.lastName, "lastName")}
                                    {renderField("Gender", personalDetails.gender, "gender", "select")}
                                    {renderField("Marital Status", personalDetails.maritalStatus, "maritalStatus", "select")}
                                </div>
                                <div className="space-y-1">
                                    {renderField("Blood Group", personalDetails.bloodGroup, "bloodGroup")}
                                    {renderField("Date of Birth", personalDetails.dob, "dob", "date")}
                                    {renderField("Age", personalDetails.age)}
                                    {renderField("Nationality", personalDetails.nationality, "nationality")}
                                    {renderField("Country of Birth", personalDetails.countryOfBirth, "countryOfBirth")}
                                    {renderField("State of Birth", personalDetails.stateOfBirth, "stateOfBirth")}
                                    {renderField("Place of Birth", personalDetails.placeOfBirth, "placeOfBirth")}
                                </div>
                            </div>
                        )}

                        {activeTab === "contact" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 animate-in fade-in duration-300">
                                <div className="space-y-1">
                                    {renderField("Mobile Number", contactDetails.mobileNumber, "phone")}
                                    {renderField("Alternate Mobile", contactDetails.alternateMobileNumber, "alternatePhone")}
                                    {renderField("Residential Landline", contactDetails.residentialLandline, "residentialLandline")}
                                </div>
                                <div className="space-y-1">
                                    {renderField("Official Email", contactDetails.officialEmail)}
                                    {renderField("Personal Email", contactDetails.personalEmail, "personalEmail")}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. APPROVER SECTION (Accordion) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button
                        onClick={() => setApproverOpen(!approverOpen)}
                        className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none"
                    >
                        <h3 className="text-lg font-bold text-gray-800">Approvers</h3>
                        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${approverOpen ? "rotate-180" : ""}`} />
                    </button>

                    {approverOpen && (
                        <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300 border-t border-gray-50">
                            {approvers.length === 0 ? (
                                <p className="text-gray-500 text-sm py-4">No approvers assigned to this profile.</p>
                            ) : (
                                <div className="space-y-4">
                                    {approvers.map((approver: any, idx: number) => (
                                        <div key={idx} className="flex items-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-blue-50/30 transition-colors">
                                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0 mr-4">
                                                {approver.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-0.5">{approver.level}</p>
                                                <p className="text-base font-bold text-gray-900 truncate">{approver.name}</p>
                                                <p className="text-sm text-gray-500 truncate">{approver.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
