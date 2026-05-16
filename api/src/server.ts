import { app } from "./app.js";
import { connectDb } from "./config/db.js";

// 1. Invoke the database connection asynchronously without blocking container startup
connectDb().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Database connection failed during startup:", error);
});

// 2. Export the app instance directly for Vercel's serverless routing
export default app;
