import { Queue } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAMES, QueueName } from "@closry/shared";
import { env } from "./env";

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const narrativeQueue = new Queue(QUEUE_NAMES.narrative, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
});