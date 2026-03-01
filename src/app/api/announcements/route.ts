import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import Announcement from "@/models/Announcement";
import User from "@/models/User";

export async function GET() {
    try {
        await connectToDatabase();
        const totalEmployees = await User.countDocuments({ isActive: true });
        const announcements = await Announcement.find().sort({ createdAt: -1 }).lean();

        const processedAnnouncements = announcements.map((ann: any) => {
            const viewedCount = ann.viewedBy ? ann.viewedBy.length : 0;
            const reachPercent = totalEmployees > 0
                ? Math.round((viewedCount / totalEmployees) * 100)
                : 0;

            return {
                ...ann,
                reach: `${reachPercent}%`
            };
        });

        return NextResponse.json(processedAnnouncements);
    } catch (error: any) {
        console.error("Failed to fetch announcements:", error);
        return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { title, content, priority, status, date, includeCrmLink } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        const newAnnouncement = await Announcement.create({
            title,
            content,
            author: session.user.name,
            authorId: (session.user as any).id,
            priority: priority || "General",
            status: status || "Broadcasted",
            date: date ? new Date(date) : new Date(),
            includeCrmLink: includeCrmLink || false,
            reach: "0%"
        });

        return NextResponse.json(newAnnouncement, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create announcement:", error);
        return NextResponse.json({ error: "Failed to create announcement", details: error.message }, { status: 500 });
    }
}
