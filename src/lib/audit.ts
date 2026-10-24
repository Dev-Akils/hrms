import { NextRequest } from "next/server";
import AuditLog from "@/models/AuditLog";
import { SessionUser } from "./auth";

/** Append one audit entry. Never throws: a logging failure must not break the request. */
export async function audit(
  user: SessionUser | null,
  req: NextRequest,
  action: string,
  resource: string,
  resourceId?: string,
  before?: unknown,
  after?: unknown
) {
  try {
    await AuditLog.create({
      actor: user?.id,
      actorRole: user?.role,
      action,
      resource,
      resourceId,
      before,
      after,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: req.headers.get("user-agent"),
    });
  } catch (e) {
    console.error("Audit log failed:", (e as Error).message);
  }
}
