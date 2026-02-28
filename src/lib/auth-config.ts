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

                await connectToDatabase();

                // --- SAFETY SEED DEFAULT ADMIN IF DB IS EMPTY ---
                const userCount = await User.countDocuments();
                if (userCount === 0) {
                    const adminPassword = await bcrypt.hash('admin123', 10);
                    await User.create({
                        name: 'System Admin',
                        email: 'admin@crm.com',
                        password: adminPassword,
                        role: 'Admin',
                        isActive: true,
                        onboardingStatus: 'Completed',
                        managerApproval: 'Approved',
                        hrApproval: 'Approved',
                        employeeCode: 'ADM-001'
                    });
                }

                const user = await User.findOne({ email: credentials.email });

                if (!user || !user.isActive) {
                    throw new Error("Invalid credentials or account inactive");
                }

                const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordCorrect) {
                    throw new Error("Invalid credentials");
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: { token: any, user: any }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }: { session: any, token: any }) {
            if (session?.user) {
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
    secret: process.env.NEXTAUTH_SECRET,
};
