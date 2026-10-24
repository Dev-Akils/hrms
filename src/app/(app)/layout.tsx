"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Nav from "@/components/Nav";

// Every page inside (app) requires a logged-in user. The API enforces permissions again on the server.
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <main><p className="muted">Loading…</p></main>;
  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  );
}
