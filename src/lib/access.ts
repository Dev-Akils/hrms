import Employee from "@/models/Employee";
import { SessionUser } from "./auth";

export const FULL_ACCESS = ["admin", "hr"];

/**
 * Which employee ids can this user see?
 * null = everyone (admin/hr) | manager = self + direct reports | employee = self
 */
export async function scopedEmployeeIds(user: SessionUser): Promise<string[] | null> {
  if (FULL_ACCESS.includes(user.role)) return null;
  const own = user.employee ? [user.employee] : [];
  if (user.role === "manager" && user.employee) {
    const reports = await Employee.find({ manager: user.employee }).distinct("_id");
    return [...own, ...reports.map(String)];
  }
  return own;
}

export async function canAccessEmployee(user: SessionUser, employeeId: string) {
  const ids = await scopedEmployeeIds(user);
  return ids === null || ids.includes(String(employeeId));
}
