import { z } from "zod";

export function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw Object.assign(new Error("invalid request"), {
      status: 400,
      details: result.error.flatten(),
    });
  }
  return result.data;
}