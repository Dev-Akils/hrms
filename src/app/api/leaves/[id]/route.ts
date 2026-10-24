import Leave from "@/models/Leave";
import Employee from "@/models/Employee";
import { route, json, parseBody, validId, todayStr, AppError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { FULL_ACCESS } from "@/lib/access";
import { audit } from "@/lib/audit";
import { leaveActionSchema } from "@/lib/validators";

// PATCH { action: "approve" | "reject" | "cancel", remarks? }
export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const id = validId(params.id);
  const { action, remarks } = await parseBody(req, leaveActionSchema);

  const leave = await Leave.findById(id);
  if (!leave) throw new AppError("Leave request not found", 404);
  const balanceField = `leaveBalance.${leave.type}`;

  // ---- Cancel: only the owner ----
  if (action === "cancel") {
    if (leave.employee.toString() !== user.employee) throw new AppError("You can only cancel your own leave", 403);

    if (leave.status === "pending") {
      leave.status = "cancelled";
    } else if (leave.status === "approved" && leave.startDate.toISOString().slice(0, 10) > todayStr()) {
      if (leave.type !== "unpaid") await Employee.updateOne({ _id: leave.employee }, { $inc: { [balanceField]: leave.days } }); // refund
      leave.status = "cancelled";
    } else {
      throw new AppError(`A ${leave.status} leave cannot be cancelled`, 409);
    }
    await leave.save();
    await audit(user, req, "LEAVE_CANCEL", "Leave", id);
    return json({ data: leave });
  }

  // ---- Approve / reject: admin, hr, or the employee's manager ----
  if (leave.employee.toString() === user.employee) throw new AppError("You cannot review your own leave request", 403);

  const isManagerOfEmployee =
    user.role === "manager" && !!(await Employee.exists({ _id: leave.employee, manager: user.employee }));
  if (!FULL_ACCESS.includes(user.role) && !isManagerOfEmployee) {
    throw new AppError("You do not have permission to review this request", 403);
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  // Atomic claim so two reviewers cannot both act on the same pending request
  const claimed = await Leave.findOneAndUpdate(
    { _id: id, status: "pending" },
    { status: newStatus, reviewedBy: user.id, reviewedAt: new Date(), remarks },
    { new: true }
  );
  if (!claimed) throw new AppError("This request has already been reviewed or cancelled", 409);

  if (action === "approve" && claimed.type !== "unpaid") {
    // Deduct only if the balance still covers it (guards against races)
    const res = await Employee.updateOne(
      { _id: claimed.employee, [balanceField]: { $gte: claimed.days } },
      { $inc: { [balanceField]: -claimed.days } }
    );
    if (res.modifiedCount === 0) {
      await Leave.updateOne({ _id: id }, { status: "pending", $unset: { reviewedBy: 1, reviewedAt: 1, remarks: 1 } });
      throw new AppError("Employee no longer has enough leave balance", 422);
    }
  }

  await audit(user, req, action === "approve" ? "LEAVE_APPROVE" : "LEAVE_REJECT", "Leave", id, { status: "pending" }, { status: newStatus, remarks });
  return json({ data: claimed });
});

export const dynamic = "force-dynamic";
