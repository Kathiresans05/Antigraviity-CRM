import mongoose from 'mongoose';

const STAGES = ['Applied', 'Screening', 'Interview Round 1', 'Interview Round 2', 'HR Round', 'Offered', 'Hired', 'Rejected'];

const ApplicantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobOpening', required: true },
    jobTitle: { type: String },
    department: { type: String },
    stage: { type: String, enum: STAGES, default: 'Applied' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    experienceYears: { type: Number, default: 0 },
    skills: [{ type: String }],
    source: { type: String, default: 'Job Board' },
    notes: { type: String },
    offerLetterSent: { type: Boolean, default: false },
    appliedAt: { type: Date, default: Date.now },
    stageHistory: [{
        stage: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: String,
    }],
}, { timestamps: true });

delete mongoose.models.Applicant;
export default mongoose.models.Applicant || mongoose.model('Applicant', ApplicantSchema);
