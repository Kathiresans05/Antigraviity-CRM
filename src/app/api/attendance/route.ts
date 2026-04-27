import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import Attendance from "@/backend/models/Attendance";
import moment from "moment";
import { getManagedUserIds } from "@/backend/lib/hierarchy";
import { getShiftStartMoment, calculateLateMinutes } from "@/backend/lib/attendance-utils";
import Leave from "@/backend/models/Leave";
import Holiday from "@/backend/models/Holiday";
import User from "@/backend/models/User";
import ShiftAssignment from "@/backend/models/ShiftAssignment";
import { sendDailyWorkSummaryEmail } from "@/backend/lib/email";

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

        // Verify user status
        const currentUser = await User.findById(userId);
        if (!currentUser || currentUser.status === 'inactive') {
            return NextResponse.json({ error: "Your account is inactive. Attendance actions are disabled." }, { status: 403 });
        }

        if (action === 'clockIn') {
            const existingRecord = await Attendance.findOne({ userId, date: today });
            if (existingRecord && existingRecord.clockInTime) {
                if (existingRecord.clockOutTime) {
                    return NextResponse.json({ error: "You have already clocked out for today. Multiple sessions are not allowed." }, { status: 400 });
                }
                return NextResponse.json({ error: "You are already clocked in." }, { status: 400 });
            }
            const now = moment();
            const todayEnd = moment().endOf('day').toDate();
            
            // Fetch Assignment to get Shift and Policy
            const assignment = await ShiftAssignment.findOne({
                userId,
                effectiveFrom: { $lte: todayEnd },
                $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }]
            }).populate('shiftId').populate('policyId');

            const user = await User.findById(userId).populate('shift').populate('attendancePolicy');
            
            const shift = assignment?.shiftId || user?.shift;
            const policy = assignment?.policyId || user?.attendancePolicy;

            const shiftStartStr = shift?.startTime || "10:00";
            const [sh, sm] = shiftStartStr.split(':').map(Number);
            const shiftStart = moment(today).hour(sh).minute(sm);
            
            const gracePeriod = policy?.gracePeriodLate ?? 15;

            const { lateMinutes, isLate } = calculateLateMinutes(now, shiftStart, gracePeriod);
            const newStatus = 'ACTIVE';

            let record;
            if (existingRecord && (['ABSENT', 'On Leave', 'Absent'].includes(existingRecord.status))) {
                existingRecord.clockInTime = now.toDate();
                existingRecord.clockOutTime = null;
                existingRecord.totalHours = 0;
                existingRecord.breakMinutes = 0;
                existingRecord.breaks = [];
                existingRecord.isOnBreak = false;
                existingRecord.lateMinutes = lateMinutes;
                existingRecord.isLate = isLate;
                existingRecord.status = newStatus;
                await existingRecord.save();
                record = existingRecord;
            } else {
                record = await Attendance.create({
                    userId, date: today, clockInTime: now.toDate(),
                    status: newStatus,
                    lateMinutes: lateMinutes,
                    isLate: isLate
                });
            }
            return NextResponse.json({ message: "Clocked in successfully", record });

        } else if (action === 'startBreak') {
            const record = await Attendance.findOne({ userId, date: today, clockOutTime: null });
            if (!record) return NextResponse.json({ error: "Not clocked in." }, { status: 400 });
            const alreadyOnBreak = record.isOnBreak;
            if (alreadyOnBreak) return NextResponse.json({ error: "Already on break." }, { status: 400 });

            const updated = await Attendance.findByIdAndUpdate(
                record._id,
                { $set: { breakStartTime: new Date(), isOnBreak: true } },
                { new: true }
            );
            return NextResponse.json({ message: "Break started", record: updated });

        } else if (action === 'endBreak') {
            const record = await Attendance.findOne({ userId, date: today, clockOutTime: null });
            if (!record) return NextResponse.json({ error: "Not clocked in." }, { status: 400 });
            if (!record.isOnBreak) return NextResponse.json({ error: "Not on break." }, { status: 400 });

            const breakStart = record.breakStartTime;
            const breakEnd = new Date();
            const durationMins = moment(breakEnd).diff(moment(breakStart), 'minutes');

            const updated = await Attendance.findByIdAndUpdate(
                record._id,
                {
                    $push: { breaks: { startTime: breakStart, endTime: breakEnd, duration: durationMins } },
                    $inc: { breakMinutes: durationMins },
                    $set: { isOnBreak: false, breakStartTime: null, breakEndTime: breakEnd }
                },
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
                const breakStart = existingRecord.breakStartTime;
                const breakEnd = new Date();
                const durationMins = moment(breakEnd).diff(moment(breakStart), 'minutes');
                existingRecord.breaks.push({ startTime: breakStart, endTime: breakEnd, duration: durationMins });
                existingRecord.breakMinutes = (existingRecord.breakMinutes || 0) + durationMins;
                existingRecord.isOnBreak = false;
                existingRecord.breakStartTime = null;
                existingRecord.breakEndTime = breakEnd;
            }

            const clockOutTime = new Date();
            const clockInMoment = moment(existingRecord.clockInTime);
            const clockOutMoment = moment(clockOutTime);

            if (!clockOutMoment.isAfter(clockInMoment)) {
                return NextResponse.json({ error: "Clock Out time must be later than Clock In." }, { status: 400 });
            }

            // Calculate stats using the utility
            const tempRecord = {
                ...existingRecord.toObject(),
                clockOutTime: clockOutTime
            };
            const { calculateAttendanceStats } = await import('@/backend/lib/attendance-utils');
            const stats = await calculateAttendanceStats(tempRecord);

            // Update record fields
            existingRecord.clockOutTime = clockOutTime;
            existingRecord.grossPresenceMinutes = stats.grossPresenceMinutes;
            existingRecord.netWorkMinutes = stats.netWorkMinutes;
            existingRecord.totalHours = stats.totalHours;
            existingRecord.lateMinutes = stats.lateMinutes;
            existingRecord.earlyLogoutMinutes = stats.earlyLogoutMinutes;
            existingRecord.isLate = stats.isLate;
            existingRecord.isEarlyOut = stats.isEarlyOut;
            existingRecord.status = stats.status;

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
                        stats.totalHours,
                        workStatusFile
                    );
                }
            } catch (notifyErr) {
                console.error("[ATTENDANCE_API]: Failed to notify manager:", notifyErr);
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
        await import('@/backend/lib/attendance-utils').then(m => m.markAbsenteesToday());

        const { searchParams } = new URL(req.url);
        const filter = searchParams.get('filter');

        const userId = session.user.id;
        const userRole = (session.user as any).role;
        const isAdminHR = ['Admin', 'HR', 'HR Manager'].includes(userRole);

        let query: any = {};

        if (filter === 'present-today') {
            const todayStart = moment().startOf('day').toDate();
            const todayEnd = moment().endOf('day').toDate();
            query = {
                date: { $gte: todayStart, $lte: todayEnd },
                status: { $in: ['Present', 'Late', 'ACTIVE', 'FULL_DAY', 'HALF_DAY', 'Active'] }
            };
        } else if (filter === 'late-arrival' || filter === 'late') {
            const todayStart = moment().startOf('day').toDate();
            const todayEnd = moment().endOf('day').toDate();
            query = {
                date: { $gte: todayStart, $lte: todayEnd },
                isLate: true
            };
        } else if (filter === 'early-exit') {
            const todayStart = moment().startOf('day').toDate();
            const todayEnd = moment().endOf('day').toDate();
            query = {
                date: { $gte: todayStart, $lte: todayEnd },
                isEarlyOut: true
            };
        } else if (filter === 'on-time') {
            const todayStart = moment().startOf('day').toDate();
            const todayEnd = moment().endOf('day').toDate();
            query = {
                date: { $gte: todayStart, $lte: todayEnd },
                clockInTime: { $exists: true, $ne: null },
                isLate: false
            };
        } else if (filter === 'on-break') {
            const todayStart = moment().startOf('day').toDate();
            const todayEnd = moment().endOf('day').toDate();
            query = {
                date: { $gte: todayStart, $lte: todayEnd },
                isOnBreak: true
            };
        } else if (filter === 'auto-closed') {
            const todayStart = moment().startOf('day').toDate();
            const todayEnd = moment().endOf('day').toDate();
            query = {
                date: { $gte: todayStart, $lte: todayEnd },
                $or: [{ autoClosed: true }, { status: 'Auto Closed' }]
            };
        } else if (filter === 'absent-today') {
            const todayStart = moment().startOf('day').toDate();
            const todayEnd = moment().endOf('day').toDate();

            // 1. Get all active users (potentially filtered by hierarchy if not Admin/HR)
            let userQuery: any = { status: 'active' };
            if (!isAdminHR) {
                const managedIds = await getManagedUserIds(userId, userRole);
                const queryIds = Array.from(new Set([userId, ...managedIds]));
                userQuery._id = { $in: queryIds };
            }
            const activeUsers = await User.find(userQuery).select('name email role department employeeCode designation teamLeader reportingManager');

            // 2. Get today's attendance records for these users
            const todayAttendance = await Attendance.find({
                date: { $gte: todayStart, $lte: todayEnd },
                userId: { $in: activeUsers.map(u => u._id) }
            });

            // 3. Identify absentees
            const presentUserIds = new Set(
                todayAttendance
                    .filter(a => !['Absent', 'ABSENT', 'Auto Closed'].includes(a.status))
                    .map(a => a.userId.toString())
            );

            const absentees = activeUsers.filter(u => !presentUserIds.has(u._id.toString()));

            // 4. Transform into attendance-like records for the frontend
            const records = absentees.map(u => {
                const existingRecord = todayAttendance.find(a => a.userId.toString() === u._id.toString());
                return {
                    _id: existingRecord?._id || `absent-${u._id}`,
                    userId: u,
                    date: todayStart,
                    status: existingRecord?.status || 'Absent',
                    clockInTime: existingRecord?.clockInTime || null,
                    clockOutTime: existingRecord?.clockOutTime || null,
                    totalHours: existingRecord?.totalHours || 0,
                    isAbsentView: true // Flag for frontend
                };
            });

            return NextResponse.json({ records, unclosedSession: null, stats: {} });

        } else {
            // Default behavior: hierarchical visibility or general list
            const managedIds = await getManagedUserIds(userId, userRole);
            const queryIds = Array.from(new Set([userId, ...managedIds]));
            query.userId = { $in: queryIds };
        }

        // Apply hierarchical restrictions for non-Admin/HR on filtered views
        if (filter && !isAdminHR && !query.userId) {
            const managedIds = await getManagedUserIds(userId, userRole);
            const queryIds = Array.from(new Set([userId, ...managedIds]));
            query.userId = { $in: queryIds };
        }

        const records = await Attendance.find(query)
            .sort({ date: -1 })
            .populate('userId', 'name email role department employeeCode teamLeader reportingManager');

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
            present: monthRecords.filter(r => ['FULL_DAY', 'HALF_DAY', 'Present', 'Late', 'ACTIVE'].includes(r.status)).length,
            absent: monthRecords.filter(r => ['ABSENT', 'Absent'].includes(r.status)).length,
            late: monthRecords.filter(r => r.isLate).length,
            autoClosed: monthRecords.filter(r => r.autoClosed || r.status === 'Auto Closed').length,
            totalHours: totalWorkedMonthly,
            leaveBalance,
            monthlyLeaveTaken,
            todayBreak,
            earlyExits: monthRecords.filter(r => r.isEarlyOut || r.status === 'Early Logout').length,
            onTimeCheckins: monthRecords.filter(r => r.clockInTime && !r.isLate).length,
        };

        return NextResponse.json({ records, unclosedSession, stats });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
