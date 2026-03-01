import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import moment from "moment";
import { getManagedUserIds } from "@/lib/hierarchy";
import Leave from "@/models/Leave";
import Holiday from "@/models/Holiday";
import User from "@/models/User";
import { sendDailyWorkSummaryEmail } from "@/lib/email";

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
            const breakSecs = moment().diff(moment(breakStart), 'seconds');
            const breakMins = breakSecs / 60;
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
                const breakSecs = moment().diff(moment(existingRecord.breakStartTime), 'seconds');
                existingRecord.breakMinutes = (existingRecord.breakMinutes || 0) + (breakSecs / 60);
                existingRecord.isOnBreak = false;
            }
            const clockOutTime = new Date();
            const clockInMoment = moment(existingRecord.clockInTime);
            const clockOutMoment = moment(clockOutTime);
            const totalMins = clockOutMoment.diff(clockInMoment, 'seconds') / 60;
            const netMins = totalMins - (existingRecord.breakMinutes || 0);
            const hours = netMins / 60;
            let status = existingRecord.status;
            if (hours < 5) {
                status = 'Absent';
            } else if (hours < 7) {
                status = 'Half Day';
            } else if (hours < 8) {
                status = 'Early Logout';
            }
            existingRecord.clockOutTime = clockOutTime;
            existingRecord.totalHours = parseFloat(hours.toFixed(2));
            existingRecord.status = status;
            existingRecord.workStatusUpload = workStatus.trim();
            if (workStatusFile) existingRecord.workStatusFile = workStatusFile;
            await existingRecord.save();

            // Notify Reporting Manager
            try {
                const employee = await User.findById(userId).populate('reportingManager');
                const manager = employee?.reportingManager as any;

                if (manager && manager.email) {
                    await sendDailyWorkSummaryEmail(
                        manager.email,
                        employee.name,
                        workStatus.trim(),
                        moment(existingRecord.clockInTime).format('hh:mm A'),
                        moment(clockOutTime).format('hh:mm A'),
                        parseFloat(hours.toFixed(2)),
                        workStatusFile
                    );
                } else {
                    console.log(`[ATTENDANCE_API]: No reporting manager found for ${employee?.name || userId}. Skipping email.`);
                }
            } catch (notifyErr) {
                console.error("[ATTENDANCE_API]: Failed to notify manager:", notifyErr);
                // Don't fail the clock-out just because notification failed
            }

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
        const nowMoment = moment();
        const monthStart = moment().startOf('month').toDate();
        const monthEnd = moment().endOf('month').toDate();
        const monthRecords = await Attendance.find({
            userId,
            date: { $gte: monthStart, $lte: monthEnd }
        }).sort({ date: -1 });

        // 1. Leave Balance
        const approvedLeaves = await Leave.find({
            userId,
            status: 'Approved',
            type: 'Paid Leave'
        });
        const totalUsedLeaves = approvedLeaves.reduce((acc, l) => acc + (l.totalDays || 0), 0);
        const leaveBalance = Math.max(0, 18 - totalUsedLeaves);

        // 2. Total Worked Hours (Current Month)
        const totalWorkedMonthly = monthRecords.reduce((acc, r) => acc + (r.totalHours || 0), 0);

        // 3. Monthly Leave Taken
        const monthlyLeaveTaken = monthRecords.filter(r => r.status === 'On Leave').length;

        // 3. Today's Break Time
        const todayRecord = await Attendance.findOne({
            userId,
            date: { $gte: todayStart }
        });
        const todayBreak = todayRecord ? todayRecord.breakMinutes || 0 : 0;

        // 4. Average Login Time
        const validLogins = monthRecords.filter(r => r.clockInTime);
        let averageLoginTime = "N/A";
        if (validLogins.length > 0) {
            const totalMinutes = validLogins.reduce((acc, r) => {
                const login = moment(r.clockInTime);
                return acc + login.hours() * 60 + login.minutes();
            }, 0);
            const avgMinutes = totalMinutes / validLogins.length;
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = Math.round(avgMinutes % 60);
            averageLoginTime = moment().hours(avgHours).minutes(avgMins).format('hh:mm A');
        }

        const stats = {
            present: monthRecords.filter(r => r.status === 'Present' || r.status === 'Late').length,
            absent: monthRecords.filter(r => r.status === 'Absent').length,
            late: monthRecords.filter(r => r.status === 'Late').length,
            autoClosed: monthRecords.filter(r => r.autoClosed || r.status === 'Auto Closed').length,
            totalHours: totalWorkedMonthly,
            leaveBalance,
            monthlyLeaveTaken,
            todayBreak,
            earlyExits: monthRecords.filter(r => r.status === 'Early Logout').length,
            missedPunches: monthRecords.filter(r => r.autoClosed || r.status === 'Auto Closed').length,
            averageLoginTime
        };

        return NextResponse.json({ records, unclosedSession, stats });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
