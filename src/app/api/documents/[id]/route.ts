import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import Document from "@/models/Document";
import User from "@/models/User";
import { unlink } from "fs/promises";
import { join } from "path";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        await connectToDatabase();
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const doc = await Document.findById(resolvedParams.id);
        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Only allow Admins, HR admins, or the specific OWNER to delete a file
        const userRole = (session.user as any)?.role;
        const isHRAdmin = ["Admin", "HR", "HR Manager"].includes(userRole);

        // Check ownership vs global access
        const currentUser = await User.findOne({ email: session.user?.email });

        if (!isHRAdmin && doc.ownerId.toString() !== currentUser?._id.toString()) {
            return NextResponse.json({ error: "Forbidden: You don't have permission to delete this document." }, { status: 403 });
        }

        // 1. Delete actual file from Disk
        try {
            const filePath = join(process.cwd(), "public", doc.fileUrl);
            await unlink(filePath);
        } catch (err) {
            // Log ignoring errors if file somehow already doesn't exist on disk
            console.warn("File was missing from disk before deletion:", err);
        }

        // 2. Delete metadata record from Mongo
        await Document.findByIdAndDelete(resolvedParams.id);

        return NextResponse.json({ message: "Document deleted successfully" }, { status: 200 });
    } catch (error: any) {
        console.error("Failed to delete document:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}
