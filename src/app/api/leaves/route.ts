import Leave from "@/models/Leave";
import Employee from "@/models/Employee";
import { route, json, parseBody, validId, toDate, workingDays, AppError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { scopedEmployeeIds } from "@/lib/access";
import { paginate } from "@/lib/paginate";
import { audit } from "@/lib/audit";
import { leaveCreateSchema } from "@/lib/validators";

// GET /api/leaves?status=pending&mine=1&employee=<id>
export const GET = route(async (req) => {
  const user = await requireUser();
  const q = Object.fromEntries(req.nextUrl.searchParams);
  const ids = await scopedEmployeeIds(user);

  const base: Record<string, any> = {};
  if (q.mine === "1") {
    if (!user.employee) throw new AppError("No employee profile linked to this account", 400);
    base.employee = user.employee;
  } else if (q.employee) {
    validId(q.employee);
    if (ids && !ids.includes(q.employee)) throw new AppError("You do not have permission to do this", 403);
    base.employee = q.employee;
  } else if (ids) {
    base.employee = { $in: ids };
  }

  const result = await paginate(Leave, q, {
    baseFilter: base,
    filterFields: ["status", "type"],
    sortFields: ["startDate", "createdAt"],
    populate: [{ path: "employee", select: "name employeeCode" }, { path: "reviewedBy", select: "email" }],
  });
  return json(result);
});

// POST: apply for leave
export const POST = route(async (req) => {
  const user = await requireUser();
  if (!user.employee) throw new AppError("No employee profile linked to this account", 400);
  const body = await parseBody(req, leaveCreateSchema);

  const start = toDate(body.startDate);
  const end = toDate(body.endDate);
  if (end < start) throw new AppError("End date cannot be before start date", 422);

  const days = workingDays(start, end);
  if (days === 0) throw new AppError("The selected dates contain no working days", 422);

  const overlap = await Leave.exists({
    employee: user.employee,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });
  if (overlap) throw new AppError("You already have a leave request for these dates", 409);

  if (body.type !== "unpaid") {
    const emp = await Employee.findById(user.employee).select("leaveBalance").lean<any>();
    const balance = emp?.leaveBalance?.[body.type] ?? 0;
    if (balance < days) throw new AppError(`Not enough ${body.type} leave. Balance: ${balance}, requested: ${days}`, 422);
  }

  const leave = await Leave.create({ ...body, startDate: start, endDate: end, days, employee: user.employee });
  await audit(user, req, "LEAVE_APPLY", "Leave", String(leave._id), undefined, leave.toObject());
  return json({ data: leave }, 201);
});

export const dynamic = "force-dynamic";
