import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    // Verify connection is still alive
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }
    // Reset stale connection
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('[DB] Connected successfully.');
      return mongoose;
    }).catch(err => {
      console.error('[DB] Connection failed:', err.message);
      // Clear the failed promise so the next request retries
      cached.promise = null;
      cached.conn = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDatabase;
