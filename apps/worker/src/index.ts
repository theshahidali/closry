import { Worker, Queue } from "bullmq";
import { QUEUE_NAMES } from "@closry/shared";
import { env } from "./env";
import { bullConnection } from "./connection";
import { processNarrativeJob, type NarrativeJobData } from "./processors/compute";

new Queue(QUEUE_NAMES.narrative, { connection: bullConnection });

const worker = new Worker<NarrativeJobData>(
  QUEUE_NAMES.narrative,
  processNarrativeJob,
  {
    connection: bullConnection,
    concurrency: 3, // one worker process handles 3 jobs at a time
  },
);

worker.on("completed", (job) => {
  console.log(`[job ${job.id}] completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[job ${job?.id}] failed:`, err.message);
});

console.log("worker started, listening for jobs");

async function shutdown() {
  console.log("shutting down worker...");
  await worker.close();
  await bullConnection.quit();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);