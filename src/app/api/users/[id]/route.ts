import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Leave from "@/models/Leave";
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

        // Fetch user basic info
        const user = await User.findById(userId)
            .populate('reportingManager', 'name email')
            .lean();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Remove sensitive info if not admin or self
        const isAdmin = (session.user as any).role === 'Admin';
        const isSelf = session.user.id === userId;

        if (!isAdmin && !isSelf) {
            // Limited view for others? For now let's assume if they can access this, they can see most details except salary
            delete (user as any).salary;
            delete (user as any).password;
        } else if (!isAdmin) {
            delete (user as any).salary;
        }
        delete (user as any).password;

        // Fetch Attendance Summary
        const today = moment().startOf('day').toDate();
        const todayRecord = await Attendance.findOne({ userId, date: today }).lean();

        // Monthly Late Count
        const startOfMonth = moment().startOf('month').toDate();
        const endOfMonth = moment().endOf('month').toDate();
        const lateCount = await Attendance.countDocuments({
            userId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
            status: 'Late'
        });

        // Leave Balance (Placeholder logic if no specific balance model exists)
        // Let's count approved leaves for the year to show "balance" or just used.
        // For now, let's assume a fixed quota of 24 and subtract approved leaves.
        const approvedLeaves = await Leave.find({
            userId,
            status: 'Approved',
            startDate: { $gte: moment().startOf('year').toDate() }
        }).lean();

        const usedLeaveDays = approvedLeaves.reduce((acc, curr) => {
            const start = moment(curr.startDate);
            const end = moment(curr.endDate);
            return acc + end.diff(start, 'days') + 1;
        }, 0);

        const attendanceSummary = {
            todayClockIn: todayRecord?.clockInTime || null,
            todayClockOut: todayRecord?.clockOutTime || null,
            todayNetHours: todayRecord?.totalHours || 0,
            monthlyLateCount: lateCount,
            leaveBalance: 24 - usedLeaveDays // Placeholder 24 days quota
        };

        return NextResponse.json({ user, attendanceSummary });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
