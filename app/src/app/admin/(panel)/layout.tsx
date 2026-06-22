import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

// Server gate for every page in the (panel) group: requires an authenticated
// admin with a valid 2FA session. Otherwise → /admin/login.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <AdminShell email={admin.email} adminRole={admin.profile.admin_role ?? null}>
      {children}
    </AdminShell>
  );
}
