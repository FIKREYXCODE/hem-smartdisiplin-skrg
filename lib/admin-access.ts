import { env } from "cloudflare:workers";

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function hasValidAdminCode(input: string) {
  const configured = String(env.ADMIN_ACCESS_CODE || "");
  if (!configured || !input) return false;
  const [actual, expected] = await Promise.all([digest(input), digest(configured)]);
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < Math.max(actual.length, expected.length); index += 1) difference |= (actual[index] || 0) ^ (expected[index] || 0);
  return difference === 0;
}

export async function hasValidDisciplineCode(input: string) {
  const configured = String(env.DISCIPLINE_ACCESS_CODE || "");
  if (!configured || !input) return false;
  const [actual, expected] = await Promise.all([digest(input), digest(configured)]);
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < Math.max(actual.length, expected.length); index += 1) difference |= (actual[index] || 0) ^ (expected[index] || 0);
  return difference === 0;
}
