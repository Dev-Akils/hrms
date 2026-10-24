import bcrypt from "bcryptjs";
import Employee from "@/models/Employee";
import User from "@/models/User";
import { route, json, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { paginate } from "@/lib/paginate";
import { FULL_ACCESS } from "@/lib/access";
import { audit } from "@/lib/audit";
import { createEmployeeSchema } from "@/lib/validators";

export const GET = route(async (req) => {
  const user = await requireUser();

  let baseFilter: Record<string, any> = {};
  if (user.role === "manager") baseFilter = { $or: [{ _id: user.employee }, { manager: user.employee }] };
  else if (user.role === "employee") baseFilter = { _id: user.employee };

  const result = await paginate(Employee, Object.fromEntries(req.nextUrl.searchParams), {
    baseFilter,
    searchFields: ["name", "email", "employeeCode", "designation"],
    filterFields: ["department", "status", "designation"],
    sortFields: ["name", "joinDate", "department", "createdAt"],
    select: FULL_ACCESS.includes(user.role) ? "" : "-salary", // salary only for admin/hr
    populate: { path: "manager", select: "name employeeCode" },
  });
  return json(result);
});

export const POST = route(async (req) => {
  const user = await requireUser(["admin", "hr"]);
  const { login, ...data } = await parseBody(req, createEmployeeSchema);

  const employee = await Employee.create(data);

  if (login) {
    try {
      await User.create({
        email: employee.email,
        passwordHash: await bcrypt.hash(login.password, 12),
        role: login.role,
        employee: employee._id,
      });
    } catch (err) {
      await Employee.findByIdAndDelete(employee._id); // keep data consistent
      throw err;
    }
  }

  await audit(user, req, "EMPLOYEE_CREATE", "Employee", String(employee._id), undefined, employee.toObject());
  return json({ data: employee }, 201);
});

export const dynamic = "force-dynamic";
