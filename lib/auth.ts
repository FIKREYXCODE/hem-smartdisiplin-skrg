import { database } from "./cases-db";
import type { AccessRole, AuthUser, UserRoleAssignment } from "./school";
import { ensureAccessSeeded } from "./access-seed";

const ITERATIONS = 210000;
const SESSION_HOURS = 12;
const enc = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
const fromHex = (value: string) => new Uint8Array(value.match(/.{1,2}/g)?.map(v => parseInt(v, 16)) || []);

async function sha256(value: string) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)))); }
async function passwordDigest(password: string, saltHex: string, iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations }, key, 256)));
}
function safeEqual(a: string, b: string) { let diff = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return diff === 0; }
export function validPassword(value: string) { return value.length >= 10 && value.length <= 128 && /[A-Za-z]/.test(value) && /\d/.test(value); }
const normalizeActivationCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^SKRG/, "");
export async function activationCodeHash(value: string) { return sha256(normalizeActivationCode(value)); }
export function generateActivationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const raw = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
  return `SKRG-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

export async function issueActivationCode(userId: string, createdBy: string) {
  const code = generateActivationCode(); const now = new Date(); const expires = new Date(now.getTime() + 72 * 3600000); const hash = await activationCodeHash(code);
  await database().batch([
    database().prepare("UPDATE account_activation_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(now.toISOString(), userId),
    database().prepare("INSERT INTO account_activation_tokens (id,user_id,token_hash,expires_at,used_at,created_by,created_at) VALUES (?,?,?,?,NULL,?,?)").bind(crypto.randomUUID(), userId, hash, expires.toISOString(), createdBy, now.toISOString()),
    database().prepare("UPDATE user_accounts SET status='needs_setup',password_hash=NULL,password_salt=NULL,password_set_at=NULL,reset_at=?,updated_at=? WHERE user_id=?").bind(now.toISOString(), now.toISOString(), userId),
    database().prepare("DELETE FROM auth_sessions WHERE user_id=?").bind(userId),
  ]);
  return { code, expiresAt: expires.toISOString() };
}

export async function verifyActivationCode(userId: string, code: string) {
  if (normalizeActivationCode(code).length !== 12) return null;
  const row = await database().prepare("SELECT id FROM account_activation_tokens WHERE user_id=? AND token_hash=? AND used_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1").bind(userId, await activationCodeHash(code), new Date().toISOString()).first<{id:string}>();
  return row?.id || null;
}

export async function consumeActivationCode(id: string) { await database().prepare("UPDATE account_activation_tokens SET used_at=? WHERE id=? AND used_at IS NULL").bind(new Date().toISOString(), id).run(); }

export async function setPassword(userId: string, password: string, requireUnset = true) {
  await ensureAccessSeeded();
  const account = await database().prepare("SELECT password_hash, active FROM user_accounts WHERE user_id = ?").bind(userId).first<{password_hash:string|null;active:number}>();
  if (!account || !account.active) throw new Error("Akaun tidak aktif.");
  if (requireUnset && account.password_hash) throw new Error("Password telah ditetapkan. Gunakan fungsi login.");
  const salt = crypto.getRandomValues(new Uint8Array(16)); const saltHex = hex(salt); const hash = await passwordDigest(password, saltHex); const now = new Date().toISOString();
  await database().prepare("UPDATE user_accounts SET password_hash = ?, password_salt = ?, password_iterations = ?, password_set_at = ?, reset_at = NULL, status='ready', updated_at = ? WHERE user_id = ?").bind(hash, saltHex, ITERATIONS, now, now, userId).run();
}

export async function verifyPassword(userId: string, password: string) {
  await ensureAccessSeeded();
  const account = await database().prepare("SELECT password_hash, password_salt, password_iterations, active, status FROM user_accounts WHERE user_id = ?").bind(userId).first<{password_hash:string|null;password_salt:string|null;password_iterations:number;active:number;status:string}>();
  if (!account || !account.active || account.status !== "ready" || !account.password_hash || !account.password_salt) return false;
  return safeEqual(await passwordDigest(password, account.password_salt, account.password_iterations), account.password_hash);
}

export async function getAuthUser(userId: string): Promise<AuthUser | null> {
  const teacher = await database().prepare("SELECT id, name, position FROM teachers WHERE id = ? AND active = 1").bind(userId).first<{id:string;name:string;position:string}>();
  if (!teacher) return null;
  const roles = await database().prepare("SELECT role, scope_id, position FROM user_roles WHERE user_id = ? ORDER BY role, scope_id").bind(userId).all<{role:AccessRole;scope_id:string|null;position:string}>();
  return { id: teacher.id, name: teacher.name, position: teacher.position, roles: roles.results.map(r => ({ role: r.role, scopeId: r.scope_id, position: r.position } as UserRoleAssignment)) };
}

export async function createSession(userId: string) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`; const hash = await sha256(token); const now = new Date(); const expires = new Date(now.getTime() + SESSION_HOURS * 3600000);
  await database().prepare("INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, hash, expires.toISOString(), now.toISOString(), now.toISOString()).run();
  return { token, expiresAt: expires.toISOString() };
}

export async function requireUser(request: Request): Promise<AuthUser> {
  await ensureAccessSeeded();
  const header = request.headers.get("Authorization") || ""; const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Response("Sesi diperlukan.", { status: 401 });
  const hash = await sha256(token); const now = new Date().toISOString();
  const session = await database().prepare("SELECT id, user_id FROM auth_sessions WHERE token_hash = ? AND expires_at > ?").bind(hash, now).first<{id:string;user_id:string}>();
  if (!session) throw new Response("Sesi telah tamat. Sila login semula.", { status: 401 });
  const account = await database().prepare("SELECT active FROM user_accounts WHERE user_id = ?").bind(session.user_id).first<{active:number}>();
  if (!account?.active) throw new Response("Akaun tidak aktif.", { status: 403 });
  const user = await getAuthUser(session.user_id); if (!user) throw new Response("Pengguna tidak ditemui.", { status: 401 });
  database().prepare("UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?").bind(now, session.id).run().catch(() => {});
  return user;
}

export function hasRole(user: AuthUser, role: AccessRole) { return user.roles.some(r => r.role === role); }
export function roleScopes(user: AuthUser, role: AccessRole) { return user.roles.filter(r => r.role === role).map(r => r.scopeId).filter(Boolean) as string[]; }
export async function auditAccess(user: AuthUser | null, eventType: string, details = "", targetUserId: string | null = null) {
  await database().prepare("INSERT INTO access_audit (id, user_id, actor_name, actor_role, event_type, target_user_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), user?.id || null, user?.name || "ANON", user?.roles.map(r=>r.role).join(",")||"", eventType, targetUserId, details, new Date().toISOString()).run();
}
export async function revokeSession(request: Request) { const header = request.headers.get("Authorization") || ""; const token = header.startsWith("Bearer ") ? header.slice(7) : ""; if (token) await database().prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256(token)).run(); }
