import { Router } from "express";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  narrativeRuns,
  variances as variancesTable,
  driverAttributions,
  companyMemory,
} from "@closry/db";
import { parseInput } from "../validation";
import { tenantHandler } from "../middleware/tenant-handler";
import { narrativeQueue } from "../queue";
import { QUEUE_NAMES } from "@closry/shared";
import { RUN_CHANNEL } from "../sse";

const TriggerBody = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
});

const ListQuery = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const narrativeRouter = Router();

// --- POST /api/narrative/runs ---
narrativeRouter.post(
  "/api/narrative/runs",
  tenantHandler(async (req, tx) => {
    const body = parseInput(TriggerBody, req.body);
    const periodMonth = `${body.month}-01`;

    const [run] = await tx
      .insert(narrativeRuns)
      .values({
        tenantId: req.tenantId!,
        periodMonth,
        status: "queued",
        progress: 0,
        triggeredBy: req.userId,
      })
      .returning();

    await narrativeQueue.add(QUEUE_NAMES.narrative, {
      runId: run.id,
      tenantId: req.tenantId!,
      periodMonth,
    });

    return run;
  }),
);

// --- GET /api/narrative/runs ---
narrativeRouter.get(
  "/api/narrative/runs",
  tenantHandler(async (req, tx) => {
    const q = parseInput(ListQuery, req.query);
    const conditions = q.month
      ? [eq(narrativeRuns.periodMonth, `${q.month}-01`)]
      : [];
    return tx
      .select()
      .from(narrativeRuns)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(narrativeRuns.createdAt))
      .limit(50);
  }),
);

// --- GET /api/narrative/runs/:id ---
narrativeRouter.get(
  "/api/narrative/runs/:id",
  tenantHandler(async (req, tx) => {
    const id = req.params.id;
    const [run] = await tx
      .select()
      .from(narrativeRuns)
      .where(eq(narrativeRuns.id, id))
      .limit(1);
    if (!run) throw Object.assign(new Error("run not found"), { status: 404 });
    return run;
  }),
);

// --- GET /api/narrative/runs/:id/variances ---
narrativeRouter.get(
  "/api/narrative/runs/:id/variances",
  tenantHandler(async (req, tx) => {
    const id = req.params.id;
    const rows = await tx
      .select()
      .from(variancesTable)
      .where(eq(variancesTable.runId, id))
      .orderBy(desc(variancesTable.delta));
    return rows.map((r) => ({
      id: r.id,
      accountCode: r.accountCode,
      accountName: r.accountName,
      currentValue: Number(r.currentValue),
      priorValue: Number(r.priorValue),
      delta: Number(r.delta),
      deltaPct: Number(r.deltaPct),
      materiality: r.materiality,
    }));
  }),
);

narrativeRouter.get(
  "/api/narrative/runs/:id/events",
  async (req, res, next) => {
    if (!req.tenantId) {
      return res.status(401).end();
    }
    const runId = req.params.id;

    try {
      const { withTenant, narrativeRuns } = await import("@closry/db");
      const { pool } = await import("../db");
      const { eq } = await import("drizzle-orm");

      const rows = await withTenant(pool, req.tenantId, (tx) =>
        tx.select().from(narrativeRuns).where(eq(narrativeRuns.id, runId)).limit(1),
      );
      if (rows.length === 0) return res.status(404).end();

      const run = rows[0];

      // 2. Set SSE headers.
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // disables nginxstyle buffering
      });

      // 3. Emit current state immediately so reconnects aren't blind.
      res.write(`event: state\ndata: ${JSON.stringify(run)}\n\n`);

      // If already terminal, close immediately after emitting state.
      if (run.status === "review" || run.status === "complete" || run.status === "failed") {
        res.write(`event: complete\ndata: ${JSON.stringify(run)}\n\n`);
        return res.end();
      }

      // 4. Subscribe to progress events for this run.
      const { redis } = await import("../queue");
      const sub = redis.duplicate();
      await sub.subscribe(RUN_CHANNEL(runId));

      // 5. Forward. The worker publishes `{step, progress, message}` JSON.
      sub.on("message", (_channel, message) => {
        res.write(`event: progress\ndata: ${message}\n\n`);
        // Optional: parse and close if the worker announced terminal status.
        try {
          const parsed = JSON.parse(message) as { step: string };
          if (parsed.step === "review" || parsed.step === "failed") {
            res.write(`event: complete\ndata: ${message}\n\n`);
            res.end();
          }
        } catch {
          // if message is malformed, don't crash — just skip the close logic
        }
      });

      // 6. Heartbeat: some proxies kill idle SSE connections after 60s.
      //    A comment line every 25s keeps the pipe warm.
      const heartbeat = setInterval(() => res.write(`: ping\n\n`), 25_000);

      // 7. Cleanup on client disconnect.
      req.on("close", async () => {
        clearInterval(heartbeat);
        try {
          await sub.unsubscribe(RUN_CHANNEL(runId));
          await sub.quit();
        } catch {
          /* best-effort */
        }
        res.end();
      });
    } catch (err) {
      next(err);
    }
  },
);

narrativeRouter.get(
  "/api/narrative/runs/:id/drivers",
  tenantHandler(async (req, tx) => {
    const runId = req.params.id;
    const rows = await tx
      .select({
        id: driverAttributions.id,
        varianceId: driverAttributions.varianceId,
        driverText: driverAttributions.driverText,
        confidence: driverAttributions.confidence,
        status: driverAttributions.status,
        userCorrection: driverAttributions.userCorrection,
        confirmedAt: driverAttributions.confirmedAt,
        accountCode: variancesTable.accountCode,
        accountName: variancesTable.accountName,
        currentValue: variancesTable.currentValue,
        priorValue: variancesTable.priorValue,
        delta: variancesTable.delta,
        deltaPct: variancesTable.deltaPct,
        materiality: variancesTable.materiality,
      })
      .from(driverAttributions)
      .innerJoin(variancesTable, eq(variancesTable.id, driverAttributions.varianceId))
      .where(eq(driverAttributions.runId, runId))
      .orderBy(desc(variancesTable.delta));
    return rows.map((r) => ({
      ...r,
      confidence: Number(r.confidence),
      currentValue: Number(r.currentValue),
      priorValue: Number(r.priorValue),
      delta: Number(r.delta),
      deltaPct: Number(r.deltaPct),
    }));
  }),
);

const DriverPatchBody = z.object({
  status: z.enum(["confirmed", "corrected", "rejected"]),
  userCorrection: z.string().min(1).optional(),
});

narrativeRouter.patch(
  "/api/narrative/runs/:id/drivers/:driverId",
  tenantHandler(async (req, tx) => {
    const { id: runId, driverId } = req.params;
    const body = parseInput(DriverPatchBody, req.body);

    if (body.status === "corrected" && !body.userCorrection) {
      throw Object.assign(
        new Error("userCorrection required when status = corrected"),
        { status: 400 },
      );
    }

    // Load the driver + join variance to know accountCode for memory write.
    const [driver] = await tx
      .select({
        id: driverAttributions.id,
        varianceId: driverAttributions.varianceId,
        runId: driverAttributions.runId,
        accountCode: variancesTable.accountCode,
      })
      .from(driverAttributions)
      .innerJoin(variancesTable, eq(variancesTable.id, driverAttributions.varianceId))
      .where(
        and(
          eq(driverAttributions.id, driverId),
          eq(driverAttributions.runId, runId),
        ),
      )
      .limit(1);

    if (!driver) {
      throw Object.assign(new Error("driver not found"), { status: 404 });
    }

    const now = new Date();
    const [updated] = await tx
      .update(driverAttributions)
      .set({
        status: body.status,
        userCorrection: body.userCorrection ?? null,
        confirmedBy: req.userId,
        confirmedAt: now,
      })
      .where(eq(driverAttributions.id, driverId))
      .returning();

    // Upsert into company_memory on confirm OR correct.
    if (body.status === "confirmed" || body.status === "corrected") {
      const pattern =
        body.status === "corrected"
          ? body.userCorrection!
          : updated.driverText;
      await tx
        .insert(companyMemory)
        .values({
          tenantId: req.tenantId!,
          accountCode: driver.accountCode,
          driverPattern: pattern,
        })
        .onConflictDoUpdate({
          target: [
            companyMemory.tenantId,
            companyMemory.accountCode,
            companyMemory.driverPattern,
          ],
          set: {
            evidenceCount: sql`${companyMemory.evidenceCount} + 1`,
            lastConfirmedAt: now,
          },
        });
    }

    return {
      ...updated,
      confidence: Number(updated.confidence),
    };
  }),
);