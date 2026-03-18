import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import DailyReport from "@/models/DailyReport";
import mongoose from 'mongoose';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const search = searchParams.get('search');

        const userRole = (session.user as any).role;
        const userId = (session.user as any).id;

        await connectToDatabase();

        let query: any = {};

        // Normal employees only see their own reports
        if (!['Admin', 'Manager', 'Assigned Manager', 'HR', 'HR Manager'].includes(userRole)) {
            query.userId = userId;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        if (search) {
            query.$or = [
                { projectName: { $regex: search, $options: 'i' } },
                { 'tasks.title': { $regex: search, $options: 'i' } }
            ];
        }

        const reports = await DailyReport.find(query)
            .populate('userId', 'name role')
            .sort({ date: -1, createdAt: -1 });

        return NextResponse.json({ reports });
    } catch (error: any) {
        console.error("Daily Reports GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const data = await req.json();

        await connectToDatabase();

        const report = await DailyReport.create({
            ...data,
            userId,
            date: data.date ? new Date(data.date) : new Date()
        });

        return NextResponse.json({ report }, { status: 201 });
    } catch (error: any) {
        console.error("Daily Reports POST Error:", error);
        return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
    }
}
