import mongoose from 'mongoose';

const MeetingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    client: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    type: { type: String, enum: ['Video Call', 'In Person', 'Phone Call'], required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);
