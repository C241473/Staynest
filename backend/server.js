import express from "express";
import cors from "cors";
import apiRouter, { initDefaultData } from "./routes.js";
import { connectDb } from "./db.js";

const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 5050);
const app = express();

const allowedOrigins = [
  /^http:\/\/localhost:(5173|5174|5175|4173|3000)$/,
  /^http:\/\/127\.0\.0\.1:(5173|5174|5175|4173|3000)$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((pattern) => pattern.test(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS policy rejected this origin."));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "staynest-backend",
    message: "StayNest backend is running.",
    apiBase: "/api",
    health: "/api/health",
  });
});

app.use("/api", apiRouter);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Server error." });
});

connectDb()
  .then(async () => {
    await initDefaultData();
    app.listen(PORT, () => {
      console.log(`StayNest backend running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB.", error);
    process.exit(1);
  });
