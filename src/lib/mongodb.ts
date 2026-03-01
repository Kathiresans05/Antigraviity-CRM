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
  console.log("connectToDatabase function start...");
  if (cached.conn) {
    console.log("Using cached DB connection.");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("No cached promise, creating new connection...");
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    };

    console.log("Calling mongoose.connect with URI...");
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log("Mongoose connected successfully.");
      return mongoose;
    }).catch(err => {
      console.error("Mongoose connection promise rejected:", err.message);
      throw err;
    });
  }
  
  console.log("Awaiting cached promise completion...");
  cached.conn = await cached.promise;
  console.log("Database connection established.");
  return cached.conn;
}

export default connectToDatabase;
