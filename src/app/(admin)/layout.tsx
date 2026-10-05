import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { findSessionUserById } from "@/features/auth/auth.repository";
import { getSession } from "@/shared/auth/session";
import "./admin.css";

export const metadata: Metadata = {
  title: {
    default: "Panel",
    template: "%s | Admin Omega Complex",
  },
  description: "Centro de operaciones de Omega Complex.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/");

  const user = await findSessionUserById(session.userId);
  if (!user) redirect("/login?next=/admin");

  return (
    <div className="admin-scope">
      <AdminShell
        user={{ firstName: user.firstName, lastName: user.lastName, email: user.email }}
      >
        {children}
      </AdminShell>
    </div>
  );
}
