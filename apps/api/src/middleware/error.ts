import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error({ err }, "request failed");
  if (res.headersSent) return;
  const status = typeof err.status === "number" ? err.status : 500;
  res.status(status).json({
    error: status === 500 ? "internal_server_error" : (err.message ?? "error"),
    ...(err.details ? { details: err.details } : {}),
  });
};