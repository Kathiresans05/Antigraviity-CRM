import Attendance from "@/models/Attendance";
import User from "@/models/User";
import Leave from "@/models/Leave";
import Holiday from "@/models/Holiday";
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

    // Check if today is a Holiday
    const holidayToday = await Holiday.findOne({
        date: { $gte: todayStart, $lte: todayEnd }
    });

    // 1. Get all active employees whose joinDate is before today
    //    (new hires who started today should not be auto-marked absent)
    const todayDateOnly = moment().startOf('day').toDate();
    const activeEmployees = await User.find({
        isActive: true,
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
        if (holidayToday) {
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
 * Automatically closes attendance records from previous days that were left "IN PROGRESS".
 */
export async function closeStaleSessions() {
    const todayStart = moment().startOf('day').toDate();

    // Find all records older than today that don't have a clockOutTime
    // and aren't Absent/On Leave/Auto Closed
    const staleRecords = await Attendance.find({
        date: { $lt: todayStart },
        clockOutTime: null,
        status: { $nin: ['Absent', 'On Leave', 'Auto Closed'] }
    });

    if (staleRecords.length === 0) return { message: "No stale sessions found." };

    for (const record of staleRecords) {
        const recordDate = moment(record.date);
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

        record.auditLog.push({
            action: 'System Midnight Auto Close',
            by: null, // System Action
            timestamp: new Date(),
            details: 'System automatically closed stale session at 11:59 PM.'
        });

        await record.save();
    }

    console.log(`[closeStaleSessions] Auto-closed ${staleRecords.length} records.`);
    return { count: staleRecords.length };
}
