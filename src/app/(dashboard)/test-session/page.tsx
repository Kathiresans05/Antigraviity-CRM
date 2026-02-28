"use client";

import { useSession } from "next-auth/react";

export default function TestSessionPage() {
    const { data: session, status } = useSession();

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Session Debug</h1>
            <p><strong>Status:</strong> {status}</p>
            <pre className="bg-gray-100 p-4 rounded mt-4 overflow-auto max-w-full">
                {JSON.stringify(session, null, 2)}
            </pre>
            <div className="mt-8">
                <p><strong>Is Admin (Strict):</strong> {(session?.user as any)?.role === "Admin" ? "Yes" : "No"}</p>
                <p><strong>Actual Role:</strong> {(session?.user as any)?.role || "Undefined"}</p>
            </div>
        </div>
    );
}
