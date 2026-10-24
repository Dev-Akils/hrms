"use client";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useList } from "@/lib/client";
import Pager from "@/components/Pager";

export default function AttendancePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [page, setPage] = useState(1);
  const { rows, meta, loading, error } = useList<any>("/api/attendance", { page, limit: 15, month, ...(scope === "mine" ? { mine: 1 } : {}) });

  const time = (d?: string) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "–");
  const canSeeTeam = user?.role !== "employee";

  return (
    <>
      <h1>Attendance</h1>
      <div className="toolbar">
        <input type="month" aria-label="Month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} />
        {canSeeTeam && (
          <select aria-label="Scope" value={scope} onChange={(e) => { setScope(e.target.value as any); setPage(1); }}>
            <option value="mine">My records</option>
            <option value="team">{user?.role === "manager" ? "My team" : "Everyone"}</option>
          </select>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th>{scope === "team" && <th>Employee</th>}<th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a._id}>
                <td>{a.date}</td>
                {scope === "team" && <td>{a.employee?.name}<div className="muted">{a.employee?.employeeCode}</div></td>}
                <td>{time(a.checkIn)}</td><td>{time(a.checkOut)}</td><td>{a.hours ?? "–"}</td>
                <td><span className={`badge ${a.status}`}>{a.status}</span></td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="muted">No attendance records for this month.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager meta={meta} onPage={setPage} />
    </>
  );
}
