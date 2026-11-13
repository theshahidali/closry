import { pubConnection } from "./connection";

export async function publishRunEvent(
  runId: string,
  event: { step: string; progress: number; message: string; status?: string },
): Promise<void> {
  await pubConnection.publish(`run:${runId}`, JSON.stringify(event));
}

export const RUN_CHANNEL = (runId: string) => `run:${runId}`;