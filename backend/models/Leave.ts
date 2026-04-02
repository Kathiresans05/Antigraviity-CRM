import mongoose from 'mongoose';

const LeaveSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Sick Leave', 'Casual Leave', 'Paid Leave', 'CompOff'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationType: { type: String, enum: ['Full Day', 'Half Day - Morning', 'Half Day - Afternoon'], default: 'Full Day' },
    reason: { type: String, required: true },
    description: { type: String },
    attachment: { type: String },
    totalDays: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    appliedOn: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.Leave || mongoose.model('Leave', LeaveSchema);
