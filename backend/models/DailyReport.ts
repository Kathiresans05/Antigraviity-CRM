import mongoose from 'mongoose';

const DailyReportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    projectName: { type: String, required: true },
    tasks: [
        {
            title: { type: String, required: true },
            description: { type: String },
            timeSpent: { type: Number, required: true },
            status: { type: String, enum: ['Completed', 'In Progress', 'Blocked'], default: 'In Progress' },
            priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' }
        }
    ],
    totalHours: { type: Number, required: true },
    summary: { type: String },
    blockers: { type: String },
    tomorrowPlan: { type: String },
    status: { type: String, enum: ['Completed', 'Pending'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.models.DailyReport || mongoose.model('DailyReport', DailyReportSchema);
