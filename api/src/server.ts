// server.ts
import app from "./app";              // your Express app
import { connectDb } from "./config/db";
import cors from "cors";

const allowedOrigins = [
  "https://kissmyace-test-repo.vercel.app",
  "https://www.example.com"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
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