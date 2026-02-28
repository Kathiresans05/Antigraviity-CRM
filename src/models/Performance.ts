import mongoose, { Schema, Document } from 'mongoose';

export interface IPerformance extends Document {
    userId: mongoose.Types.ObjectId;
    reviewCycle: string; // e.g. "Q1 2026"
    score: number; // 0.0 - 5.0
    status: 'Exceeds Expectations' | 'Met Expectations' | 'Needs Improvement' | 'Under Review';
    lastReviewDate: Date;
    nextReviewDate: Date;
    goalCompletion: number; // 0-100%
    skills: {
        communication: number;
        technical: number;
        leadership: number;
        punctuality: number;
        teamwork: number;
        adaptability: number;
    };
    reviewerNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PerformanceSchema = new Schema<IPerformance>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reviewCycle: { type: String, required: true },
        score: { type: Number, required: true, min: 0, max: 5 },
        status: {
            type: String,
            enum: ['Exceeds Expectations', 'Met Expectations', 'Needs Improvement', 'Under Review'],
            default: 'Under Review'
        },
        lastReviewDate: { type: Date, default: Date.now },
        nextReviewDate: { type: Date },
        goalCompletion: { type: Number, default: 0, min: 0, max: 100 },
        skills: {
            communication: { type: Number, default: 0 },
            technical: { type: Number, default: 0 },
            leadership: { type: Number, default: 0 },
            punctuality: { type: Number, default: 0 },
            teamwork: { type: Number, default: 0 },
            adaptability: { type: Number, default: 0 },
        },
        reviewerNotes: { type: String, default: '' },
    },
    { timestamps: true }
);

// Unique review per user per cycle
PerformanceSchema.index({ userId: 1, reviewCycle: 1 }, { unique: true });

export default mongoose.models.Performance || mongoose.model<IPerformance>('Performance', PerformanceSchema);
