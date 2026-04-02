import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import SupportTicket from "@/backend/models/Support";
import User from "@/backend/models/User"; // Ensure registered

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const isAdmin = (session.user as any).role === 'Admin';
        const userId = (session.user as any).id;

        // Admins see all tickets, employees see only their own
        const query = isAdmin ? {} : { createdBy: userId };

        const tickets = await SupportTicket.find(query)
            .populate('createdBy', 'name email role')
            .populate('assignedTo', 'name email role')
            .sort({ createdAt: -1 });

        return NextResponse.json({ tickets, isAdmin });

    } catch (error: any) {
        console.error("Fetch Support Tickets Error:", error);
        return NextResponse.json({ error: "Failed to fetch support tickets" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const userId = (session.user as any).id;
        const { title, description, category, priority } = await req.json();

        if (!title || !description) {
            return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
        }

        const newTicket = await SupportTicket.create({
            title,
            description,
            category: category || 'General',
            priority: priority || 'Medium',
            createdBy: userId,
            status: 'Open',
        });

        // Optionally populate for Immediate Return Display
        await newTicket.populate('createdBy', 'name email role');

        return NextResponse.json({
            message: "Support ticket created successfully",
            ticket: newTicket
        }, { status: 201 });

    } catch (error: any) {
        console.error("Create Ticket Error:", error);
        return NextResponse.json({ error: error.message || "Failed to create support ticket" }, { status: 500 });
    }
}
