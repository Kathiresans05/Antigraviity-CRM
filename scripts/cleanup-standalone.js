const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Basic env parser
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const uri = env.MONGODB_URI;

if (!uri) {
    console.error("MONGODB_URI not found");
    process.exit(1);
}

const UserSchema = new mongoose.Schema({
    role: String,
    managerApproval: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function cleanup() {
    try {
        await mongoose.connect(uri);
        console.log("Connected to DB");

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
