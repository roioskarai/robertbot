import { guardPublicMaintenance } from "@/lib/system-settings";

// Server gate: during maintenance, non-admins are redirected to /maintenance.
// (Auth is enforced separately by the proxy for /dashboard.)
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await guardPublicMaintenance();
  return children;
}
