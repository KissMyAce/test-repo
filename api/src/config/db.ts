// config/db.ts
import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDb = async () => {
  if (!env.mongoUri || env.mongoUri.trim() === "") {
    console.error("❌ CRITICAL: MONGODB_URI environment variable is missing!");
    return;
  }

  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("🚀 MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
};