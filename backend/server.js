import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import apiRouter, { initDefaultData } from "./routes.js";
import { connectDb } from "./db.js";

dotenv.config();

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

const startServerWithFallback = async (preferredPort) => {
  const maxAttempts = 10;

  for (let port = preferredPort; port < preferredPort + maxAttempts; port += 1) {
    const server = await new Promise((resolve, reject) => {
      const candidate = app.listen(port, () => {
        resolve({ port, server: candidate });
      });

      candidate.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          resolve({ port: null, server: null });
          return;
        }

        reject(error);
      });
    });

    if (server && server.port) {
      return server;
    }
  }

  throw new Error(`No free port found starting from ${preferredPort}.`);
};

connectDb()
  .then(async () => {
    await initDefaultData();
    const serverState = await startServerWithFallback(PORT);
    const actualPort = serverState.port;
    process.env.BACKEND_PORT = String(actualPort);
    console.log(`StayNest backend running at http://localhost:${actualPort}`);
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB or start the server.", error);
    process.exit(1);
  });
