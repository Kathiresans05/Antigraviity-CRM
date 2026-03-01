import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    clockInTime: { type: Date },
    clockOutTime: { type: Date },
    breakStartTime: { type: Date },
    breakEndTime: { type: Date },
    breakMinutes: { type: Number, default: 0 },
    isOnBreak: { type: Boolean, default: false },
    status: { type: String, enum: ['Present', 'Late', 'Half Day', 'Absent', 'On Leave', 'Auto Closed', 'Early Logout', 'Holiday'], default: 'Present' },
    totalHours: { type: Number, default: 0 },
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

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
