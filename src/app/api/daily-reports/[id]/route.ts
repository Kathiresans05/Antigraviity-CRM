import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import DailyReport from "@/models/DailyReport";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { id } = await context.params;
        const data = await req.json();

        await connectToDatabase();

        const report = await DailyReport.findOneAndUpdate(
            { _id: id, userId: userId }, // Only allow owner to update
            { ...data },
            { new: true }
        );

        if (!report) {
            return NextResponse.json({ error: "Report not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ report });
    } catch (error: any) {
        console.error("Daily Report PUT Error:", error);
        return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { id } = await context.params;

        await connectToDatabase();

        const deleted = await DailyReport.findOneAndDelete({ _id: id, userId: userId });

        if (!deleted) {
            return NextResponse.json({ error: "Report not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ message: "Report deleted successfully" });
    } catch (error: any) {
        console.error("Daily Report DELETE Error:", error);
        return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
    }
}
