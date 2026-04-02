import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import Leave from "@/backend/models/Leave";
import User from "@/backend/models/User";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const data = await req.json();

        const { startDate, endDate, totalDays, ...restData } = data;

        // Check for overlapping leaves
        const overlappingLeave = await Leave.findOne({
            userId: session.user.id,
            status: { $ne: 'Rejected' },
            $or: [
                { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
            ]
        });

        if (overlappingLeave) {
            return NextResponse.json({ error: "You already have a leave request (Pending or Approved) during these dates." }, { status: 400 });
        }

        // Employees apply for leave
        const newLeave = await Leave.create({
            userId: session.user.id,
            startDate,
            endDate,
            totalDays,
            ...restData
        });

        return NextResponse.json({ message: "Leave applied successfully", record: newLeave }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const userRole = (session.user as any).role;
        const userId = (session.user as any).id;
        const { searchParams } = new URL(req.url);
        const filter = searchParams.get('filter');

        // Employee sees own records, Admin/HR sees all, Manager/TL sees subordinates
        let query = {};
        if (['Admin', 'HR', 'HR Manager'].includes(userRole)) {
            query = {};
        } else if (['Manager', 'TL'].includes(userRole)) {
            const subordinates = await User.find({ reportingManager: userId }, '_id');
            const subordinateIds = subordinates.map(s => s._id);
            query = {
                $or: [
                    { userId: userId },
                    { userId: { $in: subordinateIds } }
                ]
            };
        } else {
            query = { userId: userId };
        }

        if (filter === 'today') {
            const moment = (await import('moment')).default;
            const today = moment().startOf('day').toDate();
            query = {
                ...query,
                startDate: { $lte: today },
                endDate: { $gte: today },
                status: 'Approved'
            };
        }

        const records = await Leave.find(query).sort({ appliedOn: -1 }).populate('userId', 'name email department employeeCode');

        return NextResponse.json({ records });

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
        const userId = (session.user as any).id;

        if (!['Admin', 'Manager', 'HR Manager', 'TL'].includes(userRole)) {
            return NextResponse.json({ error: "Forbidden: Management access only" }, { status: 403 });
        }

        await connectToDatabase();
        const { leaveId, status } = await req.json();

        if (['Manager', 'TL'].includes(userRole)) {
            const leave = await Leave.findById(leaveId).populate('userId');
            if (!leave || (leave.userId as any).reportingManager?.toString() !== userId) {
                return NextResponse.json({ error: "Forbidden: You can only approve leaves for your subordinates." }, { status: 403 });
            }
        }

        if (!leaveId || !status || !['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
        }

        const updatedLeave = await Leave.findByIdAndUpdate(
            leaveId,
            { status },
            { new: true }
        );

        if (!updatedLeave) {
            return NextResponse.json({ error: "Leave record not found" }, { status: 404 });
        }

        // If the leave is approved, retroactively update any existing "Absent" attendance records to "On Leave"
        if (status === 'Approved') {
            const moment = (await import('moment')).default;
            const Attendance = (await import('@/backend/models/Attendance')).default;

            const startOfDay = moment(updatedLeave.startDate).startOf('day').toDate();
            const endOfDay = moment(updatedLeave.endDate).endOf('day').toDate();

            await Attendance.updateMany(
                {
                    userId: updatedLeave.userId,
                    date: { $gte: startOfDay, $lte: endOfDay },
                    status: 'Absent'
                },
                { $set: { status: 'On Leave' } }
            );
        }

        return NextResponse.json({ message: "Leave status updated successfully", record: updatedLeave });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
