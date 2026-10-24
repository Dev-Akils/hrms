"use client";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useList } from "@/lib/client";
import Pager from "@/components/Pager";

export default function AuditPage() {
  const { user } = useAuth();
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { rows, meta, loading, error } = useList<any>("/api/audit-logs", { page, limit: 20, action });

  if (user?.role !== "admin") return <p className="error">You do not have access to this page.</p>;

  return (
    <>
      <h1>Audit log</h1>
      <div className="toolbar">
        <select aria-label="Action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          {["LOGIN", "EMPLOYEE_CREATE", "EMPLOYEE_UPDATE", "EMPLOYEE_DEACTIVATE", "LEAVE_APPLY", "LEAVE_APPROVE", "LEAVE_REJECT", "LEAVE_CANCEL", "PAYROLL_GENERATE", "PAYROLL_MARK_PAID"].map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Resource</th><th>Changes</th></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l._id}>
                <td>{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.actor?.email ?? "–"}<div className="muted">{l.actorRole}</div></td>
                <td>{l.action}</td>
                <td>{l.resource}<div className="muted">{l.resourceId}</div></td>
                <td>{l.before || l.after ? <details><summary>View</summary><pre style={{ fontSize: 12, maxWidth: 360, overflow: "auto" }}>{JSON.stringify({ before: l.before, after: l.after }, null, 2)}</pre></details> : "–"}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="muted">No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager meta={meta} onPage={setPage} />
    </>
  );
}
