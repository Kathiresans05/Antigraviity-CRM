import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import SupportTicket from "@/models/Support";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Technically, you might restrict status updates to Admins or IT staff only.
        // For broad company usage, we'll allow an Admin check if strict limits are needed.
        const isAdmin = (session.user as any).role === 'Admin';

        await connectToDatabase();
        const resolvedParams = await params;
        const { status, assignedTo } = await req.json();

        const ticket = await SupportTicket.findById(resolvedParams.id);

        if (!ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // Only let Admins change assignments or statuses directly (or the creators themselves if simple workflows are permitted)
        // Here we restrict modifying assignment and status purely to Admins for a true Helpdesk pipeline
        if (!isAdmin) {
            return NextResponse.json({ error: "Only administrators can update ticket statuses or assignees." }, { status: 403 });
        }

        if (status) ticket.status = status;
        if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null; // allow unassigning

        await ticket.save();
        await ticket.populate('createdBy', 'name email role');
        await ticket.populate('assignedTo', 'name email role');

        return NextResponse.json({
            message: "Ticket updated successfully",
            ticket
        });

    } catch (error: any) {
        console.error("Update Ticket Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const resolvedParams = await params;

        const ticket = await SupportTicket.findById(resolvedParams.id);

        if (!ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // Allow Admins to delete, or users to delete their OWN tickets
        const isAdmin = (session.user as any).role === 'Admin';
        if (!isAdmin && ticket.createdBy.toString() !== (session.user as any).id) {
            return NextResponse.json({ error: "Forbidden: You do not own this ticket" }, { status: 403 });
        }

        await SupportTicket.findByIdAndDelete(resolvedParams.id);

        return NextResponse.json({ message: "Support ticket deleted successfully" });

    } catch (error: any) {
        console.error("Delete Ticket Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
