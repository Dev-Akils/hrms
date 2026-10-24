import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "@/models/User";
import { AppError } from "./api";
import { connectDB } from "./db";

export type Role = "admin" | "hr" | "manager" | "employee";
export type SessionUser = { id: string; email: string; role: Role; employee?: string };

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
export const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);
const isProd = process.env.NODE_ENV === "production";

const secret = () => {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error("JWT_ACCESS_SECRET is not set");
  return s;
};

export const signAccess = (user: { _id: unknown; role: string }) =>
  jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn: "15m" });

// Refresh tokens are random; only the SHA-256 hash is stored in the DB
export const newRefreshToken = () => crypto.randomBytes(48).toString("hex");
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export function setAuthCookies(access: string, refresh: string) {
  const c = cookies();
  c.set(ACCESS_COOKIE, access, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 15 * 60 });
  c.set(REFRESH_COOKIE, refresh, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/api/auth", maxAge: REFRESH_DAYS * 86400 });
}

export function clearAuthCookies() {
  const c = cookies();
  c.set(ACCESS_COOKIE, "", { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 0 });
  c.set(REFRESH_COOKIE, "", { httpOnly: true, secure: isProd, sameSite: "lax", path: "/api/auth", maxAge: 0 });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret()) as jwt.JwtPayload;
  } catch {
    return null;
  }
  await connectDB();
  const user = await User.findById(payload.sub).lean<any>();
  if (!user || !user.isActive) return null;
  return { id: String(user._id), email: user.email, role: user.role, employee: user.employee ? String(user.employee) : undefined };
}

/** Throws 401/403 unless the caller is logged in (and has one of the roles, if given). */
export async function requireUser(roles?: Role[]) {
  const s = await getSession();
  if (!s) throw new AppError("Authentication required", 401);
  if (roles && !roles.includes(s.role)) throw new AppError("You do not have permission to do this", 403);
  return s;
}
