import mongoose from "mongoose";
import Attendance from "@/models/Attendance";
import { route, json, parseBody, validId, todayStr, round2, AppError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { scopedEmployeeIds } from "@/lib/access";
import { paginate } from "@/lib/paginate";
import { attendanceSchema } from "@/lib/validators";

// GET /api/attendance?month=2026-10&mine=1&employee=<id>&page=1
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
  if (/^\d{4}-\d{2}$/.test(q.month || "")) base.date = { $gte: `${q.month}-01`, $lte: `${q.month}-31` };

  const result = await paginate(Attendance, q, {
    baseFilter: base,
    sortFields: ["date"],
    defaultSort: "-date",
    populate: { path: "employee", select: "name employeeCode" },
  });
  return json({ ...result, today: todayStr() });
});

// POST { action: "check_in" | "check_out" } for the logged-in employee
export const POST = route(async (req) => {
  const user = await requireUser();
  if (!user.employee) throw new AppError("No employee profile linked to this account", 400);
  const { action } = await parseBody(req, attendanceSchema);

  const employee = new mongoose.Types.ObjectId(user.employee);
  const date = todayStr();

  if (action === "check_in") {
    try {
      const rec = await Attendance.create({ employee, date, checkIn: new Date() });
      return json({ data: rec }, 201);
    } catch (e: any) {
      if (e.code === 11000) throw new AppError("You have already checked in today", 409);
      throw e;
    }
  }

  const rec = await Attendance.findOne({ employee, date });
  if (!rec) throw new AppError("Check in first", 409);
  if (rec.checkOut) throw new AppError("You have already checked out today", 409);

  rec.checkOut = new Date();
  rec.hours = round2((rec.checkOut.getTime() - rec.checkIn.getTime()) / 3600000);
  rec.status = rec.hours < 4 ? "half_day" : "present";
  await rec.save();
  return json({ data: rec });
});

export const dynamic = "force-dynamic";
