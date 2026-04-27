import mongoose from 'mongoose';

const AttendancePolicySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    
    // Late Arrival Rules
    gracePeriodLate: { type: Number, default: 15 }, // minutes
    lateMarkingThreshold: { type: Number, default: 0 }, // minutes after grace period to mark as late
    
    // Early Logout Rules
    gracePeriodEarly: { type: Number, default: 0 }, // minutes before shift end
    
    // Classification Thresholds (in minutes)
    minHoursFullDay: { type: Number, default: 480 }, // 8 hours
    minHoursHalfDay: { type: Number, default: 240 }, // 4 hours
    absentThreshold: { type: Number, default: 120 }, // Mark absent if worked less than 2 hours
    
    // Break Rules
    maxBreakDuration: { type: Number, default: 60 }, // minutes
    isBreakIncludedInWorkingHours: { type: Boolean, default: false },
    
    // Working Days (0=Sunday, 1=Monday, ..., 6=Saturday)
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // Default Mon-Fri
    
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.AttendancePolicy || mongoose.model('AttendancePolicy', AttendancePolicySchema);
