import mongoose from 'mongoose';

const HolidaySchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true, unique: true },
    type: { type: String, enum: ['National', 'Festival', 'Company Specific', 'Week Off'], default: 'Company Specific' },
}, { timestamps: true });

// Delete cached model to force schema refresh (prevents stale enum errors after updates)
if (mongoose.models.Holiday) {
    delete (mongoose.models as any).Holiday;
}

export default mongoose.model('Holiday', HolidaySchema);
