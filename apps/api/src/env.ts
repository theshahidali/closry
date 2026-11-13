import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
});

export const env = EnvSchema.parse(process.env);