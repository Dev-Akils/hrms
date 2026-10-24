import "./globals.css";
import { ReactNode } from "react";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata = { title: "HRMS" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
