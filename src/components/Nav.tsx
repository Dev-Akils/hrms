"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/attendance", label: "Attendance" },
  { href: "/leaves", label: "Leave" },
  { href: "/payroll", label: "Payroll" },
  { href: "/audit", label: "Audit log", roles: ["admin"] },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();
  if (!user) return null;

  return (
    <nav className="nav">
      <strong>HRMS</strong>
      {links
        .filter((l) => !l.roles || l.roles.includes(user.role))
        .map((l) => (
          <Link key={l.href} href={l.href} className={path.startsWith(l.href) ? "active" : ""}>{l.label}</Link>
        ))}
      <span className="spacer" />
      <span className="muted">{user.email} ({user.role})</span>
      <button className="secondary" onClick={async () => { await logout(); router.replace("/login"); }}>Log out</button>
    </nav>
  );
}
