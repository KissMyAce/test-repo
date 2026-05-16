import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { app } from "./app";
import { connectDb } from "./config/db";

// 1. Immediately invoke the database connection asynchronously.
// Serverless environments reuse this connection across multiple warm invocations.
connectDb().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Database connection failed during startup:", error);
});

// 2. Fix: Export the app instance directly for Vercel's serverless handler
export default app;
