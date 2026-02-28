import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import moment from "moment";
import mongoose from "mongoose";

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

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ error: "Invalid Employee ID format" }, { status: 400 });
        }

        const user = await User.findById(userId)
            .populate('reportingManager', 'name role')
            .lean();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // --- Calculate Total Experience (Service) ---
        let totalService = "N/A";
        if (user.joinDate) {
            const joinMoment = moment(user.joinDate);
            const now = moment();

            const years = now.diff(joinMoment, 'years');
            joinMoment.add(years, 'years');
            const months = now.diff(joinMoment, 'months');

            if (years === 0 && months === 0) {
                totalService = "Just joined";
            } else {
                const yearStr = years > 0 ? `${years} yr${years > 1 ? 's' : ''}` : '';
                const monthStr = months > 0 ? `${months} mo${months > 1 ? 's' : ''}` : '';
                totalService = `${yearStr} ${monthStr}`.trim();
            }
        }

        // Map database model to requested UI format
        const responseData = {
            basicDetails: {
                name: user.name,
                email: user.email,
                avatarUrl: null, // Placeholder for future image upload
                aboutMe: user.aboutMe || "No bio available.",
                familyDetails: user.familyDetails || "Not provided",
                address: user.address ? `${user.address}, ${user.city || ''} ${user.state || ''} ${user.postalCode || ''}`.trim() : "Not provided",
                coordinates: user.coordinates || null,
            },
            companyDetails: {
                employeeCode: user.employeeCode || `EMP-${user._id.toString().substring(0, 5).toUpperCase()}`,
                department: user.department || "General",
                role: user.role || "Employee",
                workLocation: user.workLocation || "Office",
                internalId: user.employeeCode || user._id.toString(),
            },
            emergencyContact: {
                name: user.emergencyContactName || "Not provided",
                number: user.emergencyContactNumber || "Not provided"
            },
            experience: {
                joiningDate: user.joinDate ? moment(user.joinDate).format('MMM DD, YYYY') : "Unknown",
                totalService: totalService
            },
            managerDetails: {
                name: user.reportingManager?.name || "None",
                role: user.reportingManager?.role || "N/A"
            }
        };

        // If salary is included, only admins should see it
        const isAdmin = (session.user as any).role === 'Admin';
        if (isAdmin && user.salary) {
            (responseData as any).companyDetails.salary = user.salary;
        }

        return NextResponse.json(responseData);

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
