import { createPool } from "@closry/db";
import { env } from "./env";

export const pool = createPool(env.DATABASE_URL);