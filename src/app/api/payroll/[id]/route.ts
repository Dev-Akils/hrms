import Payroll from "@/models/Payroll";
import { route, json, validId, AppError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

// PATCH: mark a generated payslip as paid
export const PATCH = route(async (req, { params }) => {
  const user = await requireUser(["admin", "hr"]);
  const id = validId(params.id);

  const slip = await Payroll.findOneAndUpdate({ _id: id, status: "generated" }, { status: "paid", paidAt: new Date() }, { new: true });
  if (!slip) throw new AppError("Payslip not found or already paid", 409);

  await audit(user, req, "PAYROLL_MARK_PAID", "Payroll", id, { status: "generated" }, { status: "paid" });
  return json({ data: slip });
});

export const dynamic = "force-dynamic";
