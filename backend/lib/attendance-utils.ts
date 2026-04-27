import Attendance from "@/backend/models/Attendance";
import User from "@/backend/models/User";
import Leave from "@/backend/models/Leave";
import Holiday from "@/backend/models/Holiday";
import Shift from "@/backend/models/Shift";
import AttendancePolicy from "@/backend/models/AttendancePolicy";
import ShiftAssignment from "@/backend/models/ShiftAssignment";
import connectToDatabase from "@/backend/lib/mongodb";
import moment from "moment";

/**
 * Automatically marks active employees as "Absent" if they haven't clocked in and it's a working day.
 */
export async function markAbsenteesToday() {
    await connectToDatabase();
    const now = moment();
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const dayOfWeek = moment().day(); // 0-6

    // Check if today is a Holiday
    const holidayToday = await Holiday.findOne({
        date: { $gte: todayStart, $lte: todayEnd }
    });

    // Get all active employees who joined before today
    const activeEmployees = await User.find({
        status: 'active',
        $or: [
            { joinDate: { $lt: todayStart } },
            { joinDate: { $exists: false } },
            { joinDate: null },
        ],
    }).populate('shift').populate('attendancePolicy');

    let markedCount = 0;
    for (const user of activeEmployees) {
        // 1. Determine the shift and policy for this user
        // Priority: ShiftAssignment > User fields > Defaults
        const assignment = await ShiftAssignment.findOne({
            userId: user._id,
            effectiveFrom: { $lte: todayEnd },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: todayStart } }]
        }).populate('shiftId').populate('policyId');

        const shift = assignment?.shiftId || user.shift;
        const policy = assignment?.policyId || user.attendancePolicy;

        // Default timings if nothing assigned
        let shiftStartTime = "10:00";
        let workingDays = [1, 2, 3, 4, 5]; // Mon-Fri

        if (shift) shiftStartTime = shift.startTime;
        if (policy) workingDays = policy.workingDays;

        const [h, m] = shiftStartTime.split(':').map(Number);
        const shiftStart = moment().startOf('day').hour(h).minute(m);
        
        // Skip if shift hasn't started yet (plus 2 hour buffer)
        if (now.isBefore(shiftStart.clone().add(2, 'hours'))) {
            continue;
        }

        const existing = await Attendance.findOne({ userId: user._id, date: todayStart });
        if (!existing) {
            // Check if user is on leave
            const onLeave = await Leave.findOne({
                userId: user._id,
                status: 'Approved',
                startDate: { $lte: todayStart },
                endDate: { $gte: todayStart }
            });

            const isWorkingDay = workingDays.includes(dayOfWeek);
            
            let status = 'ABSENT';
            if (holidayToday) {
                status = 'Holiday';
            } else if (!isWorkingDay) {
                status = 'Weekly Off';
            } else if (onLeave) {
                status = 'On Leave';
            }

            // Only mark as ABSENT if it's a working day and not holiday/leave
            await Attendance.create({
                userId: user._id,
                date: todayStart,
                status,
                clockInTime: null,
                clockOutTime: null,
                totalHours: 0
            });
            markedCount++;
        }
    }

    await closeStaleSessions();
    return { message: `Marked ${markedCount} employees as absent/on-leave/holiday/weekly-off.` };
}

export async function getShiftStartMoment(userId: string, date: moment.Moment | Date) {
    await connectToDatabase();
    
    // Check for assignment first
    const today = moment(date).startOf('day');
    const assignment = await ShiftAssignment.findOne({
        userId,
        effectiveFrom: { $lte: moment(date).endOf('day').toDate() },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today.toDate() } }]
    }).populate('shiftId');

    if (assignment?.shiftId) {
        const [hours, minutes] = assignment.shiftId.startTime.split(':').map(Number);
        return today.clone().hour(hours).minute(minutes);
    }

    const user = await User.findById(userId).populate('shift');
    if (user && user.shift) {
        const [hours, minutes] = user.shift.startTime.split(':').map(Number);
        return today.clone().hour(hours).minute(minutes);
    }
    
    // Fallback to default 10:00 AM
    return today.clone().hour(10).minute(0);
}

export function calculateLateMinutes(clockInTime: Date | moment.Moment, shiftStart: moment.Moment, gracePeriod: number = 0) {
    const clockIn = moment(clockInTime);
    const lateMins = Math.max(0, clockIn.diff(shiftStart.clone().add(gracePeriod, 'minutes'), 'minutes'));
    return {
        lateMinutes: lateMins,
        isLate: lateMins > 0
    };
}

export async function calculateAttendanceStats(record: any) {
    if (!record.clockInTime) return record;

    await connectToDatabase();
    const today = moment(record.date).startOf('day');
    const todayEnd = moment(record.date).endOf('day');

    // Get active assignment or fall back to user fields
    const assignment = await ShiftAssignment.findOne({
        userId: record.userId,
        effectiveFrom: { $lte: todayEnd.toDate() },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today.toDate() } }]
    }).populate('shiftId').populate('policyId');

    const user = await User.findById(record.userId).populate('shift').populate('attendancePolicy');
    
    const shift = assignment?.shiftId || user?.shift;
    const policy = assignment?.policyId || user?.attendancePolicy;

    const clockIn = moment(record.clockInTime);
    const clockOut = record.clockOutTime ? moment(record.clockOutTime) : moment();
    
    // Policy & Shift Defaults
    let shiftStart = today.clone().hour(10).minute(0);
    let shiftEnd = today.clone().hour(19).minute(0);
    let shiftType = 'General';
    let halfDayCutoff = today.clone().hour(11).minute(30);

    let gracePeriodLate = 15;
    let gracePeriodEarly = 0;
    let minHoursFullDay = 480;
    let minHoursHalfDay = 240;
    let absentThreshold = 120;
    let isBreakIncluded = false;
    
    if (shift) {
        const [sh, sm] = shift.startTime.split(':').map(Number);
        shiftStart = today.clone().hour(sh).minute(sm);
        
        const [eh, em] = shift.endTime.split(':').map(Number);
        shiftEnd = today.clone().hour(eh).minute(em);

        const [ch, cm] = (shift.halfDayCutoffTime || "11:30").split(':').map(Number);
        halfDayCutoff = today.clone().hour(ch).minute(cm);
        
        shiftType = shift.shiftType || 'General';
    }

    if (policy) {
        gracePeriodLate = policy.gracePeriodLate ?? 15;
        gracePeriodEarly = policy.gracePeriodEarly ?? 0;
        minHoursFullDay = policy.minHoursFullDay ?? 480;
        minHoursHalfDay = policy.minHoursHalfDay ?? 240;
        absentThreshold = policy.absentThreshold ?? 120;
        isBreakIncluded = policy.isBreakIncludedInWorkingHours ?? false;
    }

    // 1. Gross Presence
    const grossMinutes = clockOut.diff(clockIn, 'minutes');

    // 2. Break Time
    let totalBreakMins = record.breakMinutes || 0;
    if (record.isOnBreak && record.breakStartTime) {
        totalBreakMins += moment().diff(moment(record.breakStartTime), 'minutes');
    }

    // 3. Net Work Time
    const netMins = isBreakIncluded ? grossMinutes : Math.max(0, grossMinutes - totalBreakMins);

    // 4. Late Login (Not applicable for Flexible shifts)
    let lateMinutes = 0;
    let isLate = false;
    if (shiftType !== 'Flexible') {
        const lateResult = calculateLateMinutes(clockIn, shiftStart, gracePeriodLate);
        lateMinutes = lateResult.lateMinutes;
        isLate = lateResult.isLate;
    }

    // 5. Early Logout (Relative to Shift End Time, not applicable for Flexible)
    let earlyLogoutMins = 0;
    let isEarlyOut = false;
    if (shiftType !== 'Flexible' && record.clockOutTime) {
        earlyLogoutMins = Math.max(0, shiftEnd.diff(clockOut, 'minutes'));
        isEarlyOut = earlyLogoutMins > gracePeriodEarly;
    }

    // 6. Classification & Flags
    let status = record.status;

    // Half-Day Policy: Clock-in after cutoff automatically makes it a Half Day (if not Flexible)
    const isLateForHalfDay = shiftType !== 'Flexible' && clockIn.isAfter(halfDayCutoff);

    if (!record.clockOutTime) {
        status = 'ACTIVE';
    } else {
        if (netMins < absentThreshold) {
            status = 'ABSENT';
        } else if (isLateForHalfDay) {
            status = 'HALF_DAY';
        } else if (netMins >= minHoursFullDay) {
            status = 'FULL_DAY';
        } else if (netMins >= minHoursHalfDay) {
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
        shiftType // for UI reference
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
        status: { $nin: ['Absent', 'On Leave', 'Auto Closed', 'Weekly Off', 'Holiday'] }
    });

    if (staleRecords.length === 0) return { message: "No stale sessions found." };

    for (const record of staleRecords) {
        const recordDate = moment(record.date);
        const autoCloseTime = recordDate.clone().hour(21).minute(0).toDate(); // Close at 9:00 PM of that day

        record.clockOutTime = autoCloseTime;

        // Calculate stats with auto-close time
        const stats = await calculateAttendanceStats(record);

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

