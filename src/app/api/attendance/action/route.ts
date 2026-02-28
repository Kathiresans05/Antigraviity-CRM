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

            // Auto close at 11:59 PM of that record's date
            const autoCloseTime = recordDate.endOf('day').toDate();

            let breakMins = record.breakMinutes || 0;
            if (record.isOnBreak && record.breakStartTime) {
                breakMins += moment(autoCloseTime).diff(moment(record.breakStartTime), 'minutes');
            }

            const totalMins = moment(autoCloseTime).diff(moment(record.clockInTime), 'minutes');
            const netMins = Math.max(0, totalMins - breakMins);
            const hours = netMins / 60;

            record.clockOutTime = autoCloseTime;
            record.status = 'Auto Closed';
            record.autoClosed = true;
            record.isOnBreak = false;
            record.breakMinutes = breakMins;
            record.totalHours = parseFloat(hours.toFixed(2));

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

            record.correctionRequested = true;
            record.correctionDetails = {
                reason,
                requestedTimeIn: requestedTimeIn ? new Date(requestedTimeIn) : record.clockInTime,
                requestedTimeOut: requestedTimeOut ? new Date(requestedTimeOut) : record.clockOutTime,
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

            record.clockInTime = record.correctionDetails.requestedTimeIn;
            record.clockOutTime = record.correctionDetails.requestedTimeOut;

            if (record.clockOutTime && record.clockInTime) {
                const totalMins = moment(record.clockOutTime).diff(moment(record.clockInTime), 'minutes');
                const netMins = Math.max(0, totalMins - (record.breakMinutes || 0));
                record.totalHours = parseFloat((netMins / 60).toFixed(2));
                if (record.totalHours >= 8) {
                    record.status = 'Present';
                } else if (record.totalHours >= 7) {
                    record.status = 'Early Logout';
                } else {
                    record.status = 'Half Day';
                }
            }

            record.correctionRequested = false;
            record.autoClosed = false; // Reset if it was auto-closed
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
