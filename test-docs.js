const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const docSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.models.Document || mongoose.model("Document", docSchema);

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const docs = await Document.find({}).lean();
    console.log("Total docs:", docs.length);
    console.log("Categories:");
    docs.filter(d => !!d.category).forEach(d => {
        console.log(`- ID: ${d._id}, Name: ${d.name}, Category: "${d.category}"`);
    });
    process.exit(0);
}
run().catch(console.error);
