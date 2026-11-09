import { Router } from "express";
import { connections } from "@closry/db";
import { tenantHandler } from "../middleware/tenant-handler";

export const connectionsRouter = Router();

connectionsRouter.get(
  "/api/connections",
  tenantHandler(async (_req, tx) => {
    return tx.select().from(connections);
  }),
);