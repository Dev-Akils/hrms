"use client";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useList, post, patch, errText } from "@/lib/client";
import Pager from "@/components/Pager";

export default function LeavesPage() {
  const { user, reload: reloadUser } = useAuth();
  const canReview = user?.role !== "employee";

  const [view, setView] = useState<"mine" | "team">("mine");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { rows, meta, loading, error, reload } = useList<any>("/api/leaves", { page, limit: 10, status, ...(view === "mine" ? { mine: 1 } : {}) });

  const [form, setForm] = useState({ type: "annual", startDate: "", endDate: "", reason: "" });
  const [formError, setFormError] = useState("");
  const [msg, setMsg] = useState("");

  async function apply(e: FormEvent) {
    e.preventDefault();
    setFormError(""); setMsg("");
    try {
      await post("/api/leaves", form);
      setForm({ type: "annual", startDate: "", endDate: "", reason: "" });
      setMsg("Leave request submitted.");
      reload();
    } catch (err) { setFormError(errText(err)); }
  }

  async function act(id: string, action: "approve" | "reject" | "cancel") {
    const remarks = action === "reject" ? prompt("Reason for rejection (optional)") ?? undefined : undefined;
    try {
      await patch(`/api/leaves/${id}`, { action, remarks });
      reload();
      reloadUser(); // leave balance may have changed
    } catch (err) { alert(errText(err)); }
  }

  const d = (s: string) => new Date(s).toLocaleDateString(undefined, { timeZone: "UTC" });

  return (
    <>
      <h1>Leave</h1>

      {user?.employee && (
        <form className="card" onSubmit={apply}>
          <div className="row">
            <div className="field"><label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="annual">Annual</option><option value="sick">Sick</option><option value="casual">Casual</option><option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div className="field"><label>From</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
            <div className="field"><label>To</label><input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
            <div className="field" style={{ flex: 1, minWidth: 200 }}><label>Reason</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required /></div>
            <button type="submit">Apply</button>
          </div>
          {formError && <p className="error" role="alert">{formError}</p>}
          {msg && <p className="ok">{msg}</p>}
        </form>
      )}

      <div className="toolbar">
        {canReview && (
          <select aria-label="View" value={view} onChange={(e) => { setView(e.target.value as any); setPage(1); }}>
            <option value="mine">My requests</option>
            <option value="team">{user?.role === "manager" ? "My team" : "Everyone"}</option>
          </select>
        )}
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead><tr>{view === "team" && <th>Employee</th>}<th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((l) => {
              const own = l.employee?._id === user?.employee;
              return (
                <tr key={l._id}>
                  {view === "team" && <td>{l.employee?.name}<div className="muted">{l.employee?.employeeCode}</div></td>}
                  <td>{l.type}</td>
                  <td>{d(l.startDate)} – {d(l.endDate)}</td>
                  <td>{l.days}</td>
                  <td>{l.reason}{l.remarks && <div className="muted">Remarks: {l.remarks}</div>}</td>
                  <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                  <td>
                    <div className="row">
                      {l.status === "pending" && canReview && !own && (<>
                        <button onClick={() => act(l._id, "approve")}>Approve</button>
                        <button className="danger" onClick={() => act(l._id, "reject")}>Reject</button>
                      </>)}
                      {own && (l.status === "pending" || l.status === "approved") && (
                        <button className="secondary" onClick={() => act(l._id, "cancel")}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="muted">No leave requests.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager meta={meta} onPage={setPage} />
    </>
  );
}
