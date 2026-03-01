import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth-config";

const handler = (req: any, res: any) => {
    console.log("NextAuth Handler called for method:", req.method);
    return NextAuth(authOptions)(req, res);
};

export { handler as GET, handler as POST };
