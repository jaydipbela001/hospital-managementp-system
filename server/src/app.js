import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { connectDatabase } from "./config/database.js";
import { apiRouter } from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cookieParser());

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Serve local uploads statically
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// General rate limiter for API routes
app.use("/api", apiLimiter);

// Health check endpoint (can be checked without blocking on DB)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "API is healthy" });
});

// Database connection middleware for all API routes (cached for serverless)
app.use("/api", async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

// Main versioned API router
app.use("/api/v1", apiRouter);

// 404 & Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

export default app;
