import type { RequestHandler } from "express";

export const mockAuth: RequestHandler = (req, res, next) => {
  const tenantId =
    req.header("x-tenant-id") ?? (req.query.tenant_id as string | undefined);
  const userId =
    req.header("x-user-id") ?? (req.query.user_id as string | undefined);

  if (!tenantId || !userId) {
    return res.status(401).json({ error: "missing tenant/user identity" });
  }

  req.tenantId = tenantId;
  req.userId = userId;
  next();
};