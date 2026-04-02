import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import User from "@/backend/models/User";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        // Only Admin and Managers can bulk assign teams
        if (!['Admin', 'Manager', 'HR Manager', 'HR'].includes(userRole)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const { tlId, memberIds } = await req.json();

        if (!tlId || !Array.isArray(memberIds)) {
            return NextResponse.json({ error: "TL ID and member IDs array are required." }, { status: 400 });
        }

        // Verify the TL exists and has the correct role
        const tlUser = await User.findById(tlId);
        if (!tlUser) {
            return NextResponse.json({ error: "Team Leader not found." }, { status: 404 });
        }

        if (tlUser.role !== 'TL' && tlUser.role !== 'Manager' && tlUser.role !== 'Assigned Manager') {
            return NextResponse.json({ error: "Target user is not a Team Leader or Manager." }, { status: 400 });
        }

        // Update all selected members' reportingManager to the tlId
        const result = await User.updateMany(
            { _id: { $in: memberIds } },
            { $set: { reportingManager: tlId } }
        );

        return NextResponse.json({
            message: `Successfully assigned ${result.modifiedCount} members to ${tlUser.name}.`,
            modifiedCount: result.modifiedCount
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
