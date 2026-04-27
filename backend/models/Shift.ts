import mongoose from 'mongoose';

const ShiftSchema = new mongoose.Schema({
    name: { type: String, required: true },
    shiftType: { 
        type: String, 
        enum: ['General', 'Night', 'Flexible', 'Rotational'], 
        default: 'General' 
    },
    startTime: { type: String, required: true }, // "HH:mm" format
    endTime: { type: String, required: true },   // "HH:mm" format
    halfDayCutoffTime: { type: String, default: "11:30" },
    description: { type: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Shift || mongoose.model('Shift', ShiftSchema);
