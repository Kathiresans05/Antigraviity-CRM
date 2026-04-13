const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await mongoose.connection.db.collection('users').updateOne(
        { email: 'admin@admin.com' },
        { $set: { password: hashedPassword, isActive: true, status: 'active', role: 'Admin' } }
    );
    console.log('Password reset successfully to admin123!');
    process.exit();
});
