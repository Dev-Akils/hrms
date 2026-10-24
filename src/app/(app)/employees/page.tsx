"use client";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useList, post, patch, apiFetch, errText } from "@/lib/client";
import Pager from "@/components/Pager";

const empty = { employeeCode: "", name: "", email: "", department: "", designation: "", joinDate: "", basic: "", allowances: "", password: "", role: "employee" };

export default function EmployeesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "hr";

  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const { rows, meta, loading, error, reload } = useList<any>("/api/employees", { page, limit: 10, search: q, status, sort });

  useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const set = (k: keyof typeof empty) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function create(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    try {
      await post("/api/employees", {
        employeeCode: form.employeeCode, name: form.name, email: form.email,
        department: form.department, designation: form.designation, joinDate: form.joinDate,
        salary: { basic: Number(form.basic) || 0, allowances: Number(form.allowances) || 0 },
        ...(form.password ? { login: { password: form.password, role: form.role } } : {}),
      });
      setForm(empty);
      setOpen(false);
      reload();
    } catch (err) {
      setFormError(errText(err));
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this employee? Their login will be disabled.")) return;
    try { await apiFetch(`/api/employees/${id}`, { method: "DELETE" }); reload(); } catch (e) { alert(errText(e)); }
  }
  async function reactivate(id: string) {
    try { await patch(`/api/employees/${id}`, { status: "active" }); reload(); } catch (e) { alert(errText(e)); }
  }

  const toggleSort = (f: string) => { setSort((s) => (s === f ? `-${f}` : f)); setPage(1); };

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Employees</h1>
        {canEdit && <button onClick={() => setOpen(!open)}>{open ? "Close" : "Add employee"}</button>}
      </div>

      {open && (
        <form className="card" onSubmit={create}>
          <div className="row">
            <div className="field"><label>Code</label><input value={form.employeeCode} onChange={set("employeeCode")} required /></div>
            <div className="field"><label>Name</label><input value={form.name} onChange={set("name")} required /></div>
            <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set("email")} required /></div>
            <div className="field"><label>Department</label><input value={form.department} onChange={set("department")} required /></div>
            <div className="field"><label>Designation</label><input value={form.designation} onChange={set("designation")} required /></div>
            <div className="field"><label>Join date</label><input type="date" value={form.joinDate} onChange={set("joinDate")} required /></div>
            <div className="field"><label>Basic salary</label><input type="number" min="0" value={form.basic} onChange={set("basic")} /></div>
            <div className="field"><label>Allowances</label><input type="number" min="0" value={form.allowances} onChange={set("allowances")} /></div>
            <div className="field"><label>Login password (optional)</label><input type="password" autoComplete="new-password" value={form.password} onChange={set("password")} /></div>
            <div className="field">
              <label>Login role</label>
              <select value={form.role} onChange={set("role")}><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr">HR</option></select>
            </div>
          </div>
          {formError && <p className="error" role="alert">{formError}</p>}
          <p><button type="submit">Save employee</button></p>
        </form>
      )}

      <div className="toolbar">
        <input placeholder="Search name, email, code…" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="active">Active</option><option value="on_leave">On leave</option><option value="inactive">Inactive</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th className="sortable" onClick={() => toggleSort("name")}>Name</th>
              <th className="sortable" onClick={() => toggleSort("department")}>Department</th>
              <th>Designation</th>
              <th className="sortable" onClick={() => toggleSort("joinDate")}>Joined</th>
              <th>Status</th>
              {canEdit && <th>Salary</th>}
              {user?.role === "admin" && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e._id}>
                <td>{e.employeeCode}</td>
                <td>{e.name}<div className="muted">{e.email}</div></td>
                <td>{e.department}</td>
                <td>{e.designation}</td>
                <td>{new Date(e.joinDate).toLocaleDateString()}</td>
                <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                {canEdit && <td>{e.salary ? (e.salary.basic + e.salary.allowances).toLocaleString() : "–"}</td>}
                {user?.role === "admin" && (
                  <td>{e.status === "inactive"
                    ? <button className="secondary" onClick={() => reactivate(e._id)}>Reactivate</button>
                    : <button className="danger" onClick={() => deactivate(e._id)}>Deactivate</button>}</td>
                )}
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="muted">No employees match your filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager meta={meta} onPage={setPage} />
    </>
  );
}
