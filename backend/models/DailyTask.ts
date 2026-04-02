import mongoose from 'mongoose';

const DailyTaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true }, // The day the task is assigned for
    completed: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.DailyTask || mongoose.model('DailyTask', DailyTaskSchema);
