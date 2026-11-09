import { Router } from "express";
import { eq } from "drizzle-orm";
import { users } from "@closry/db";
import { tenantHandler } from "../middleware/tenant-handler";

export const authRouter = Router();

authRouter.get(
  "/api/auth/me",
  tenantHandler(async (req, tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);
    if (!user) {
      throw Object.assign(new Error("user not found"), { status: 404 });
    }
    return user;
  }),
);