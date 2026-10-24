"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { apiFetch, post } from "./client";

export type Role = "admin" | "hr" | "manager" | "employee";
export type User = { id: string; email: string; role: Role; employee?: string };
export type EmployeeInfo = {
  name: string; employeeCode: string; department: string; designation: string;
  leaveBalance: { annual: number; sick: number; casual: number };
} | null;

type AuthState = {
  user: User | null;
  employee: EmployeeInfo;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<EmployeeInfo>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const r = await apiFetch("/api/auth/me");
      setUser(r.user);
      setEmployee(r.employee);
    } catch {
      setUser(null);
      setEmployee(null);
    }
  }, []);

  useEffect(() => { reload().finally(() => setLoading(false)); }, [reload]);

  const login = async (email: string, password: string) => {
    await post("/api/auth/login", { email, password });
    await reload();
  };
  const logout = async () => {
    await post("/api/auth/logout").catch(() => {});
    setUser(null);
    setEmployee(null);
  };

  return <Ctx.Provider value={{ user, employee, loading, login, logout, reload }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
};
