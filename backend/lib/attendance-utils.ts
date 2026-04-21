import Attendance from "@/backend/models/Attendance";
import User from "@/backend/models/User";
import Leave from "@/backend/models/Leave";
import Holiday from "@/backend/models/Holiday";
import moment from "moment";

/**
 * Automatically marks active employees as "Absent" if they haven't clocked in by 11:00 AM.
 */
export async function markAbsenteesToday() {
    const now = moment();
    const absenteeThreshold = moment().startOf('day').hour(11).minute(0);

    // Only run if it's past 11:00 AM
    if (now.isBefore(absenteeThreshold)) {
        return { message: "Too early for absentee check." };
    }

    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();

    // Check if today is a Holiday or a Sunday (Weekly Off)
    const holidayToday = await Holiday.findOne({
        date: { $gte: todayStart, $lte: todayEnd }
    });
    const isSunday = moment().day() === 0; // 0 is Sunday
    const isWeeklyOff = isSunday;

    // 1. Get all active employees whose joinDate is before today
    //    (new hires who started today should not be auto-marked absent)
    const todayDateOnly = moment().startOf('day').toDate();
    const activeEmployees = await User.find({
        status: 'active',
        $or: [
            { joinDate: { $lt: todayDateOnly } },
            { joinDate: { $exists: false } },
            { joinDate: null },
        ],
    }).select('_id');
    const employeeIds = activeEmployees.map(emp => emp._id);

    // 2. Get all attendance records for today using a range
    const attendanceRecords = await Attendance.find({
        date: { $gte: todayStart, $lte: todayEnd }
    }).select('userId');
    const clockedInIds = attendanceRecords.map(rec => rec.userId.toString());

    // 3. Find employees who have NO attendance record for today
    const absenteeIds = employeeIds.filter(id => !clockedInIds.includes(id.toString()));

    if (absenteeIds.length === 0) {
        return { message: "No new absentees to mark." };
    }

    // 4. Find approved leaves for today
    const approvedLeaves = await Leave.find({
        status: 'Approved',
        startDate: { $lte: todayEnd },
        endDate: { $gte: todayStart }
    }).select('userId');
    const onLeaveIds = approvedLeaves.map(leave => leave.userId.toString());

    // 5. Create "Absent", "On Leave", or "Holiday" records for them
    const newRecords = absenteeIds.map(userId => {
        let status = 'Absent';
        if (holidayToday || isWeeklyOff) {
            status = 'Holiday';
        } else if (onLeaveIds.includes(userId.toString())) {
            status = 'On Leave';
        }
        return {
            userId,
            date: todayStart,
            status,
        };
    });

    await Attendance.insertMany(newRecords);
    console.log(`[markAbsenteesToday] Inserted ${newRecords.length} records.`);

    // 6. ADDED FEATURE: Auto-close any unclosed sessions from previous days
    await closeStaleSessions();

    return {
        message: `Marked ${absenteeIds.length} employees as absent.`,
    };
}

/**
 * Calculates attendance statistics based on business rules.
 * Business Rules:
 * - Office Timing: 9:00 AM - 6:00 PM
 * - Gross Presence Required: 9 hours (540 mins)
 * - Mandatory Break: 1 hour (60 mins)
 * - Net Work Required: 8 hours (480 mins)
 */

export const SHIFT_START_TIME = "10:00";
export const GRACE_PERIOD_MINUTES = 0;

export function getShiftStartMoment(date: moment.Moment | Date) {
    return moment(date).startOf('day').hour(10).minute(0);
}

export function calculateLateMinutes(clockInTime: Date | moment.Moment, shiftStart: moment.Moment) {
    const clockIn = moment(clockInTime);
    const lateMins = Math.max(0, clockIn.diff(shiftStart.clone().add(GRACE_PERIOD_MINUTES, 'minutes'), 'minutes'));
    return {
        lateMinutes: lateMins,
        isLate: lateMins > 0
    };
}
export function calculateAttendanceStats(record: any) {
    if (!record.clockInTime) return record;

    const clockIn = moment(record.clockInTime);
    const clockOut = record.clockOutTime ? moment(record.clockOutTime) : moment();
    const today = moment(record.date).startOf('day');
    const shiftStart = today.clone().hour(10).minute(0);
    const expectedLogout = clockIn.clone().add(9, 'hours');

    // 1. Gross Presence
    const grossMinutes = clockOut.diff(clockIn, 'minutes');

    // 2. Break Time
    let totalBreakMins = record.breakMinutes || 0;
    // If still on break, add current session to calculation (don't save yet)
    if (record.isOnBreak && record.breakStartTime) {
        totalBreakMins += moment().diff(moment(record.breakStartTime), 'minutes');
    }

    // 3. Net Work Time
    const netMins = Math.max(0, grossMinutes - totalBreakMins);

    // 4. Late Login (Threshold: 10:00 AM)
    const { lateMinutes, isLate: lateFlag } = calculateLateMinutes(clockIn, shiftStart);

    // 5. Early Logout (Relative to Expected Logout = ClockIn + 9h)
    let earlyLogoutMins = 0;
    if (record.clockOutTime) {
        earlyLogoutMins = Math.max(0, expectedLogout.diff(clockOut, 'minutes'));
    }

    // 6. Classification & Flags
    let status = record.status;
    let isLate = lateFlag;
    let isEarlyOut = record.clockOutTime ? earlyLogoutMins >= 60 : false;

    if (!record.clockOutTime) {
        status = 'ACTIVE';
    } else {
        if (grossMinutes >= 9 * 60 && netMins >= 8 * 60) {
            status = 'FULL_DAY';
        } else if (netMins >= 4 * 60) {
            status = 'HALF_DAY';
        } else {
            status = 'ABSENT';
        }
    }

    return {
        ...record,
        grossPresenceMinutes: grossMinutes,
        netWorkMinutes: netMins,
        totalHours: parseFloat((netMins / 60).toFixed(2)),
        lateMinutes: lateMinutes,
        earlyLogoutMinutes: earlyLogoutMins,
        isLate,
        isEarlyOut,
        status,
        expectedLogoutTime: expectedLogout.toDate()
    };
}

/**
 * Automatically closes attendance records from previous days that were left "IN PROGRESS".
 */
export async function closeStaleSessions() {
    const todayStart = moment().startOf('day').toDate();

    const staleRecords = await Attendance.find({
        date: { $lt: todayStart },
        clockOutTime: null,
        status: { $nin: ['Absent', 'On Leave', 'Auto Closed'] }
    });

    if (staleRecords.length === 0) return { message: "No stale sessions found." };

    for (const record of staleRecords) {
        const recordDate = moment(record.date);
        const autoCloseTime = recordDate.clone().hour(21).minute(0).toDate(); // Close at 9:00 PM of that day

        record.clockOutTime = autoCloseTime;

        // Calculate stats with auto-close time
        const stats = calculateAttendanceStats(record);

        record.grossPresenceMinutes = stats.grossPresenceMinutes;
        record.netWorkMinutes = stats.netWorkMinutes;
        record.totalHours = stats.totalHours;
        record.lateMinutes = stats.lateMinutes;
        record.earlyLogoutMinutes = stats.earlyLogoutMinutes;
        record.status = 'Auto Closed';
        record.autoClosed = true;
        record.isOnBreak = false;

        record.auditLog.push({
            action: 'System Midnight Auto Close',
            by: null,
            timestamp: new Date(),
            details: 'System automatically closed stale session at 9:00 PM.'
        });

        await record.save();
    }

    console.log(`[closeStaleSessions] Auto-closed ${staleRecords.length} records.`);
    return { count: staleRecords.length };
}
