"use client";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useList, post, patch, errText } from "@/lib/client";
import Pager from "@/components/Pager";

const money = (n?: number) => (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayrollPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "hr";

  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);
  const { rows, meta, loading, error, reload } = useList<any>("/api/payroll", { page, limit: 10, month });

  const [genMonth, setGenMonth] = useState(new Date().toISOString().slice(0, 7));
  const [msg, setMsg] = useState("");
  const [genError, setGenError] = useState("");

  async function generate() {
    setMsg(""); setGenError("");
    try {
      const r = await post("/api/payroll", { month: genMonth });
      setMsg(r.message);
      reload();
    } catch (e) { setGenError(errText(e)); }
  }
  async function markPaid(id: string) {
    try { await patch(`/api/payroll/${id}`, {}); reload(); } catch (e) { alert(errText(e)); }
  }

  return (
    <>
      <h1>Payroll</h1>

      {canManage && (
        <div className="card">
          <div className="row">
            <div className="field"><label>Generate for month</label><input type="month" value={genMonth} onChange={(e) => setGenMonth(e.target.value)} /></div>
            <button onClick={generate}>Generate payslips</button>
          </div>
          <p className="muted">Net = basic + allowances − 12% PF on basic − loss of pay for approved unpaid leave days.</p>
          {msg && <p className="ok">{msg}</p>}
          {genError && <p className="error" role="alert">{genError}</p>}
        </div>
      )}

      <div className="toolbar">
        <input type="month" aria-label="Filter by month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} />
        {month && <button className="secondary" onClick={() => setMonth("")}>Clear</button>}
      </div>
      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Month</th>{canManage && <th>Employee</th>}<th>Gross</th><th>LOP days</th><th>PF</th><th>LOP</th><th>Net pay</th><th>Status</th>{canManage && <th />}</tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p._id}>
                <td>{p.month}</td>
                {canManage && <td>{p.employee?.name}<div className="muted">{p.employee?.employeeCode}</div></td>}
                <td>{money(p.gross)}</td><td>{p.lopDays}</td><td>{money(p.deductions?.pf)}</td><td>{money(p.deductions?.lop)}</td>
                <td><strong>{money(p.net)}</strong></td>
                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                {canManage && <td>{p.status === "generated" && <button className="secondary" onClick={() => markPaid(p._id)}>Mark paid</button>}</td>}
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={9} className="muted">No payslips found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager meta={meta} onPage={setPage} />
    </>
  );
}
