import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (!['Admin', 'Manager', 'HR', 'HR Manager', 'TL'].includes(userRole)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        // Calculate stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Total New Joinees (joined this month)
        const totalNewJoinees = await User.countDocuments({
            joinDate: { $gte: startOfMonth }
        });

        // 2. Pending Onboarding (inactive users awaiting activation)
        const pendingOnboarding = await User.countDocuments({
            isActive: false
        });

        // 3. Completed Onboarding (active users joined this month or recently)
        const completedOnboarding = await User.countDocuments({
            isActive: true,
            joinDate: { $gte: startOfMonth }
        });

        // 4. Probation Employees (assuming a standard 6-month probation period)
        const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
        const probationEmployees = await User.countDocuments({
            isActive: true,
            joinDate: { $gte: sixMonthsAgo }
        });

        const stats = [
            { label: "Total New Joinees", value: totalNewJoinees.toString().padStart(2, '0') },
            { label: "Pending Onboarding", value: pendingOnboarding.toString().padStart(2, '0') },
            { label: "Completed", value: completedOnboarding.toString().padStart(2, '0') },
            { label: "Probation", value: probationEmployees.toString().padStart(2, '0') }
        ];

        return NextResponse.json(stats);

    } catch (error: any) {
        console.error("Error fetching onboarding stats:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
