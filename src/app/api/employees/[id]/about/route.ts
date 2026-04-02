import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import User from "@/backend/models/User";
import moment from "moment";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const { id: userId } = await params;

        const user = await User.findById(userId)
            .populate('reportingManager', 'name role')
            .lean();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // --- Calculate Age ---
        let age = "Not Provided";
        if (user.dob) {
            const dobMoment = moment(user.dob);
            const now = moment();
            const calculatedAge = now.diff(dobMoment, 'years');
            age = calculatedAge > 0 ? `${calculatedAge} yrs` : 'Invalid Date';
        }

        // Map database model to requested "About Me" UI format
        const responseData = {
            personalDetails: {
                salutation: user.salutation || "-",
                firstName: user.firstName || user.name.split(' ')[0] || "-",
                middleName: user.middleName || "-",
                lastName: user.lastName || user.name.split(' ').slice(1).join(' ') || "-",
                gender: user.gender || "Not Specified",
                maritalStatus: user.maritalStatus || "Not Specified",
                bloodGroup: user.bloodGroup || "Not Specified",
                dob: user.dob ? moment(user.dob).format('DD MMM YYYY') : "Not Specified",
                dobRaw: user.dob ? moment(user.dob).format('YYYY-MM-DD') : "",
                age: age,
                nationality: user.nationality || "Not Specified",
                countryOfBirth: user.countryOfBirth || "Not Specified",
                stateOfBirth: user.stateOfBirth || "Not Specified",
                placeOfBirth: user.placeOfBirth || "Not Specified",
            },
            contactDetails: {
                mobileNumber: user.phone || "Not Provided",
                alternateMobileNumber: user.alternatePhone || "Not Provided",
                officialEmail: user.email || "Not Provided",
                personalEmail: user.personalEmail || "Not Provided",
                residentialLandline: user.residentialLandline || "Not Provided"
            },
            approvers: [] as any[]
        };

        // If employee has a reporting manager, push into approvers array
        if (user.reportingManager) {
            responseData.approvers.push({
                level: "Approver - 1",
                name: user.reportingManager.name,
                role: user.reportingManager.role,
                avatarUrl: null
            });
        }

        return NextResponse.json(responseData);

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (!['Admin', 'Manager', 'HR', 'HR Manager'].includes(userRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectToDatabase();
        const { id: userId } = await params;
        const updates = await req.json();

        // If Manager, check if it's their subordinate
        if (userRole === 'Manager') {
            const employee = await User.findById(userId);
            if (!employee || employee.reportingManager?.toString() !== (session.user as any).id) {
                return NextResponse.json({ error: "Forbidden: You can only update your subordinates." }, { status: 403 });
            }
        }

        // Prevent unauthorized role/password changes through this endpoint
        const { password, role, ...safeUpdates } = updates;

        const updatedUser = await User.findByIdAndUpdate(userId, safeUpdates, { new: true });

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Profile updated successfully" });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
