import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/lib/auth-config";
import connectToDatabase from "@/backend/lib/mongodb";
import User from "@/backend/models/User";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import fs from "fs";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: employeeId } = await context.params;
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const documentType = formData.get("documentType") as string; // e.g., 'aadharCard'

        if (!file || !documentType) {
            return NextResponse.json({ error: "File and documentType are required" }, { status: 400 });
        }

        const employee = await User.findById(employeeId);
        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), "public", "uploads", "compliance", employeeId);
        if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const originalExt = file.name.split(".").pop() || "";
        const safeFileName = `${documentType}-${Date.now()}.${originalExt}`;
        const filePath = join(uploadDir, safeFileName);

        await writeFile(filePath, buffer);
        const fileUrl = `/uploads/compliance/${employeeId}/${safeFileName}`;

        // Update User document
        const updateObj: any = {};
        updateObj[`documents.${documentType}`] = {
            url: fileUrl,
            status: 'Uploaded',
            uploadedAt: new Date()
        };

        const updatedUser = await User.findByIdAndUpdate(employeeId, { $set: updateObj }, { new: true });

        return NextResponse.json({ message: "File uploaded successfully", fileUrl, user: updatedUser });
    } catch (error: any) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);

        if (!session || !['Admin', 'HR', 'HR Manager'].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: employeeId } = await context.params;
        const { documentType, status, feedback } = await req.json();

        if (!documentType || !status) {
            return NextResponse.json({ error: "documentType and status are required" }, { status: 400 });
        }

        const updateObj: any = {};
        updateObj[`documents.${documentType}.status`] = status;
        if (feedback !== undefined) {
            updateObj[`documents.${documentType}.feedback`] = feedback;
        }

        const updatedUser = await User.findByIdAndUpdate(employeeId, { $set: updateObj }, { new: true });

        return NextResponse.json({ message: `Document status updated to ${status}`, user: updatedUser });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 });
    }
}
