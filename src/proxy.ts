import { withAuth } from "next-auth/middleware";

export default withAuth({
    callbacks: {
        authorized: ({ req, token }) => {
            const path = req.nextUrl.pathname;

            // Allow public routes
            if (path.startsWith("/login") || path.startsWith("/api/auth")) {
                return true;
            }

            // Require token for all other routes
            return !!token;
        },
    },
    pages: {
        signIn: "/login",
    }
});

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (API routes used for auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - logo.png, logo.svg, etc. (public files)
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|login).*)"
    ],
};
