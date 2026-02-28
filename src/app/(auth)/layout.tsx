import React from "react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth pages (login, register) don't need the Sidebar or Dashboard Header.
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            {children}
        </div>
    );
}
