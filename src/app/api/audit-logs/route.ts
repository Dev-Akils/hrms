import AuditLog from "@/models/AuditLog";
import { route, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { paginate } from "@/lib/paginate";

export const GET = route(async (req) => {
  await requireUser(["admin"]);
  const result = await paginate(AuditLog, Object.fromEntries(req.nextUrl.searchParams), {
    filterFields: ["action", "resource"],
    sortFields: ["createdAt", "action"],
    populate: { path: "actor", select: "email role" },
  });
  return json(result);
});

export const dynamic = "force-dynamic";
