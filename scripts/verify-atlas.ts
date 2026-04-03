import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../backend/models/User';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

async function verifyDB() {
    try {
        console.log("Connecting to Atlas for verification...");
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("Connected.");

        const users = await User.find({ email: /admin|emp/ });
        console.log(`Found ${users.length} users in DB.`);
        
        for (const user of users) {
          console.log(`User: ${user.email}, Role: ${user.role}, IsActive: ${user.isActive}`);
          const isMatch = await bcrypt.compare('password123', user.password);
          console.log(`Password 'password123' match: ${isMatch}`);
        }

        process.exit(0);
    } catch (err) {
        console.error("Verification error:", err);
        process.exit(1);
    }
}

verifyDB();
