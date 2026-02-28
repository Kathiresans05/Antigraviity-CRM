import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getManagedUserIds } from "@/lib/hierarchy";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const userId = session.user.id;
        const userRole = (session.user as any).role;
        const { searchParams } = new URL(req.url);
        const isStrict = searchParams.get('strict') === 'true';

        // Get managed user IDs - use broad visibility unless strict is requested
        const managedIds = await getManagedUserIds(userId, userRole, isStrict);

        let query: any = {};
        if (managedIds && managedIds.length > 0) {
            query = { _id: { $in: managedIds } };
        }

        const users = await User.find(query, '_id name email role phone department joinDate isActive reportingManager teamLeader')
            .populate('reportingManager', 'name role')
            .populate('teamLeader', 'name role')
            .sort({ name: 1 });

        return NextResponse.json({ users });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userRole = (session.user as any).role;
        if (!['Admin', 'Manager', 'HR', 'HR Manager'].includes(userRole)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        // --- SEED DEFAULT ADMIN IF DB IS EMPTY ---
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            const adminPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'System Admin',
                email: 'admin@crm.com',
                password: adminPassword,
                role: 'Admin',
                isActive: true,
                onboardingStatus: 'Completed',
                managerApproval: 'Approved',
                hrApproval: 'Approved',
                employeeCode: 'ADM-001'
            });
            console.log("DEFAULT_ADMIN_SEEDED: admin@crm.com / admin123");
        }

        const {
            name, email, password, role, designation, phone, department, reportingManager,
            probationPeriod, bankName, accountNumber, joinDate, gender, dob,
            firstName, lastName, pfAccount, esiAccount, salaryDetails,
            onboardingStatus, employeeCode, // manual ID
            salutation, middleName, bloodGroup, maritalStatus, nationality,
            personalEmail, alternatePhone, residentialLandline,
            emergencyContactName, emergencyContactNumber,
            countryOfBirth, stateOfBirth, placeOfBirth
        } = await req.json();

        // Validate reportingManager ID
        let finalManager = reportingManager;
        if (finalManager && !mongoose.Types.ObjectId.isValid(finalManager)) {
            finalManager = null;
        }

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
        }

        // Only require password if NOT in partial draft mode
        if (onboardingStatus !== 'In Progress' && !password) {
            return NextResponse.json({ error: "Password is required for final submission." }, { status: 400 });
        }

        const existing = await User.findOne({ email });
        let user;

        const needsManagerApproval = !['Manager', 'HR', 'HR Manager', 'Admin'].includes(role || 'Employee');
        const defaultManagerStatus = needsManagerApproval ? 'Pending' : 'Approved';

        if (existing) {
            if (existing.isActive) {
                return NextResponse.json({ error: "An active employee with this email already exists." }, { status: 409 });
            }
            // Update the existing inactive user (upsert behavior for onboarding)
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                existing.password = hashedPassword;
            }
            existing.role = role || 'Employee';
            existing.designation = designation || '';
            existing.phone = phone || '';
            existing.department = department || '';
            existing.reportingManager = finalManager || null;
            existing.onboardingStatus = onboardingStatus || 'Pending Approval';
            existing.managerApproval = defaultManagerStatus;
            existing.hrApproval = 'Pending';
            existing.employeeCode = employeeCode || existing.employeeCode;
            existing.joinDate = joinDate || new Date();

            // Detailed Fields Update
            existing.salutation = salutation || existing.salutation;
            existing.firstName = firstName || existing.firstName;
            existing.middleName = middleName || existing.middleName;
            existing.lastName = lastName || existing.lastName;
            existing.gender = gender || existing.gender;
            existing.dob = dob ? new Date(dob) : existing.dob;
            existing.bloodGroup = bloodGroup || existing.bloodGroup;
            existing.maritalStatus = maritalStatus || existing.maritalStatus;
            existing.nationality = nationality || existing.nationality;
            existing.personalEmail = personalEmail || existing.personalEmail;
            existing.alternatePhone = alternatePhone || existing.alternatePhone;
            existing.residentialLandline = residentialLandline || existing.residentialLandline;
            existing.emergencyContactName = emergencyContactName || existing.emergencyContactName;
            existing.emergencyContactNumber = emergencyContactNumber || existing.emergencyContactNumber;
            existing.countryOfBirth = countryOfBirth || existing.countryOfBirth;
            existing.stateOfBirth = stateOfBirth || existing.stateOfBirth;
            existing.placeOfBirth = placeOfBirth || existing.placeOfBirth;
            existing.bankName = bankName || existing.bankName;
            existing.accountNumber = accountNumber || existing.accountNumber;
            existing.pfAccount = pfAccount || existing.pfAccount;
            existing.esiAccount = esiAccount || existing.esiAccount;
            existing.salaryDetails = salaryDetails || existing.salaryDetails;
            existing.probationPeriod = probationPeriod || existing.probationPeriod;

            user = await existing.save();
        } else {
            // draft fallback password: a random hash if not provided
            const finalPassword = password || `DRAFT_${Math.random().toString(36).slice(-8)}`;
            const hashedPassword = await bcrypt.hash(finalPassword, 10);

            user = await User.create({
                name,
                email,
                password: hashedPassword,
                role: role || 'Employee',
                designation: designation || '',
                phone: phone || '',
                department: department || '',
                reportingManager: finalManager || null,
                isActive: false,
                onboardingStatus: onboardingStatus || 'Pending Approval',
                managerApproval: defaultManagerStatus,
                hrApproval: 'Pending',
                // Detailed Onboarding specific fields
                salutation: salutation || (gender === 'Male' ? 'Mr.' : 'Ms.'),
                firstName,
                middleName,
                lastName,
                gender,
                dob: dob ? new Date(dob) : undefined,
                bloodGroup,
                maritalStatus,
                nationality,
                personalEmail,
                alternatePhone,
                residentialLandline,
                emergencyContactName,
                emergencyContactNumber,
                countryOfBirth,
                stateOfBirth,
                placeOfBirth,
                employeeCode: employeeCode || `EMP${Math.floor(1000 + Math.random() * 9000)}`,
                joinDate: joinDate || new Date(),
                bankName,
                accountNumber,
                pfAccount,
                esiAccount,
                salaryDetails: salaryDetails || {},
                probationPeriod: probationPeriod || 6
            });
        }

        return NextResponse.json({
            message: "Employee created successfully.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                department: user.department,
            }
        }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userRole = (session.user as any).role;
        if (!['Admin', 'Manager', 'HR', 'HR Manager'].includes(userRole)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const { id, name, email, password, phone, department, role, isActive, reportingManager, teamLeader } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "User ID is required." }, { status: 400 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (department !== undefined) updateData.department = department;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (reportingManager !== undefined) updateData.reportingManager = reportingManager || null;
        if (teamLeader !== undefined) updateData.teamLeader = teamLeader || null;

        // Handle password update with hashing
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await User.findByIdAndUpdate(id, updateData, { new: true });

        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        return NextResponse.json({ message: "Employee updated.", user });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
