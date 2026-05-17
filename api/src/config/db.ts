import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDb = async () => {
  // 🚨 This correctly catches BOTH undefined variables and empty strings ("")
  if (!env.mongoUri || env.mongoUri.trim() === "") {
    console.error("❌ CRITICAL: MONGODB_URI environment variable is missing or empty!");
    return; 
  }

  try {
    // Prevent opening duplicate connections during serverless invocations
    if (mongoose.connection.readyState >= 1) return;

    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("🚀 MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error; // Passes the connection error to Vercel logs
  }
};
