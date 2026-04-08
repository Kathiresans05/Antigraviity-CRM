import NextAuth from "next-auth";
import { authOptions } from "@/backend/lib/auth-config";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
