"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User, Briefcase, DollarSign, FileText, Monitor, ShieldCheck,
    CheckCircle2, ChevronRight, ChevronLeft, Upload, Send,
    Plus, Search, Bell, SearchCode, Mail, Phone, Calendar,
    UserCircle, MapPin, Building2, CreditCard, Key, FileCheck, Check
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { useEffect } from "react";

/* ─── Zoho-style Colors & Config ────────────────────────────────── */
const STEPS = [
    { title: "Basic Information", icon: User },
    { title: "Job Details", icon: Briefcase },
    { title: "Salary & Payroll", icon: DollarSign },
    { title: "Document Upload", icon: Upload },
    { title: "System Access", icon: Monitor },
    { title: "Policies", icon: ShieldCheck },
    { title: "Review & Activate", icon: CheckCircle2 }
];

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Step 1: Basic
        salutation: "Mr.", firstName: "", middleName: "", lastName: "", email: "", phone: "", gender: "Male", dob: "",
        bloodGroup: "", maritalStatus: "Single", nationality: "Indian", address: "",
        // Step 2: Job
        designation: "", department: "", joinDate: "", reportingManager: "", probationPeriod: "6",
        employeeCode: "", // Manual Employee ID
        role: "Employee", employmentType: "Full-time",
        // Step 3: Salary
        currency: "INR", basePay: "", bankName: "", accountNumber: "", ifscCode: "",
        pfAccount: "", esiAccount: "",
        basicSalary: "", hra: "", conveyance: "",
        pfEmployee: "", esiEmployee: "", professionalTax: "",
        pfEmployer: "", esiEmployer: "",
        // Step 4: Contact & Birth (New/Expanded)
        personalEmail: "", alternatePhone: "", residentialLandline: "",
        emergencyContactName: "", emergencyContactNumber: "",
        countryOfBirth: "India", stateOfBirth: "", placeOfBirth: "",
        // Step 5: Access
        modules: ["Dashboard", "Attendance"],
        password: "", // Manual Password
        confirmPassword: "", // Confirm Password
        // Step 6: Policies
        agreedToNDA: false, agreedToConduct: false,
    });

    const [stats, setStats] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File }>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, usersRes] = await Promise.all([
                    fetch('/api/onboarding/stats'),
                    fetch('/api/users')
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (usersRes.ok) {
                    const userData = await usersRes.json();
                    // Filter for potential managers and normalize IDs
                    const managersList = (userData.users || []).filter((u: any) =>
                        ['Admin', 'HR', 'HR Manager', 'Manager', 'TL'].includes(u.role)
                    ).map((u: any) => ({
                        ...u,
                        _id: u._id || u.id // Ensure _id is always present
                    }));
                    setUsers(managersList);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoadingStats(false);
                setLoadingUsers(false);
            }
        };
        fetchData();
    }, []);

    const saveDraft = async (manualOnboardingStatus?: string) => {
        // Only save if we have name and email
        if (!formData.firstName || !formData.lastName || !formData.email) {
            return false;
        }

        try {
            const payload = {
                ...formData,
                name: `${formData.firstName} ${formData.lastName}`,
                onboardingStatus: manualOnboardingStatus || "In Progress",
                address: formData.address,
                employmentType: formData.employmentType,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode,
                salaryDetails: {
                    basePay: Number(formData.basePay) || 0,
                    basicSalary: Number(formData.basicSalary) || 0,
                    hra: Number(formData.hra) || 0,
                    conveyance: Number(formData.conveyance) || 0,
                    pfEmployee: Number(formData.pfEmployee) || 0,
                    esiEmployee: Number(formData.esiEmployee) || 0,
                    professionalTax: Number(formData.professionalTax) || 0,
                    pfEmployer: Number(formData.pfEmployer) || 0,
                    esiEmployer: Number(formData.esiEmployer) || 0,
                }
            };

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            return res.ok;
        } catch (error) {
            console.error("Draft save error:", error);
            return false;
        }
    };

    const nextStep = async () => {
        // For Step 1, we must have basic info before saving draft
        if (currentStep === 1) {
            if (!formData.firstName || !formData.lastName || !formData.email) {
                toast.error("Please fill in mandatory fields before proceeding");
                return;
            }
        }

        // Show a small "Saving..." toast for draft progress
        const savePromise = saveDraft();

        setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    };
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleInputChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const activateEmployee = async () => {
        if (!formData.firstName || !formData.lastName || !formData.email) {
            toast.error("Please fill in all mandatory basic information.");
            setCurrentStep(1);
            return;
        }

        if (!formData.employeeCode) {
            toast.error("Employee ID is required.");
            setCurrentStep(2);
            return;
        }

        if (!formData.password || formData.password !== formData.confirmPassword) {
            toast.error("Passwords must match.");
            setCurrentStep(5);
            return;
        }

        setIsSubmitting(true);
        const submitToast = toast.loading("Uploading documents & submitting...");

        try {
            const docsUrls: any = {};
            for (const [docName, file] of Object.entries(uploadedFiles)) {
                const docForm = new FormData();
                docForm.append("file", file);
                docForm.append("category", "Employee Records");

                // Construct custom name to identify employee in Document Center
                const employeeName = `${formData.firstName} ${formData.lastName}`.trim();
                docForm.append("customName", `${employeeName} - ${docName}`);
                docForm.append("employeeName", employeeName);

                const upRes = await fetch("/api/documents", { method: "POST", body: docForm });
                if (upRes.ok) {
                    const upData = await upRes.json();
                    if (docName === "Aadhar Card") docsUrls.aadharCard = upData.fileUrl;
                    if (docName === "PAN Card") docsUrls.panCard = upData.fileUrl;
                    if (docName === "Resume") docsUrls.resume = upData.fileUrl;
                    if (docName === "Offer Letter") docsUrls.offerLetter = upData.fileUrl;
                    if (docName === "Certificates") docsUrls.certificates = upData.fileUrl;
                } else {
                    const errData = await upRes.json().catch(() => ({}));
                    toast.error(`Failed to upload ${docName}: ${errData.details || errData.error || "Unknown error"}`);
                    setIsSubmitting(false);
                    toast.dismiss(submitToast);
                    return;
                }
            }

            const payload = {
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                gender: formData.gender,
                dob: formData.dob ? new Date(formData.dob) : undefined,
                department: formData.department,
                joinDate: formData.joinDate ? new Date(formData.joinDate) : undefined,
                probationPeriod: formData.probationPeriod ? parseInt(formData.probationPeriod) : undefined,
                employeeCode: formData.employeeCode, // Manual ID
                address: formData.address,
                employmentType: formData.employmentType,
                bankName: formData.bankName,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode,
                pfAccount: formData.pfAccount,
                esiAccount: formData.esiAccount,
                documents: docsUrls,
                salaryDetails: {
                    basePay: Number(formData.basePay) || 0,
                    basicSalary: Number(formData.basicSalary) || 0,
                    hra: Number(formData.hra) || 0,
                    conveyance: Number(formData.conveyance) || 0,
                    pfEmployee: Number(formData.pfEmployee) || 0,
                    esiEmployee: Number(formData.esiEmployee) || 0,
                    professionalTax: Number(formData.professionalTax) || 0,
                    pfEmployer: Number(formData.pfEmployer) || 0,
                    esiEmployer: Number(formData.esiEmployer) || 0,
                },
                password: formData.password, // Manual password
                role: formData.role,
                designation: formData.designation,
                reportingManager: formData.reportingManager || undefined,
                onboardingStatus: "Pending Approval", // Ensure it goes to pending approval
                // New Fields
                salutation: formData.salutation,
                middleName: formData.middleName,
                bloodGroup: formData.bloodGroup,
                maritalStatus: formData.maritalStatus,
                nationality: formData.nationality,
                personalEmail: formData.personalEmail,
                alternatePhone: formData.alternatePhone,
                residentialLandline: formData.residentialLandline,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactNumber: formData.emergencyContactNumber,
                countryOfBirth: formData.countryOfBirth,
                stateOfBirth: formData.stateOfBirth,
                placeOfBirth: formData.placeOfBirth,
            };

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Employee submitted for approval!", { id: submitToast });
                // Reset form
                setCurrentStep(1);
                setFormData({
                    salutation: "Mr.", firstName: "", middleName: "", lastName: "", email: "", phone: "", gender: "Male", dob: "",
                    bloodGroup: "", maritalStatus: "Single", nationality: "Indian", address: "",
                    designation: "", department: "", joinDate: "", reportingManager: "", probationPeriod: "6",
                    employeeCode: "",
                    currency: "INR", basePay: "", bankName: "", accountNumber: "", ifscCode: "",
                    pfAccount: "", esiAccount: "",
                    basicSalary: "", hra: "", conveyance: "",
                    pfEmployee: "", esiEmployee: "", professionalTax: "",
                    pfEmployer: "", esiEmployer: "",
                    role: "Employee", employmentType: "Full-time",
                    personalEmail: "", alternatePhone: "", residentialLandline: "",
                    emergencyContactName: "", emergencyContactNumber: "",
                    countryOfBirth: "India", stateOfBirth: "", placeOfBirth: "",
                    modules: ["Dashboard", "Attendance"],
                    password: "", confirmPassword: "",
                    agreedToNDA: false, agreedToConduct: false,
                });
                setUploadedFiles({});

                // Refresh stats
                const statsRes = await fetch('/api/onboarding/stats');
                if (statsRes.ok) setStats(await statsRes.json());
            } else {
                toast.error(data.error || "Failed to create employee.", { id: submitToast });
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An unexpected error occurred.", { id: submitToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-[#f1f5f9] -m-6">
            {/* ─── Top Stats (Zoho Flat & Compact) ────────────────── */}
            <div className="flex items-center gap-4 p-6 pt-8 overflow-x-auto selection:bg-[#1F6F8B]/10">
                {(!loadingStats && stats.length > 0) ? stats.map((stat, i) => {
                    const icons = [UserCircle, Calendar, CheckCircle2, ShieldCheck];
                    const colors = ["text-[#1F6F8B]", "text-amber-600", "text-emerald-600", "text-indigo-600"];
                    const bgs = ["bg-blue-50/50", "bg-amber-50/50", "bg-emerald-50/50", "bg-indigo-50/50"];
                    const Icon = icons[i] || UserCircle;

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex-1 min-w-[240px] bg-white p-4 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-4 group"
                        >
                            <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all", bgs[i])}>
                                <Icon className={clsx("w-5 h-5", colors[i])} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                <h3 className="text-xl font-bold text-slate-900 leading-none">{stat.value}</h3>
                            </div>
                        </motion.div>
                    );
                }) : (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="flex-1 min-w-[240px] bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 animate-pulse">
                            <div className="w-10 h-10 rounded-lg bg-slate-100"></div>
                            <div className="space-y-2">
                                <div className="h-2 w-20 bg-slate-100 rounded"></div>
                                <div className="h-4 w-12 bg-slate-100 rounded"></div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ─── Main Onboarding Interface ──────────────────────── */}
            <div className="flex-1 px-8 pb-8 overflow-hidden">
                <div className="bg-white h-full rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

                    {/* Integrated Progress Header */}
                    <div className="bg-white border-b border-slate-200">
                        <div className="flex items-center px-8 py-5 overflow-x-auto border-b border-slate-100">
                            {STEPS.map((step, idx) => {
                                const stepNum = idx + 1;
                                const isActive = currentStep === stepNum;
                                const isCompleted = currentStep > stepNum;

                                return (
                                    <div key={step.title} className="flex items-center flex-shrink-0 last:flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                                                isActive ? "bg-[#1F6F8B] text-white ring-4 ring-[#1F6F8B]/10" :
                                                    isCompleted ? "bg-emerald-500 text-white" :
                                                        "bg-white border border-slate-300 text-slate-400"
                                            )}>
                                                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                                            </div>
                                            <div className="flex flex-col pr-6">
                                                <span className={clsx(
                                                    "text-[11px] font-bold uppercase tracking-wider whitespace-nowrap",
                                                    isActive ? "text-[#1F6F8B]" : isCompleted ? "text-emerald-600" : "text-slate-400"
                                                )}>{step.title}</span>
                                            </div>
                                        </div>
                                        {idx !== STEPS.length - 1 && (
                                            <div className="w-10 h-[1px] bg-slate-200 mr-6 flex-shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 overflow-y-auto p-8 lg:px-16 lg:py-10 bg-[#f8fafc]/50">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-4xl mx-auto"
                            >
                                {currentStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="mb-6">
                                            <h2 className="text-lg font-bold text-slate-900">Basic Information</h2>
                                            <p className="text-xs text-slate-500 mt-1">Fields marked with <span className="text-rose-500">*</span> are mandatory.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Salutation</label>
                                                <select name="salutation" value={formData.salutation} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs bg-white">
                                                    <option>Mr.</option>
                                                    <option>Ms.</option>
                                                    <option>Mrs.</option>
                                                    <option>Dr.</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">First Name <span className="text-rose-500">*</span></label>
                                                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="John" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Middle Name</label>
                                                <input type="text" name="middleName" value={formData.middleName} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="Quincy" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Last Name <span className="text-rose-500">*</span></label>
                                                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="Doe" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Gender</label>
                                                <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs bg-white">
                                                    <option>Male</option>
                                                    <option>Female</option>
                                                    <option>Other</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Date of Birth</label>
                                                <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Blood Group</label>
                                                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs bg-white">
                                                    <option value="">Select...</option>
                                                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Marital Status</label>
                                                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs bg-white">
                                                    <option>Single</option>
                                                    <option>Married</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Nationality</label>
                                                <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="e.g. Indian" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Work Email <span className="text-rose-500">*</span></label>
                                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="john.doe@email.com" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Mobile Number</label>
                                                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="+91 XXXX XXXX" />
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-100">
                                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Birth Details</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-slate-600">Country of Birth</label>
                                                    <input type="text" name="countryOfBirth" value={formData.countryOfBirth} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="India" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-slate-600">State of Birth</label>
                                                    <input type="text" name="stateOfBirth" value={formData.stateOfBirth} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="Tamil Nadu" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-slate-600">Place of Birth</label>
                                                    <input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="Chennai" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="mb-6">
                                            <h2 className="text-lg font-bold text-slate-900">Experience & Job Info</h2>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Designation</label>
                                                <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs" placeholder="e.g. Lead Designer" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Department</label>
                                                <select name="department" value={formData.department} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs bg-white">
                                                    <option value="">Select dept...</option>
                                                    <option value="Engineering">Engineering</option>
                                                    <option value="Design">Design</option>
                                                    <option value="Product">Product</option>
                                                    <option value="Marketing">Marketing</option>
                                                    <option value="HR">HR</option>
                                                    <option value="Sales">Sales</option>
                                                    <option value="Finance">Finance</option>
                                                    <option value="Support">Support</option>
                                                    <option value="Operations">Operations</option>
                                                    <option value="Information Technology (IT)">Information Technology (IT)</option>
                                                    <option value="DevOps">DevOps</option>
                                                    <option value="Cybersecurity">Cybersecurity</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Joining Date</label>
                                                <input type="date" name="joinDate" value={formData.joinDate} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Probation Period (Months)</label>
                                                <input type="number" name="probationPeriod" value={formData.probationPeriod || "6"} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Employee ID <span className="text-rose-500">*</span></label>
                                                <input type="text" name="employeeCode" value={formData.employeeCode} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-[#1F6F8B]/30 bg-blue-50/10 outline-none text-xs" placeholder="e.g. EMP-101" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Employment Type <span className="text-rose-500">*</span></label>
                                                <select
                                                    name="employmentType"
                                                    value={formData.employmentType}
                                                    onChange={handleInputChange}
                                                    className="w-full h-10 px-3 rounded-md border border-[#1F6F8B]/30 bg-blue-50/20 outline-none text-xs transition-all focus:border-[#1F6F8B]"
                                                >
                                                    <option value="Full-time">Full-time</option>
                                                    <option value="Intern">Intern</option>
                                                    <option value="Contract">Contract</option>
                                                    <option value="Freelance">Freelance</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">System Role <span className="text-rose-500">*</span></label>
                                                <select
                                                    name="role"
                                                    value={formData.role}
                                                    onChange={handleInputChange}
                                                    className="w-full h-10 px-3 rounded-md border border-[#1F6F8B]/30 bg-blue-50/20 outline-none text-xs transition-all focus:border-[#1F6F8B]"
                                                >
                                                    <option value="Employee">Standard Employee</option>
                                                    <option value="Manager">Standard Manager</option>
                                                    <option value="TL">Team Lead (TL)</option>
                                                    <option value="HR">HR Executive</option>
                                                    <option value="Admin">Administrator</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Reporting Manager</label>
                                                <select
                                                    name="reportingManager"
                                                    value={formData.reportingManager}
                                                    onChange={handleInputChange}
                                                    className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs bg-white"
                                                >
                                                    <option value="">Select Manager...</option>
                                                    {users.map(u => (
                                                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                                                    ))}
                                                </select>
                                                {loadingUsers && <p className="text-[9px] text-[#1F6F8B] animate-pulse mt-1">Fetching managers list...</p>}
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-100">
                                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Contact & Emergency Details</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-slate-600">Personal Email</label>
                                                    <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="personal@email.com" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-slate-600">Alternate Mobile</label>
                                                    <input type="tel" name="alternatePhone" value={formData.alternatePhone} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="+91 XXXX XXXX" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-slate-600">Residential Landline</label>
                                                    <input type="tel" name="residentialLandline" value={formData.residentialLandline} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="044-XXXXXXX" />
                                                </div>
                                                <div className="space-y-1.5 md:col-span-2">
                                                    <label className="text-[12px] font-semibold text-slate-600">Current Address</label>
                                                    <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2} className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs resize-none" placeholder="Full residential address" />
                                                </div>
                                                <div className="space-y-1.5 md:col-span-1">
                                                    <label className="text-[12px] font-semibold text-slate-600">Emergency Contact Name</label>
                                                    <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="Relative's Name" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-slate-600">Emergency Contact Number</label>
                                                    <input type="tel" name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 focus:border-[#1F6F8B] outline-none text-xs" placeholder="+91 XXXX XXXX" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-6">
                                        <div className="mb-6">
                                            <h2 className="text-lg font-bold text-slate-900">Salary & Compensation</h2>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Fixed Pay (Monthly)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                                    <input type="number" name="basePay" value={formData.basePay} onChange={handleInputChange} className="w-full h-10 pl-7 pr-3 rounded-md border border-slate-200 outline-none text-xs" placeholder="0.00" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Currency</label>
                                                <select name="currency" value={formData.currency} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs bg-white">
                                                    <option value="USD">USD</option>
                                                    <option value="INR">INR</option>
                                                    <option value="EUR">EUR</option>
                                                </select>
                                            </div>
                                            <div className="col-span-full border-t border-slate-100 mt-4 pt-6">
                                                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Statutory & Bank Details</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[12px] font-semibold text-slate-600">Bank Name</label>
                                                        <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[12px] font-semibold text-slate-600">Account Number</label>
                                                        <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[12px] font-semibold text-slate-600">IFSC Code</label>
                                                        <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[12px] font-semibold text-slate-600">PF Number (UAN)</label>
                                                        <input type="text" name="pfAccount" value={formData.pfAccount} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs" placeholder="e.g. 100000000000" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[12px] font-semibold text-slate-600">ESI Number</label>
                                                        <input type="text" name="esiAccount" value={formData.esiAccount} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs" />
                                                    </div>
                                                </div>

                                                {/* Editable Compensation Summary */}
                                                {(Number(formData.basePay) > 0 || true) && (
                                                    <div className="mt-8">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Compensation Breakdown</h3>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const ctc = Number(formData.basePay);
                                                                    if (!ctc) return toast.error("Please enter Fixed Pay (Monthly) first");
                                                                    const basic = Math.round(ctc * 0.6);
                                                                    const hra = Math.round(basic * 0.5);
                                                                    const pf = Math.round(basic * 0.12);
                                                                    const pt = 200;
                                                                    const conveyance = ctc - (basic + hra + pf);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        basicSalary: basic.toString(), hra: hra.toString(), conveyance: conveyance.toString(),
                                                                        pfEmployee: pf.toString(), esiEmployee: "0", professionalTax: pt.toString(),
                                                                        pfEmployer: pf.toString(), esiEmployer: "0"
                                                                    }));
                                                                    toast.success("Auto-filled standard breakdown");
                                                                }}
                                                                className="text-[10px] font-bold text-[#1F6F8B] bg-[#1F6F8B]/10 hover:bg-[#1F6F8B]/20 px-3 py-1.5 rounded transition-colors"
                                                            >
                                                                Auto-Fill Standards
                                                            </button>
                                                        </div>
                                                        <div className="bg-white border text-xs border-slate-200 rounded-lg overflow-hidden">
                                                            {(() => {
                                                                const basic = Number(formData.basicSalary) || 0;
                                                                const hra = Number(formData.hra) || 0;
                                                                const conveyance = Number(formData.conveyance) || 0;
                                                                const pfEmployee = Number(formData.pfEmployee) || 0;
                                                                const esiEmployee = Number(formData.esiEmployee) || 0;
                                                                const pt = Number(formData.professionalTax) || 0;
                                                                const pfEmployer = Number(formData.pfEmployer) || 0;
                                                                const esiEmployer = Number(formData.esiEmployer) || 0;

                                                                const grossTotal = basic + hra + conveyance;
                                                                const totalDeductions = pfEmployee + esiEmployee + pt;
                                                                const netSalary = grossTotal - totalDeductions;
                                                                const ctc = grossTotal + pfEmployer + esiEmployer;

                                                                const formatCur = (v: number) => v.toLocaleString(formData.currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency: formData.currency, maximumFractionDigits: 0 });

                                                                return (
                                                                    <table className="w-full text-slate-700">
                                                                        <thead className="bg-slate-50 border-b border-slate-200">
                                                                            <tr>
                                                                                <th className="text-left px-4 py-3 font-semibold w-2/3">Components</th>
                                                                                <th className="text-right px-4 py-3 font-semibold w-1/3">Monthly Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            <tr>
                                                                                <td className="px-4 py-2">Basic</td>
                                                                                <td className="px-4 py-2"><input type="number" name="basicSalary" value={formData.basicSalary} onChange={handleInputChange} className="w-full h-8 px-2 text-right rounded border border-slate-200 focus:border-[#1F6F8B] outline-none" placeholder="0" /></td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="px-4 py-2">HRA @ 50% of Basic</td>
                                                                                <td className="px-4 py-2"><input type="number" name="hra" value={formData.hra} onChange={handleInputChange} className="w-full h-8 px-2 text-right rounded border border-slate-200 focus:border-[#1F6F8B] outline-none" placeholder="0" /></td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="px-4 py-2">Conveyance / Special Allowance</td>
                                                                                <td className="px-4 py-2"><input type="number" name="conveyance" value={formData.conveyance} onChange={handleInputChange} className="w-full h-8 px-2 text-right rounded border border-slate-200 focus:border-[#1F6F8B] outline-none" placeholder="0" /></td>
                                                                            </tr>
                                                                            <tr className="bg-slate-50/50 font-bold">
                                                                                <td className="px-4 py-3 text-slate-900">Gross Total (A)</td>
                                                                                <td className="px-4 py-3 text-right text-slate-900">{formatCur(grossTotal)}</td>
                                                                            </tr>

                                                                            <tr>
                                                                                <td className="px-4 py-2">PF (Employee Contribution)</td>
                                                                                <td className="px-4 py-2"><input type="number" name="pfEmployee" value={formData.pfEmployee} onChange={handleInputChange} className="w-full h-8 px-2 text-right rounded border border-rose-200 text-rose-600 focus:border-rose-400 outline-none" placeholder="0" /></td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="px-4 py-2">ESI (Employee Contribution)</td>
                                                                                <td className="px-4 py-2"><input type="number" name="esiEmployee" value={formData.esiEmployee} onChange={handleInputChange} className="w-full h-8 px-2 text-right rounded border border-rose-200 text-rose-600 focus:border-rose-400 outline-none" placeholder="0" /></td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="px-4 py-2">Professional Tax</td>
                                                                                <td className="px-4 py-2"><input type="number" name="professionalTax" value={formData.professionalTax} onChange={handleInputChange} className="w-full h-8 px-2 text-right rounded border border-rose-200 text-rose-600 focus:border-rose-400 outline-none" placeholder="0" /></td>
                                                                            </tr>
                                                                            <tr className="bg-rose-50/30 text-rose-800 font-bold">
                                                                                <td className="px-4 py-3">Total Deductions</td>
                                                                                <td className="px-4 py-3 text-right">-{formatCur(totalDeductions)}</td>
                                                                            </tr>

                                                                            <tr className="bg-emerald-50/50 border-t-2 border-slate-200 text-slate-900 font-bold">
                                                                                <td className="px-4 py-4 text-[13px]">Net Salary (Take Home)</td>
                                                                                <td className="px-4 py-4 text-[13px] text-right text-emerald-700">{formatCur(netSalary)}</td>
                                                                            </tr>

                                                                            <tr>
                                                                                <td className="px-4 py-2 text-slate-500">PF (Employer Contribution)</td>
                                                                                <td className="px-4 py-2"><input type="number" name="pfEmployer" value={formData.pfEmployer} onChange={handleInputChange} className="w-full h-8 px-2 text-right rounded border border-slate-200 text-slate-500 focus:border-slate-400 outline-none" placeholder="0" /></td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="px-4 py-2 text-slate-500">ESI (Employer Contribution)</td>
                                                                                <td className="px-4 py-2"><input type="number" name="esiEmployer" value={formData.esiEmployer} onChange={handleInputChange} className="w-full h-8 px-2 text-right rounded border border-slate-200 text-slate-500 focus:border-slate-400 outline-none" placeholder="0" /></td>
                                                                            </tr>

                                                                            <tr className="bg-[#1F6F8B]/5 font-bold">
                                                                                <td className="px-4 py-4 text-slate-900">Total Cost to Company (CTC)</td>
                                                                                <td className="px-4 py-4 text-right text-[#1F6F8B] text-base">{formatCur(ctc)}</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                );
                                                            })()}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mt-3">* Provident Fund, Professional Tax, and other government payments will be deducted from your CTC as per regulatory norms.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 4 && (
                                    <div className="space-y-6">
                                        <div className="mb-6">
                                            <h2 className="text-lg font-bold text-slate-900">Document Management</h2>
                                            <p className="text-xs text-slate-500 mt-1">Upload files in PDF, JPG, or PNG format.</p>
                                        </div>
                                        <div className="space-y-4">
                                            {[
                                                { name: "Aadhar Card", status: "Required" },
                                                { name: "PAN Card", status: "Required" },
                                                { name: "Resume", status: "Required" },
                                                { name: "Offer Letter", status: "Optional" },
                                                { name: "Certificates", status: "Optional" }
                                            ].map((doc, i) => {
                                                const file = uploadedFiles[doc.name];
                                                return (
                                                    <label key={i} className="flex items-center justify-between p-4 bg-white rounded-md border border-slate-200 group hover:border-[#1F6F8B]/40 transition-colors cursor-pointer shadow-sm relative">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded border border-slate-200 flex items-center justify-center bg-slate-50">
                                                                {file ? (
                                                                    <Check className="w-5 h-5 text-emerald-500" />
                                                                ) : (
                                                                    <Upload className="w-4 h-4 text-slate-400 group-hover:text-[#1F6F8B] transition-colors" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-[13px] font-bold text-slate-800">{doc.name}</p>
                                                                <p className={clsx("text-[11px] font-medium", file ? "text-emerald-600 truncate max-w-[200px]" : "text-[#1F6F8B]/70")}>
                                                                    {file ? file.name : doc.status}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-[11px] font-bold text-[#1F6F8B] bg-white px-4 py-2 rounded-md border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                                                            {file ? 'Change' : 'Upload'}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={(e) => {
                                                                const selected = e.target.files?.[0];
                                                                if (selected) {
                                                                    setUploadedFiles(prev => ({ ...prev, [doc.name]: selected }));
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {currentStep === 5 && (
                                    <div className="space-y-6">
                                        <div className="mb-6">
                                            <h2 className="text-lg font-bold text-slate-900">Access Control</h2>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Company Location</label>
                                                <select className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs bg-white">
                                                    <option>Headquarters</option>
                                                    <option>Regional Hub</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Initial Password <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    className="w-full h-10 px-3 rounded-md border border-[#1F6F8B]/30 bg-blue-50/10 outline-none text-xs focus:border-[#1F6F8B]"
                                                    placeholder="Set employee password"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-semibold text-slate-600">Confirm Password <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="password"
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    className="w-full h-10 px-3 rounded-md border border-slate-200 outline-none text-xs focus:border-[#1F6F8B]"
                                                    placeholder="Verify password"
                                                />
                                            </div>
                                            <div className="col-span-full">
                                                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Permissions Matrix</h3>
                                                <div className="flex flex-wrap gap-4">
                                                    {["Chat", "Files", "Tickets", "Feed", "Wiki"].map(perm => (
                                                        <label key={perm} className="flex items-center gap-2 cursor-pointer py-1.5 px-3 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                                                            <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded border-slate-300 text-[#1F6F8B]" />
                                                            <span className="text-[11px] font-medium text-slate-600">{perm}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 6 && (
                                    <div className="space-y-6">
                                        <div className="mb-6">
                                            <h2 className="text-lg font-bold text-slate-900">Policies & Agreements</h2>
                                        </div>
                                        <div className="space-y-4">
                                            {[
                                                "Internal Communication Policy",
                                                "Data Security & Privacy Agreement",
                                                "Harassment-Free Workplace Policy"
                                            ].map((policy, i) => (
                                                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50/30 border border-emerald-100">
                                                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-slate-800">{policy}</p>
                                                    </div>
                                                    <button className="text-[11px] font-bold text-[#1F6F8B] hover:underline">View Policy</button>
                                                </div>
                                            ))}
                                            <div className="mt-8 pt-6 border-t border-slate-100">
                                                <label className="flex items-start gap-3 cursor-pointer group">
                                                    <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#1F6F8B]" />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                                                        I confirm that I have read and shared the necessary company documentation with the employee and received formal acceptance.
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 7 && (
                                    <div className="space-y-8">
                                        <div className="text-center py-6">
                                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle2 className="w-8 h-8" />
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-900">Submit for Approval</h2>
                                            <p className="text-xs text-slate-500 mt-2">The employee profile will be submitted for Manager and HR approval before activation.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-lg border border-slate-200">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Candidate Name</p>
                                                <p className="text-xs font-bold text-slate-800">{formData.firstName} {formData.lastName}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Work Email</p>
                                                <p className="text-xs font-bold text-slate-800">{formData.email || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Join Date</p>
                                                <p className="text-xs font-bold text-slate-800">{formData.joinDate || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Employee ID</p>
                                                <p className="text-xs font-bold text-[#1F6F8B]">{formData.employeeCode || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Role</p>
                                                <p className="text-xs font-bold text-slate-800">{formData.role || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Marital Status</p>
                                                <p className="text-xs font-bold text-slate-800">{formData.maritalStatus || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Blood Group</p>
                                                <p className="text-xs font-bold text-slate-800">{formData.bloodGroup || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Personal Email</p>
                                                <p className="text-xs font-bold text-slate-800">{formData.personalEmail || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Emergency Contact</p>
                                                <p className="text-xs font-bold text-slate-800">{formData.emergencyContactName ? `${formData.emergencyContactName} (${formData.emergencyContactNumber})` : "-"}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer Controls (Zoho standard) */}
                    <div className="h-16 bg-white border-t border-slate-200 px-8 flex items-center justify-between mt-auto">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className={clsx(
                                "text-[13px] font-bold flex items-center gap-1.5 transition-all",
                                currentStep === 1 ? "text-slate-300 cursor-not-allowed" : "text-[#1F6F8B] hover:text-[#16556b]"
                            )}
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>

                        <div className="flex gap-4">
                            <button
                                onClick={async () => {
                                    const ok = await saveDraft();
                                    if (ok) toast.success("Draft saved successfully");
                                    else toast.error("Failed to save draft");
                                }}
                                className="px-5 py-2.5 text-[13px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded transition-all shadow-sm"
                            >
                                Draft
                            </button>
                            <button
                                onClick={currentStep === STEPS.length ? activateEmployee : nextStep}
                                disabled={isSubmitting}
                                className="bg-[#1F6F8B] hover:bg-[#16556b] disabled:opacity-70 text-white px-6 py-2.5 rounded text-[13px] font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Activating...
                                    </>
                                ) : currentStep === STEPS.length ? (
                                    "Submit for Approval"
                                ) : (
                                    <>
                                        Save & Next <ChevronRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div >
    );
}
