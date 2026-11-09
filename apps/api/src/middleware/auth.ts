import type { RequestHandler } from "express";

export const mockAuth: RequestHandler = (req, res, next) => {
  const tenantId = req.header("x-tenant-id");
  const userId = req.header("x-user-id");

  if (!tenantId || !userId) {
    return res.status(401).json({ error: "missing x-tenant-id or x-user-id" });
  }

  req.tenantId = tenantId;
  req.userId = userId;
  next();
};