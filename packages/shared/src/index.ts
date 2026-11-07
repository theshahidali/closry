import { z } from "zod";

export const APP_NAME = "closry";

export const TenantSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	slug: z.string().min(1),
});

export type Tenant = z.infer<typeof TenantSchema>;

export const UserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	role: z.enum(["owner", "cfo", "viewer"]),
});

export type User = z.infer<typeof UserSchema>;

export function formatUser(u: User): string {
	return `${u.email} ${u.role}`;
}

export function isOwner(u: User): boolean {
	return u.role === "owner";
}