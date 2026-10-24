import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const passwordRule = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Needs an uppercase letter")
  .regex(/[0-9]/, "Needs a number");

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const createEmployeeSchema = z.object({
  employeeCode: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  department: z.string().min(2),
  designation: z.string().min(2),
  manager: objectId.nullable().optional(),
  joinDate: z.coerce.date(),
  salary: z.object({ basic: z.number().min(0), allowances: z.number().min(0).default(0) }).optional(),
  login: z.object({ password: passwordRule, role: z.enum(["hr", "manager", "employee"]).default("employee") }).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema
  .omit({ login: true, employeeCode: true })
  .partial()
  .extend({ status: z.enum(["active", "inactive", "on_leave"]).optional() })
  .strict();

export const attendanceSchema = z.object({ action: z.enum(["check_in", "check_out"]) });

export const leaveCreateSchema = z.object({
  type: z.enum(["annual", "sick", "casual", "unpaid"]),
  startDate: dateStr,
  endDate: dateStr,
  reason: z.string().min(3).max(500),
});

export const leaveActionSchema = z.object({
  action: z.enum(["approve", "reject", "cancel"]),
  remarks: z.string().max(500).optional(),
});

export const payrollGenerateSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM"),
  employee: objectId.optional(),
});
