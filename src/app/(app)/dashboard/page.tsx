"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { apiFetch, post, errText } from "@/lib/client";

export default function DashboardPage() {
  const { user, employee } = useAuth();
  const [today, setToday] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.employee) return;
    try {
      const month = new Date().toISOString().slice(0, 7);
      const r = await apiFetch(`/api/attendance?mine=1&month=${month}&limit=100`);
      setToday(r.data.find((a: any) => a.date === r.today) || null);
    } catch (e) {
      setError(errText(e));
    }
  }, [user?.employee]);

  useEffect(() => { load(); }, [load]);

  async function act(action: "check_in" | "check_out") {
    setBusy(true);
    setError("");
    try {
      await post("/api/attendance", { action });
      await load();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  const fmt = (d?: string) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "–");

  return (
    <>
      <h1>{employee ? `Hello, ${employee.name}` : "Dashboard"}</h1>

      {user?.employee ? (
        <>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Today</h2>
            <p className="muted">Checked in: {fmt(today?.checkIn)} &nbsp; Checked out: {fmt(today?.checkOut)} {today?.hours != null && `(${today.hours} h)`}</p>
            <div className="row">
              <button disabled={busy || !!today} onClick={() => act("check_in")}>Check in</button>
              <button className="secondary" disabled={busy || !today || !!today?.checkOut} onClick={() => act("check_out")}>Check out</button>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
          </div>

          <div className="grid">
            {employee && (["annual", "sick", "casual"] as const).map((t) => (
              <div className="card" key={t}>
                <div className="muted">{t[0].toUpperCase() + t.slice(1)} leave left</div>
                <div className="stat">{employee.leaveBalance[t]}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">This account has no employee profile, so attendance and leave are not available.</p>
      )}
    </>
  );
}
