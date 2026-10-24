import { cookies } from "next/headers";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import { route, json, AppError } from "@/lib/api";
import {
  signAccess, newRefreshToken, hashToken, setAuthCookies, clearAuthCookies, REFRESH_COOKIE, REFRESH_DAYS,
} from "@/lib/auth";

export const POST = route(async (req) => {
  const raw = cookies().get(REFRESH_COOKIE)?.value;
  if (!raw) throw new AppError("No refresh token", 401);

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(raw) });
  if (!stored) {
    clearAuthCookies();
    throw new AppError("Invalid refresh token", 401);
  }

  // A rotated token being used again means it may be stolen: revoke the whole session family
  if (stored.revoked) {
    await RefreshToken.updateMany({ family: stored.family }, { revoked: true });
    clearAuthCookies();
    throw new AppError("Session expired. Please log in again.", 401);
  }

  const user = await User.findById(stored.user);
  if (!user || !user.isActive) {
    clearAuthCookies();
    throw new AppError("Account not available", 401);
  }

  // Rotate: revoke the old token, issue a new one in the same family
  stored.revoked = true;
  await stored.save();

  const refresh = newRefreshToken();
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refresh),
    family: stored.family,
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000),
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });
  setAuthCookies(signAccess(user), refresh);
  return json({ ok: true });
});

export const dynamic = "force-dynamic";
