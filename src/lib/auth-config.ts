import CredentialsProvider from "next-auth/providers/credentials";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing email or password");
                }

                console.log("Authorize called for email:", credentials.email);
                try {
                  console.log("Calling connectToDatabase from Authorize...");
                  await connectToDatabase();
                  console.log("Returned from connectToDatabase in Authorize.");
                } catch (dbErr: any) {
                  console.error("CRITICAL DB ERROR IN AUTHORIZE:", dbErr.message);
                  throw new Error("Login failed: Database error");
                }

                try {
                  console.log("Querying for user email...");
                  const user = await User.findOne({ email: credentials.email });
                  console.log("User found:", user ? "YES" : "NO");

                  if (!user) {
                    console.log("No user found with this email.");
                    return null;
                  }

                  if (user.status === 'inactive' || !user.isActive) {
                    console.log("User account is inactive.");
                    return null;
                  }

                  console.log("Comparing passwords...");
                  const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
                  console.log("Password match result:", isPasswordCorrect);

                  if (!isPasswordCorrect) {
                      console.log("Password mismatch for user:", user.email);
                      return null;
                  }

                  console.log("Authentication successful for:", user.email, "Role:", user.role);
                  return {
                      id: user._id.toString(),
                      email: user.email,
                      name: user.name,
                      role: user.role,
                  };
                } catch (queryErr: any) {
                  console.error("QUERY ERROR in Authorize:", queryErr.message);
                  return null;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: { token: any, user: any }) {
            if (user) {
                console.log("JWT Callback - Initializing token with user:", user.email, "Role:", user.role);
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }: { session: any, token: any }) {
            if (session?.user) {
                console.log("Session Callback - Mapping token to session for:", session.user.email, "Role:", token.role);
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt" as const,
    },
    secret: process.env.NEXTAUTH_SECRET || "default_local_secret_for_development_only",
};
