import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    monthYear: { type: String, required: true }, // e.g., 'February 2026'
    baseSalary: { type: Number, required: true, default: 0 },
    bonus: { type: Number, required: true, default: 0 },
    deductions: { type: Number, required: true, default: 0 },
    netPay: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['Pending', 'Processed', 'Held'], default: 'Pending' },
    processedDate: { type: Date }
}, { timestamps: true });

export default mongoose.models.Payroll || mongoose.model('Payroll', PayrollSchema);
