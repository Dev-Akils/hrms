import Employee from "@/models/Employee";
import User from "@/models/User";
import { route, json, parseBody, validId, AppError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { FULL_ACCESS, canAccessEmployee } from "@/lib/access";
import { audit } from "@/lib/audit";
import { updateEmployeeSchema } from "@/lib/validators";

export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const id = validId(params.id);
  if (!(await canAccessEmployee(user, id))) throw new AppError("You do not have permission to do this", 403);

  const showSalary = FULL_ACCESS.includes(user.role) || user.employee === id;
  const employee = await Employee.findById(id)
    .select(showSalary ? "" : "-salary")
    .populate("manager", "name employeeCode");
  if (!employee) throw new AppError("Employee not found", 404);
  return json({ data: employee });
});

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser(["admin", "hr"]);
  const id = validId(params.id);
  const body = await parseBody(req, updateEmployeeSchema);

  const before = await Employee.findById(id);
  if (!before) throw new AppError("Employee not found", 404);
  if (body.manager && body.manager === id) throw new AppError("An employee cannot be their own manager", 422);

  const after = await Employee.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  await audit(user, req, "EMPLOYEE_UPDATE", "Employee", id, before.toObject(), after?.toObject());
  return json({ data: after });
});

// Soft delete keeps history for attendance, leave and payroll
export const DELETE = route(async (req, { params }) => {
  const user = await requireUser(["admin"]);
  const id = validId(params.id);

  const employee = await Employee.findById(id);
  if (!employee) throw new AppError("Employee not found", 404);

  const previous = employee.status;
  employee.status = "inactive";
  await employee.save();
  await User.updateOne({ employee: id }, { isActive: false });

  await audit(user, req, "EMPLOYEE_DEACTIVATE", "Employee", id, { status: previous }, { status: "inactive" });
  return json({ message: "Employee deactivated" });
});

export const dynamic = "force-dynamic";
