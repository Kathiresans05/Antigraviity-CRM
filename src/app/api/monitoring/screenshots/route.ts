import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/backend/lib/mongodb';
import mongoose from 'mongoose';

// Screenshot Model
const ScreenshotSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    employeeName: { type: String, required: true },
    imageUrl: { type: String, required: true },
    activeApp: { type: String },
    windowTitle: { type: String },
    capturedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Screenshot = mongoose.models.Screenshot || mongoose.model('Screenshot', ScreenshotSchema);

// GET /api/monitoring/screenshots - Fetch saved screenshots (admin view)
export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const date = searchParams.get('date');

        const query: any = {};
        if (userId) query.userId = userId;
        if (date) {
            const start = new Date(date);
            const end = new Date(start.getTime() + 86400000);
            query.capturedAt = { $gte: start, $lt: end };
        }

        const screenshots = await Screenshot.find(query)
            .sort({ capturedAt: -1 })
            .limit(100);

        return NextResponse.json({ success: true, screenshots });
    } catch (err: any) {
        console.error('[API] Screenshots GET Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST /api/monitoring/screenshots - Save a screenshot from the desktop agent
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { userId, employeeName, imageUrl, activeApp, windowTitle } = await req.json();

        if (!userId || !imageUrl) {
            return NextResponse.json({ error: 'userId and imageUrl are required' }, { status: 400 });
        }

        const newScreenshot = new Screenshot({
            userId,
            employeeName,
            imageUrl,
            activeApp,
            windowTitle,
        });

        await newScreenshot.save();
        return NextResponse.json({ success: true }, { status: 201 });
    } catch (err: any) {
        console.error('[API] Screenshots POST Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
