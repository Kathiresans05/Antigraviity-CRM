import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import connectToDatabase from "../backend/lib/mongodb";
import User from "../backend/models/User";
import mongoose from "mongoose";

async function cleanup() {
    try {
        await connectToDatabase();
        const result = await User.updateMany(
            {
                role: { $in: ['Manager', 'HR', 'HR Manager', 'Admin'] },
                managerApproval: 'Pending'
            },
            { $set: { managerApproval: 'Approved' } }
        );
        console.log(`Updated ${result.modifiedCount} users to auto-approved manager status.`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

cleanup();
