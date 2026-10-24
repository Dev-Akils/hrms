import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import { route, json, parseBody, AppError } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { signAccess, newRefreshToken, hashToken, setAuthCookies, REFRESH_DAYS } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";

export const POST = route(async (req) => {
  const { email, password } = await parseBody(req, loginSchema);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`login:${ip}:${email.toLowerCase()}`, 10, 15 * 60 * 1000)) {
    throw new AppError("Too many login attempts. Try again in 15 minutes.", 429);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  // Same message for unknown email and wrong password
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError("Invalid email or password", 401);
  }

  const refresh = newRefreshToken();
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refresh),
    family: randomUUID(),
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000),
    userAgent: req.headers.get("user-agent"),
    ip,
  });
  setAuthCookies(signAccess(user), refresh);

  const session = { id: String(user._id), role: user.role, email: user.email, employee: user.employee ? String(user.employee) : undefined };
  await audit(session, req, "LOGIN", "User", session.id);
  return json({ user: { id: session.id, email: user.email, role: user.role } });
});

export const dynamic = "force-dynamic";
