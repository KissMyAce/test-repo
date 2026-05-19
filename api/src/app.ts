// app.ts
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";
import { apiV1Router } from "./routes/index.js";

const app = express(); // create instance

app.use(requestId);
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/v1", apiV1Router);

app.use((_req, res) => {
  res.status(404).json({ error: "NOT_FOUND" });
});

app.use(errorHandler);

export default app; // <-- default export