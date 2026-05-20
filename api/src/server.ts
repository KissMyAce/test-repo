// server.ts
import app from "./app";              // your Express app
import { connectDb } from "./config/db";
import cors from "cors";

// Add CORS middleware before connecting routes
app.use(
  cors({
    origin: "https://kissmyace-test-repo.vercel.app", // your frontend URL
    credentials: true, // allow cookies/auth headers if needed
  })
);

connectDb()
  .then(() => {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  });