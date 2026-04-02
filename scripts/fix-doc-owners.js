const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const docSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.models.Document || mongoose.model("Document", docSchema);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model("User", userSchema);

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);

    // Find all users with documents
    const users = await User.find({ "documents": { $exists: true, $ne: {} } }).lean();
    console.log(`Found ${users.length} users with documents`);

    for (const user of users) {
        if (!user.documents) continue;
        const name = user.name || `${user.firstName} ${user.lastName}`.trim();

        // Extract URLs
        const urls = Object.values(user.documents).filter(url => typeof url === 'string');

        if (urls.length > 0) {
            console.log(`Updating documents for employee: ${name}`);
            const result = await Document.updateMany(
                { fileUrl: { $in: urls } },
                { $set: { owner: name } }
            );
            console.log(`  Updated ${result.modifiedCount} documents.`);
        }
    }

    process.exit(0);
}

run().catch(console.error);
