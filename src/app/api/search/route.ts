import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim();

        if (!q || q.length < 2) return NextResponse.json({ results: [] });

        await connectToDatabase();

        const regex = new RegExp(q, "i");

        const users = await User.find({
            $or: [
                { name: { $regex: regex } },
                { email: { $regex: regex } },
                { designation: { $regex: regex } },
                { department: { $regex: regex } },
                { employeeCode: { $regex: regex } },
            ],
        })
            .select("name email designation department employeeCode role _id")
            .limit(8)
            .lean();

        const results = users.map((u: any) => ({
            id: u._id,
            name: u.name || u.email,
            subtitle: `${u.designation || u.role || "Employee"} · ${u.department || ""}`.trim().replace(/·\s*$/, ""),
            href: `/employees/${u._id}`,
            type: "employee",
        }));

        return NextResponse.json({ results });
    } catch (error) {
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
