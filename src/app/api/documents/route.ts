import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import Document from "@/models/Document";
import User from "@/models/User";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import fs from "fs";

export async function GET() {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Optionally restrict standard Users to only see their own files
        // But keeping it open like a shared drive if HR needs to see everything
        // Let's allow everyone to see all documents for now like a public board
        // Filter out if specific scope needed
        const documents = await Document.find()
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(documents);
    } catch (error: any) {
        console.error("Failed to fetch documents:", error);
        return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const category = formData.get("category") as string;
        const customName = formData.get("customName") as string | null;
        const employeeName = formData.get("employeeName") as string | null;

        if (!file || !category) {
            return NextResponse.json({ error: "File and category are required", details: `File: ${!!file}, Category: ${category}` }, { status: 400 });
        }

        // Validate User
        const user = await User.findOne({ email: session.user?.email });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save File locally to public/uploads/documents/
        const uploadDir = join(process.cwd(), "public", "uploads", "documents");

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Handle duplicate filenames gracefully and apply customName if present
        const originalExt = file.name.split(".").pop() || "";
        const baseNameToUse = customName ?
            `${customName}.${originalExt}` : file.name;

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const safeFileName = baseNameToUse.replace(/[^a-zA-Z0-9.-]/g, "_");
        const newFileName = `${uniqueSuffix}-${safeFileName}`;
        const filePath = join(uploadDir, newFileName);

        await writeFile(filePath, buffer);

        // Get File Extension for Type
        const ext = safeFileName.split(".").pop()?.toUpperCase() || "FILE";

        // Save metadata to DB
        const newDoc = await Document.create({
            name: safeFileName,
            type: ext,
            size: file.size,
            category,
            owner: employeeName || user.name,
            ownerId: user._id,
            fileUrl: `/uploads/documents/${newFileName}`,
        });

        return NextResponse.json(newDoc, { status: 201 });
    } catch (error: any) {
        console.error("Failed to upload document:", error);
        return NextResponse.json({ error: "Failed to upload document", details: error.message || error.toString() }, { status: 500 });
    }
}
