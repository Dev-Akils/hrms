import { cookies } from "next/headers";
import RefreshToken from "@/models/RefreshToken";
import { route, json } from "@/lib/api";
import { hashToken, clearAuthCookies, REFRESH_COOKIE } from "@/lib/auth";

export const POST = route(async () => {
  const raw = cookies().get(REFRESH_COOKIE)?.value;
  if (raw) await RefreshToken.updateOne({ tokenHash: hashToken(raw) }, { revoked: true });
  clearAuthCookies();
  return json({ message: "Logged out" });
});

export const dynamic = "force-dynamic";
