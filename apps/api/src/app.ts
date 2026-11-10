import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { env } from "./env";
import { mockAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { connectionsRouter } from "./routes/connections";
import { financialsRouter } from "./routes/financials";
import { metricsRouter } from "./routes/metrics";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(pinoHttp({ level: env.LOG_LEVEL }));
  app.use(express.json());

  // Public routes (no auth)
  app.use(healthRouter);

  // Authenticated + tenant-scoped routes
  app.use(mockAuth, authRouter, connectionsRouter, financialsRouter, metricsRouter);

  app.use(errorHandler);
  return app;
}
