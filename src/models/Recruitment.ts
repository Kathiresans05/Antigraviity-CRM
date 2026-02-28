import mongoose, { Document } from 'mongoose';

export interface IRecruitment extends Document {
    // Candidate Info
    name: string;
    email: string;
    phone?: string;
    // Job Info
    role: string;
    department: string;
    // Pipeline
    status: 'Applied' | 'Screening' | 'Interview' | 'Technical' | 'Offered' | 'Hired' | 'Rejected';
    rating: number; // 1.0 – 5.0
    // Application
    appliedAt: Date;
    resumeUrl?: string;
    source?: string; // LinkedIn, Referral, Job Board, etc.
    notes?: string;
    // Job Opening ref
    jobTitle?: string;
    experienceYears?: number;
    createdAt: Date;
    updatedAt: Date;
}

const RecruitmentSchema = new mongoose.Schema<IRecruitment>({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    role: { type: String, required: true },
    department: { type: String, required: true },
    status: {
        type: String,
        enum: ['Applied', 'Screening', 'Interview', 'Technical', 'Offered', 'Hired', 'Rejected'],
        default: 'Applied'
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    appliedAt: { type: Date, default: Date.now },
    resumeUrl: { type: String },
    source: { type: String, default: 'Job Board' },
    notes: { type: String },
    jobTitle: { type: String },
    experienceYears: { type: Number, default: 0 },
}, { timestamps: true });

delete mongoose.models.Recruitment;
export default mongoose.models.Recruitment || mongoose.model<IRecruitment>('Recruitment', RecruitmentSchema);
