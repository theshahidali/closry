const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const DEMO_TENANT = "11111111-1111-1111-1111-111111111111";
const DEMO_USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "x-tenant-id": DEMO_TENANT,
      "x-user-id": DEMO_USER,
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}