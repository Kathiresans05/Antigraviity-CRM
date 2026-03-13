import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import moment from "moment";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (!['Admin', 'HR', 'HR Manager'].includes(userRole)) {
            return NextResponse.json({ error: "Access denied." }, { status: 403 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const filter = searchParams.get('filter');

        let query: any = { status: 'active' };

        if (filter === 'ending-soon') {
            const upcomingDate = moment().add(1, 'month').endOf('month').toDate();
            query.probationStatus = 'Review Pending';
            query.probationEndDate = { $lte: upcomingDate };
        }

        const users = await User.find(query)
            .populate('reportingManager', 'name')
            .sort({ probationEndDate: 1 });

        return NextResponse.json({ users });

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
        if (!['Admin', 'HR', 'HR Manager'].includes(userRole)) {
            return NextResponse.json({ error: "Access denied." }, { status: 403 });
        }

        await connectToDatabase();

        const { userId, probationStatus, probationEndDate, probationNotes } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required." }, { status: 400 });
        }

        const updateData: any = {};
        if (probationStatus) updateData.probationStatus = probationStatus;
        if (probationEndDate) updateData.probationEndDate = new Date(probationEndDate);
        if (probationNotes !== undefined) updateData.probationNotes = probationNotes;

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        return NextResponse.json({ message: "Probation status updated successfully.", user: updatedUser });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
