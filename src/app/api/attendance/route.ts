import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import moment from "moment";
import { getManagedUserIds } from "@/lib/hierarchy";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const { action, workStatus, workStatusFile } = await req.json();
        const today = moment().startOf('day').toDate();
        const userId = session.user.id;

        if (action === 'clockIn') {
            const existingRecord = await Attendance.findOne({ userId, date: today });
            if (existingRecord && existingRecord.status !== 'Absent' && existingRecord.status !== 'On Leave') {
                return NextResponse.json({ error: "Already clocked in today." }, { status: 400 });
            }
            const now = moment();
            const lateThreshold = moment().startOf('day').hour(10).minute(0);
            const isLate = now.isAfter(lateThreshold);
            const newStatus = isLate ? 'Late' : 'Present';

            let record;
            if (existingRecord && (existingRecord.status === 'Absent' || existingRecord.status === 'On Leave')) {
                existingRecord.clockInTime = now.toDate();
                existingRecord.status = newStatus;
                await existingRecord.save();
                record = existingRecord;
            } else {
                record = await Attendance.create({
                    userId, date: today, clockInTime: now.toDate(),
                    status: newStatus
                });
            }
            return NextResponse.json({ message: "Clocked in successfully", record });

        } else if (action === 'startBreak') {
            const record = await Attendance.findOne({ userId, date: today, clockOutTime: null });
            if (!record) return NextResponse.json({ error: "Not clocked in." }, { status: 400 });
            const alreadyOnBreak = record.isOnBreak || (record.breakStartTime && !record.breakEndTime);
            if (alreadyOnBreak) return NextResponse.json({ error: "Already on break." }, { status: 400 });
            const updated = await Attendance.findByIdAndUpdate(
                record._id,
                { $set: { breakStartTime: new Date(), isOnBreak: true, breakEndTime: null } },
                { new: true }
            );
            return NextResponse.json({ message: "Break started", record: updated });

        } else if (action === 'endBreak') {
            const record = await Attendance.findOne({ userId, date: today, clockOutTime: null });
            if (!record) return NextResponse.json({ error: "Not clocked in." }, { status: 400 });
            const onBreak = record.isOnBreak || (record.breakStartTime && !record.breakEndTime);
            if (!onBreak) return NextResponse.json({ error: "Not on break." }, { status: 400 });
            const breakStart = record.breakStartTime || record.updatedAt;
            const breakMins = moment().diff(moment(breakStart), 'minutes');
            const totalBreak = (record.breakMinutes || 0) + breakMins;
            const updated = await Attendance.findByIdAndUpdate(
                record._id,
                { $set: { breakEndTime: new Date(), isOnBreak: false, breakMinutes: totalBreak } },
                { new: true }
            );
            return NextResponse.json({ message: "Break ended", record: updated });

        } else if (action === 'clockOut') {
            if (!workStatus || workStatus.trim().length === 0) {
                return NextResponse.json({ error: "Work status upload is required to clock out." }, { status: 400 });
            }
            const existingRecord = await Attendance.findOne({ userId, date: today, clockOutTime: null });
            if (!existingRecord) {
                return NextResponse.json({ error: "No active clock-in found for today, or already clocked out." }, { status: 400 });
            }
            // If still on break, end it first
            if (existingRecord.isOnBreak) {
                const breakMins = moment().diff(moment(existingRecord.breakStartTime), 'minutes');
                existingRecord.breakMinutes = (existingRecord.breakMinutes || 0) + breakMins;
                existingRecord.isOnBreak = false;
            }
            const clockOutTime = new Date();
            const clockInMoment = moment(existingRecord.clockInTime);
            const clockOutMoment = moment(clockOutTime);
            const totalMins = clockOutMoment.diff(clockInMoment, 'minutes');
            const netMins = totalMins - (existingRecord.breakMinutes || 0);
            const hours = netMins / 60;
            let status = existingRecord.status;
            if (hours >= 7 && hours < 8) {
                status = 'Early Logout';
            } else if (hours < 7) {
                status = 'Half Day';
            }
            existingRecord.clockOutTime = clockOutTime;
            existingRecord.totalHours = parseFloat(hours.toFixed(2));
            existingRecord.status = status;
            existingRecord.workStatusUpload = workStatus.trim();
            if (workStatusFile) existingRecord.workStatusFile = workStatusFile;
            await existingRecord.save();
            return NextResponse.json({ message: "Clocked out successfully", record: existingRecord });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });



    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export const maxDuration = 60; // Allow 60 seconds

// Increase body parser size limit for large base64 file uploads
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        // Auto-mark absentees if after 11:00 AM
        await import('@/lib/attendance-utils').then(m => m.markAbsenteesToday());

        const userId = session.user.id;
        const userRole = (session.user as any).role;

        // Get managed user IDs for hierarchical visibility
        const managedIds = await getManagedUserIds(userId, userRole);

        // Check if we are filtering or showing all
        let query: any = {};
        if (managedIds && managedIds.length > 0) {
            query = { userId: { $in: managedIds } };
        }

        const records = await Attendance.find(query).sort({ date: -1 }).populate('userId', 'name email department');

        // Check for an unclosed session (yesterday or older, where clockOutTime is null) for the CURRENT user
        const todayStart = moment().startOf('day').toDate();
        const unclosedSession = await Attendance.findOne({
            userId,
            date: { $lt: todayStart },
            clockOutTime: null,
            status: { $nin: ['Absent', 'On Leave', 'Auto Closed'] }
        });

        // Calculate KPI stats for the current user for the current month
        const monthStart = moment().startOf('month').toDate();
        const monthEnd = moment().endOf('month').toDate();
        const monthRecords = await Attendance.find({
            userId,
            date: { $gte: monthStart, $lte: monthEnd }
        });

        const stats = {
            present: monthRecords.filter(r => r.status === 'Present').length,
            absent: monthRecords.filter(r => r.status === 'Absent').length,
            late: monthRecords.filter(r => r.status === 'Late').length,
            autoClosed: monthRecords.filter(r => r.autoClosed).length,
            totalHours: monthRecords.reduce((acc, r) => acc + (r.totalHours || 0), 0)
        };

        return NextResponse.json({ records, unclosedSession, stats });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
