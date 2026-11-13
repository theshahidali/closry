import IORedis from "ioredis";
import { env } from "./env";

export const bullConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const pubConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});