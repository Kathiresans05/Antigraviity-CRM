import mongoose from 'mongoose';

const ShiftAssignmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePolicy', required: true },
    
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: { type: Date }, // Null means currently active
    
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
}, { timestamps: true });

// Ensure a user doesn't have overlapping active assignments
ShiftAssignmentSchema.index({ userId: 1, effectiveTo: 1 }, { unique: true, partialFilterExpression: { effectiveTo: null } });

export default mongoose.models.ShiftAssignment || mongoose.model('ShiftAssignment', ShiftAssignmentSchema);
