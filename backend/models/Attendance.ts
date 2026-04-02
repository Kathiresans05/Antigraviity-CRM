import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    clockInTime: { type: Date },
    clockOutTime: { type: Date },
    shiftStartTime: { type: String, default: '10:00' },
    breaks: [{
        startTime: { type: Date },
        endTime: { type: Date },
        duration: { type: Number } // in minutes
    }],
    breakStartTime: { type: Date }, // Current active break
    breakEndTime: { type: Date },   // Last break end
    breakMinutes: { type: Number, default: 0 },
    isOnBreak: { type: Boolean, default: false },
    status: { type: String, enum: ['Present', 'Late', 'Half Day', 'Absent', 'On Leave', 'Auto Closed', 'Early Logout', 'Holiday', 'Full Day', 'Active', 'ACTIVE', 'HALF_DAY', 'FULL_DAY', 'ABSENT'], default: 'Present' },
    totalHours: { type: Number, default: 0 }, // This remains for backward compatibility but we'll use netWorkMinutes for logic
    lateMinutes: { type: Number, default: 0 },
    earlyLogoutMinutes: { type: Number, default: 0 },
    grossPresenceMinutes: { type: Number, default: 0 },
    netWorkMinutes: { type: Number, default: 0 },
    isLate: { type: Boolean, default: false },
    isEarlyOut: { type: Boolean, default: false },
    autoClosed: { type: Boolean, default: false },
    correctionRequested: { type: Boolean, default: false },
    correctionDetails: {
        reason: { type: String },
        requestedTimeIn: { type: Date },
        requestedTimeOut: { type: Date },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
    },
    auditLog: [{
        action: { type: String },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        details: { type: String }
    }],
    workStatusUpload: { type: String },
    workStatusFile: { type: String }
}, { timestamps: true });

if (process.env.NODE_ENV === 'development') {
    delete (mongoose as any).models.Attendance;
}

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
