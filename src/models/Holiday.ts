import mongoose from 'mongoose';

const HolidaySchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true, unique: true },
    type: { type: String, enum: ['National', 'Festival', 'Company Specific'], default: 'Company Specific' },
}, { timestamps: true });

export default mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);
