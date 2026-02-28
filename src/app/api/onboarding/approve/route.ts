import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { userId, approvalType, status } = await req.json(); // approvalType: 'manager' | 'hr'

        if (!userId || !approvalType || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userRole = (session.user as any).role;
        const currentUserId = session.user.id;

        if (approvalType === 'manager') {
            // Manager, TL, Reporting Manager OR Admin can provide manager approval
            const isAuthorized = (user.reportingManager && user.reportingManager.toString() === currentUserId) ||
                ['Manager', 'TL', 'Admin'].includes(userRole);

            if (!isAuthorized) {
                return NextResponse.json({ error: "Unauthorized to provide manager approval. Only Managers, TLs, or Admins can perform this action." }, { status: 403 });
            }
            user.managerApproval = status;
        } else if (approvalType === 'hr') {
            // HR, HR Manager OR Admin can provide final approval
            if (!['HR', 'HR Manager', 'Admin'].includes(userRole)) {
                return NextResponse.json({ error: "Unauthorized to provide HR approval. Only HR or Admin personnel can perform this action." }, { status: 403 });
            }

            user.hrApproval = status;
        }

        // Logical Flow Update: HR is the final authority
        if (user.hrApproval === 'Approved') {
            user.isActive = true;
            user.onboardingStatus = 'Completed';
            // Also mark manager approval as approved if HR bypasses it
            if (user.managerApproval === 'Pending') {
                user.managerApproval = 'Approved';
            }
        } else if (status === 'Rejected') {
            user.onboardingStatus = 'Pending Approval';
        }

        await user.save();

        return NextResponse.json({
            message: `Onboarding ${status.toLowerCase()} by ${approvalType}`,
            user: {
                id: user._id,
                name: user.name,
                onboardingStatus: user.onboardingStatus,
                isActive: user.isActive,
                managerApproval: user.managerApproval,
                hrApproval: user.hrApproval
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
