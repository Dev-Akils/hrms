import mongoose from "mongoose";

const g = globalThis as unknown as { _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } };
const cache = (g._mongoose ||= { conn: null, promise: null });

// Cached connection so hot reloads / serverless invocations reuse one connection
export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set");
  if (cache.conn) return cache.conn;
  try {
    cache.promise ||= mongoose.connect(uri, { bufferCommands: false });
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }
  return cache.conn;
}
