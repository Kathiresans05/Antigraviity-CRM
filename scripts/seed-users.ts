import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../backend/models/User';

dotenv.config({ path: '.env.local' });

async function seedUsers() {
    try {
        console.log("Connecting to Atlas...");
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("Connected to Atlas.");

        const password = await bcrypt.hash('admin123', 10);

        // Clear existing users to avoid duplicates
        await User.deleteMany({});

        const users = [
            {
                name: 'System Admin',
                email: 'admin@admin.com',
                password: password,
                role: 'Admin',
                isActive: true,
                onboardingStatus: 'Completed',
                managerApproval: 'Approved',
                hrApproval: 'Approved',
                employeeCode: 'ADM-001'
            },
            {
                name: 'Test Employee',
                email: 'emp@test.com',
                password: password,
                role: 'Employee',
                isActive: true,
                onboardingStatus: 'Completed',
                managerApproval: 'Approved',
                hrApproval: 'Approved',
                employeeCode: 'EMP-001'
            }
        ];

        for (const user of users) {
            const exists = await User.findOne({ email: user.email });
            if (!exists) {
                await User.create(user);
                console.log(`Created user: ${user.email}`);
            } else {
                console.log(`User already exists: ${user.email}`);
            }
        }

        console.log("User seeding completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("User seed error:", err);
        process.exit(1);
    }
}

seedUsers();
