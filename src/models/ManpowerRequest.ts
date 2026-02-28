import mongoose from 'mongoose';

const ManpowerRequestSchema = new mongoose.Schema({
    department: { type: String, required: true },
    position: { type: String, required: true },
    count: { type: Number, required: true, default: 1 },
    reason: { type: String, enum: ['Replacement', 'New Project', 'Expansion', 'Attrition'], default: 'New Project' },
    budgetApproved: { type: Boolean, default: false },
    requestedBy: { type: String, required: true },
    approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    approvedBy: { type: String },
    notes: { type: String },
    convertedToJob: { type: Boolean, default: false },
    jobOpeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobOpening' },
}, { timestamps: true });

delete mongoose.models.ManpowerRequest;
export default mongoose.models.ManpowerRequest || mongoose.model('ManpowerRequest', ManpowerRequestSchema);
