import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";
import mongoose from "mongoose";
import { connectDB } from "./db";

export class AppError extends Error {
  constructor(message: string, public status = 400, public details?: unknown) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

type Ctx = { params: Record<string, string> };

/** Wraps a route handler: DB connect, same-origin check for writes, and uniform error responses. */
export function route(fn: (req: NextRequest, ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        const origin = req.headers.get("origin");
        if (origin && new URL(origin).host !== req.headers.get("host")) {
          throw new AppError("Cross-origin request blocked", 403);
        }
      }
      await connectDB();
      return await fn(req, ctx);
    } catch (err: any) {
      // Let Next.js internal control-flow errors (dynamic usage, redirects) pass through
      if (err?.digest === "DYNAMIC_SERVER_USAGE" || String(err?.digest ?? "").startsWith("NEXT_")) throw err;
      let status = err.status || 500;
      let message: string = err.message;
      let details = err.details;

      if (err.name === "CastError") { status = 400; message = "Invalid id"; }
      if (err.code === 11000) {
        status = 409;
        message = `Duplicate value for: ${Object.keys(err.keyPattern || {}).join(", ")}`;
      }
      if (err.name === "ValidationError" && err.errors) {
        status = 422;
        message = "Validation failed";
        details = Object.values<any>(err.errors).map((e) => ({ path: e.path, message: e.message }));
      }
      if (status >= 500) {
        console.error(err);
        if (process.env.NODE_ENV === "production") message = "Something went wrong";
      }
      return json({ message, ...(details ? { details } : {}) }, status);
    }
  };
}

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError("Invalid JSON body", 400);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new AppError(
      "Validation failed",
      422,
      result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
    );
  }
  return result.data;
}

export const validId = (id: string) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid id", 400);
  return id;
};

export const todayStr = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: process.env.WORK_TZ || "UTC" }).format(new Date());

export const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

/** Mon–Fri days between two dates, inclusive (UTC). */
export function workingDays(start: Date, end: Date) {
  let n = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) n++;
  }
  return n;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
