const moment = require('moment');

/**
 * Calculates attendance statistics based on business rules.
 */
function calculateAttendanceStats(record) {
    if (!record.clockInTime) return record;

    const clockIn = moment(record.clockInTime);
    const clockOut = record.clockOutTime ? moment(record.clockOutTime) : moment();
    const today = moment(record.date).startOf('day');
    const shiftStart = today.clone().hour(9).minute(0);
    const expectedLogout = clockIn.clone().add(9, 'hours');

    // 1. Gross Presence
    const grossMinutes = clockOut.diff(clockIn, 'minutes');

    // 2. Break Time
    let totalBreakMins = record.breakMinutes || 0;
    if (record.isOnBreak && record.breakStartTime) {
        totalBreakMins += moment().diff(moment(record.breakStartTime), 'minutes');
    }

    // 3. Net Work Time
    const netMins = Math.max(0, grossMinutes - totalBreakMins);

    // 4. Late Login (Threshold 9:00 AM)
    const lateMins = Math.max(0, clockIn.diff(shiftStart, 'minutes'));

    // 5. Early Logout (Relative to Expected Logout = ClockIn + 9h)
    let earlyLogoutMins = 0;
    if (record.clockOutTime) {
        earlyLogoutMins = Math.max(0, expectedLogout.diff(clockOut, 'minutes'));
    }

    // 6. Classification
    let status = record.status;
    if (record.clockOutTime) {
        if (grossMinutes >= 9 * 60 && netMins >= 8 * 60) {
            status = 'Full Day';
        } else if (netMins >= 4 * 60) {
            status = 'Half Day';
        } else {
            status = 'Absent';
        }
    }

    return {
        grossPresenceMinutes: grossMinutes,
        netWorkMinutes: netMins,
        totalHours: parseFloat((netMins / 60).toFixed(2)),
        lateMinutes: lateMins,
        earlyLogoutMinutes: earlyLogoutMins,
        status: record.clockOutTime ? status : record.status,
        expectedLogoutTime: expectedLogout.toDate()
    };
}

function testScenario(name, record) {
    console.log(`\n--- Test: ${name} ---`);
    const results = calculateAttendanceStats(record);
    console.log(`Gross Presence: ${results.grossPresenceMinutes} mins (${(results.grossPresenceMinutes / 60).toFixed(2)}h)`);
    console.log(`Net Work Time: ${results.netWorkMinutes} mins (${(results.netWorkMinutes / 60).toFixed(2)}h)`);
    console.log(`Status: ${results.status}`);
    console.log(`Late Mins: ${results.lateMinutes}`);
    console.log(`Early Logout Mins: ${results.earlyLogoutMinutes}`);

    // Validate business rules
    if (name === "Normal Full Day") {
        if (results.status === 'Full Day') console.log("✅ PASS: Correctly marked as Full Day");
        else console.log("❌ FAIL: Should be Full Day");
    }
    if (name === "Short Break, 9h Presence") {
        if (results.status === 'Full Day') console.log("✅ PASS: Correctly marked as Full Day even with short break (must stay 9h)");
        else console.log("❌ FAIL: Should be Full Day");
    }
    if (name === "Early Exit Attempt (Blocked in real logic)") {
        if (results.status !== 'Full Day') console.log("✅ PASS: Correctly NOT marked as Full Day");
        else console.log("❌ FAIL: Should not be Full Day");
    }
}

const today = moment().startOf('day');

// Scenario 1: Perfect Full Day (9:00 AM to 6:00 PM, 1h break)
testScenario("Normal Full Day", {
    date: today.toDate(),
    clockInTime: today.clone().hour(9).minute(0).toDate(),
    clockOutTime: today.clone().hour(18).minute(0).toDate(),
    breakMinutes: 60,
    status: 'Active'
});

// Scenario 2: Late Login, Stay Late (10:00 AM to 7:00 PM, 1h break)
testScenario("Late Login, Full Day", {
    date: today.toDate(),
    clockInTime: today.clone().hour(10).minute(0).toDate(),
    clockOutTime: today.clone().hour(19).minute(0).toDate(),
    breakMinutes: 60,
    status: 'Active'
});

// Scenario 3: Short Break, but forced 9h presence (9:00 AM to 6:00 PM, 30m break)
testScenario("Short Break, 9h Presence", {
    date: today.toDate(),
    clockInTime: today.clone().hour(9).minute(0).toDate(),
    clockOutTime: today.clone().hour(18).minute(0).toDate(),
    breakMinutes: 30,
    status: 'Active'
});

// Scenario 4: Long Break, must stay extra (9:00 AM to 6:20 PM, 1h 20m break)
testScenario("Long Break, Must Stay Extra", {
    date: today.toDate(),
    clockInTime: today.clone().hour(9).minute(0).toDate(),
    clockOutTime: today.clone().hour(18).minute(20).toDate(),
    breakMinutes: 80,
    status: 'Active'
});

// Scenario 5: Early Exit attempt (9:00 AM to 5:30 PM, 30m break)
testScenario("Early Exit Attempt (Blocked in real logic)", {
    date: today.toDate(),
    clockInTime: today.clone().hour(9).minute(0).toDate(),
    clockOutTime: today.clone().hour(17).minute(30).toDate(),
    breakMinutes: 30,
    status: 'Active'
});

// Scenario 6: Half Day (9:00 AM to 1:30 PM, no break)
testScenario("Half Day", {
    date: today.toDate(),
    clockInTime: today.clone().hour(9).minute(0).toDate(),
    clockOutTime: today.clone().hour(13).minute(30).toDate(),
    breakMinutes: 0,
    status: 'Active'
});
