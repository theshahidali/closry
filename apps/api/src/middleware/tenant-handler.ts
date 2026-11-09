import type { Request, Response, NextFunction } from "express";
import { withTenant, type Tx } from "@closry/db";
import { pool } from "../db";

export function tenantHandler<B>(
  handler: (req: Request, tx: Tx) => Promise<B>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantId) {
      return res.status(401).json({ error: "no tenant context" });
    }
    try {
      const body = await withTenant(pool, req.tenantId, (tx) =>
        handler(req, tx),
      );
      res.json(body);
    } catch (err) {
      next(err);
    }
  };
}