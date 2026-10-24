import Employee from "@/models/Employee";
import { route, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const GET = route(async () => {
  const user = await requireUser();
  const employee = user.employee
    ? await Employee.findById(user.employee).select("name employeeCode department designation leaveBalance").lean()
    : null;
  return json({ user, employee });
});

export const dynamic = "force-dynamic";
