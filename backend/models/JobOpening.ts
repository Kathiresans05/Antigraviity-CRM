import mongoose from 'mongoose';

const JobOpeningSchema = new mongoose.Schema({
    title: { type: String, required: true },
    department: { type: String, required: true },
    jobType: { type: String, enum: ['Full-time', 'Part-time', 'Internship', 'Contract'], default: 'Full-time' },
    workMode: { type: String, enum: ['Onsite', 'Remote', 'Hybrid'], default: 'Onsite' },
    location: { type: String, default: 'Chennai' },
    openings: { type: Number, default: 1 },
    hiredCount: { type: Number, default: 0 },
    experienceRequired: { type: String, default: '0-2 years' },
    salaryMin: { type: Number, default: 0 },
    salaryMax: { type: Number, default: 0 },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    targetJoiningDate: { type: Date },
    hiringManager: { type: String },
    hrApprover: { type: String },
    finalApprover: { type: String },
    status: {
        type: String,
        enum: ['Draft', 'Pending', 'Active', 'Closed', 'OnHold'],
        default: 'Draft'
    },
    responsibilities: { type: String },
    skills: [{ type: String }],
    qualifications: { type: String },
    benefits: { type: String },
    manpowerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ManpowerRequest' },
    publishedPlatforms: [{
        name: { type: String },
        status: { type: String, enum: ['Pending', 'Posted', 'Failed'], default: 'Pending' },
        postedAt: { type: Date }
    }],
    publishedAt: { type: Date },
}, { timestamps: true });

delete mongoose.models.JobOpening;
export default mongoose.models.JobOpening || mongoose.model('JobOpening', JobOpeningSchema);
