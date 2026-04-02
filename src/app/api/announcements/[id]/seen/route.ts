import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import Announcement from "@/backend/models/Announcement";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: announcementId } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = (session.user as any).id;

        await connectToDatabase();

        const announcement = await Announcement.findById(announcementId);
        if (!announcement) {
            return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
        }

        // Add user to viewedBy if not already present
        if (!announcement.viewedBy) announcement.viewedBy = [];
        const alreadyViewed = announcement.viewedBy.some(
            (id: any) => id.toString() === userId.toString()
        );

        if (!alreadyViewed) {
            announcement.viewedBy.push(userId);
            await announcement.save();
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to mark announcement as seen:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
