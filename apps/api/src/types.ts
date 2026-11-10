declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      log: import("pino").Logger;
    }
  }
}
export {};