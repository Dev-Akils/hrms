import Payroll from "@/models/Payroll";
import Employee from "@/models/Employee";
import Leave from "@/models/Leave";
import { route, json, parseBody, toDate, workingDays, round2, AppError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { FULL_ACCESS } from "@/lib/access";
import { paginate } from "@/lib/paginate";
import { audit } from "@/lib/audit";
import { payrollGenerateSchema } from "@/lib/validators";

// GET /api/payroll?month=2026-10&status=paid. admin/hr see all, everyone else sees their own.
export const GET = route(async (req) => {
  const user = await requireUser();
  const q = Object.fromEntries(req.nextUrl.searchParams);

  const base: Record<string, any> = FULL_ACCESS.includes(user.role) ? {} : { employee: user.employee };
  const result = await paginate(Payroll, q, {
    baseFilter: base,
    filterFields: ["month", "status"],
    sortFields: ["month", "net"],
    defaultSort: "-month",
    populate: { path: "employee", select: "name employeeCode department" },
  });
  return json(result);
});

// POST { month: "2026-10", employee?: id }: generate payslips for all active employees (or one)
export const POST = route(async (req) => {
  const user = await requireUser(["admin", "hr"]);
  const { month, employee } = await parseBody(req, payrollGenerateSchema);

  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthEnd = new Date(Date.UTC(y, m, 0));
  const monthWorkingDays = workingDays(monthStart, monthEnd);

  const employees = await Employee.find({ status: { $ne: "inactive" }, ...(employee ? { _id: employee } : {}) }).lean<any[]>();
  if (employee && employees.length === 0) throw new AppError("Employee not found or inactive", 404);

  let created = 0;
  let skipped = 0;

  for (const emp of employees) {
    // Loss of pay = approved unpaid leave days that fall inside this month
    const unpaid = await Leave.find({
      employee: emp._id, type: "unpaid", status: "approved",
      startDate: { $lte: monthEnd }, endDate: { $gte: monthStart },
    }).lean<any[]>();

    let lopDays = 0;
    for (const l of unpaid) {
      const from = l.startDate > monthStart ? l.startDate : monthStart;
      const to = l.endDate < monthEnd ? l.endDate : monthEnd;
      lopDays += workingDays(from, to);
    }

    const basic = emp.salary?.basic ?? 0;
    const allowances = emp.salary?.allowances ?? 0;
    const gross = basic + allowances;
    const lop = round2((gross / monthWorkingDays) * lopDays);
    const pf = round2(basic * 0.12);

    try {
      await Payroll.create({
        employee: emp._id, month, basic, allowances, gross,
        workingDays: monthWorkingDays, lopDays,
        deductions: { lop, pf },
        net: round2(gross - lop - pf),
      });
      created++;
    } catch (e: any) {
      if (e.code === 11000) skipped++; // already generated for this month
      else throw e;
    }
  }

  await audit(user, req, "PAYROLL_GENERATE", "Payroll", month, undefined, { month, created, skipped });
  return json({ message: `Generated ${created} payslip(s), skipped ${skipped} already generated`, created, skipped }, 201);
});

export const dynamic = "force-dynamic";
