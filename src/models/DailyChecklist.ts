import mongoose from 'mongoose';

const DailyChecklistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    items: [
        {
            id: { type: String, required: true },
            title: { type: String, required: true },
            completed: { type: Boolean, default: false }
        }
    ]
}, { timestamps: true });

export default mongoose.models.DailyChecklist || mongoose.model('DailyChecklist', DailyChecklistSchema);
