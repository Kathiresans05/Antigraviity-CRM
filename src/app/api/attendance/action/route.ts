import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import moment from "moment";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const { action, recordId, reason, requestedTimeIn, requestedTimeOut } = await req.json();
        const userId = session.user.id;

        const record = await Attendance.findById(recordId);
        if (!record) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        // Employee Actions
        if (action === 'autoClose') {
            // Ensure the record belongs to the user and is genuinely unclosed from a previous day
            if (record.userId.toString() !== userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }

            const recordDate = moment(record.date);
            const today = moment().startOf('day');

            if (record.clockOutTime || recordDate.isSameOrAfter(today)) {
                return NextResponse.json({ error: "Record cannot be auto-closed" }, { status: 400 });
            }

            // Auto close at 9:00 PM of that record's date
            const autoCloseTime = recordDate.clone().hour(21).minute(0).toDate();

            const { calculateAttendanceStats } = await import('@/lib/attendance-utils');
            const stats = calculateAttendanceStats({
                ...record.toObject(),
                clockOutTime: autoCloseTime,
                isOnBreak: false // Always end break on auto-close
            });

            record.clockOutTime = autoCloseTime;
            record.status = 'Auto Closed';
            record.autoClosed = true;
            record.isOnBreak = false;
            record.breakMinutes = stats.breakMinutes;
            record.totalHours = stats.totalHours;
            record.lateMinutes = stats.lateMinutes;
            record.earlyLogoutMinutes = stats.earlyLogoutMinutes;
            record.grossPresenceMinutes = stats.grossPresenceMinutes;
            record.netWorkMinutes = stats.netWorkMinutes;
            record.isLate = stats.isLate;
            record.isEarlyOut = stats.isEarlyOut;

            record.correctionRequested = true;
            record.correctionDetails = {
                reason: 'System Auto Closed - Awaiting HR Verification',
                requestedTimeIn: record.clockInTime,
                requestedTimeOut: autoCloseTime,
                status: 'Pending'
            };

            if (!record.auditLog) record.auditLog = [];
            record.auditLog.push({
                action: 'System Auto Close Triggered by User',
                by: userId,
                timestamp: new Date(),
                details: 'User acknowledged unclosed session. Forwarded to HR for review.'
            });

            await record.save();
            return NextResponse.json({ message: "Session auto-closed successfully", record });
        }

        if (action === 'requestCorrection') {
            if (record.userId.toString() !== userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }

            const timeIn = requestedTimeIn ? new Date(requestedTimeIn) : record.clockInTime;
            const timeOut = requestedTimeOut ? new Date(requestedTimeOut) : record.clockOutTime;

            if (timeIn && timeOut && !moment(timeOut).isAfter(moment(timeIn))) {
                return NextResponse.json({ error: "Clock Out time must be later than Clock In." }, { status: 400 });
            }

            record.correctionRequested = true;
            record.correctionDetails = {
                reason,
                requestedTimeIn: timeIn,
                requestedTimeOut: timeOut,
                status: 'Pending'
            };

            if (!record.auditLog) record.auditLog = [];
            record.auditLog.push({
                action: 'Correction Requested',
                by: userId,
                timestamp: new Date(),
                details: `Reason: ${reason}`
            });

            await record.save();
            return NextResponse.json({ message: "Correction request submitted", record });
        }

        // Admin Actions
        const managementRoles = ['Admin', 'HR', 'HR Manager', 'Manager', 'Assigned Manager'];
        if (!managementRoles.includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized action" }, { status: 403 });
        }

        if (action === 'approveCorrection') {
            if (!record.correctionRequested || record.correctionDetails.status !== 'Pending') {
                return NextResponse.json({ error: "No pending correction found" }, { status: 400 });
            }

            const requestedIn = record.correctionDetails.requestedTimeIn;
            const requestedOut = record.correctionDetails.requestedTimeOut;
            const clockInMom = moment(requestedIn);
            const clockOutMom = moment(requestedOut);

            if (!clockOutMom.isAfter(clockInMom)) {
                return NextResponse.json({ error: "Clock Out time must be later than Clock In." }, { status: 400 });
            }

            const { calculateAttendanceStats } = await import('@/lib/attendance-utils');
            const stats = calculateAttendanceStats({
                ...record.toObject(),
                clockInTime: requestedIn,
                clockOutTime: requestedOut
            });

            record.clockInTime = requestedIn;
            record.clockOutTime = requestedOut;
            record.totalHours = stats.totalHours;
            record.lateMinutes = stats.lateMinutes;
            record.earlyLogoutMinutes = stats.earlyLogoutMinutes;
            record.grossPresenceMinutes = stats.grossPresenceMinutes;
            record.netWorkMinutes = stats.netWorkMinutes;
            record.isLate = stats.isLate;
            record.isEarlyOut = stats.isEarlyOut;
            record.status = stats.status;

            record.correctionRequested = false;
            record.autoClosed = false;
            record.correctionDetails.status = 'Approved';

            if (!record.auditLog) record.auditLog = [];
            record.auditLog.push({
                action: 'Correction Approved',
                by: userId,
                timestamp: new Date(),
                details: 'Admin approved the time correction.'
            });

            await record.save();
            return NextResponse.json({ message: "Correction approved successfully", record });
        }

        if (action === 'rejectCorrection') {
            if (!record.correctionRequested || record.correctionDetails.status !== 'Pending') {
                return NextResponse.json({ error: "No pending correction found" }, { status: 400 });
            }

            record.correctionRequested = false;
            record.correctionDetails.status = 'Rejected';

            if (!record.auditLog) record.auditLog = [];
            record.auditLog.push({
                action: 'Correction Rejected',
                by: userId,
                timestamp: new Date(),
                details: 'Admin rejected the time correction.'
            });

            await record.save();
            return NextResponse.json({ message: "Correction rejected successfully", record });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
