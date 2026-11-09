import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error({ err }, "request failed");
  if (res.headersSent) return;
  res.status(500).json({ error: "internal_server_error" });
};