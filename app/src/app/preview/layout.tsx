import { guardPublicMaintenance } from "@/lib/system-settings";

// Server gate: during maintenance, non-admins are redirected to /maintenance.
export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  await guardPublicMaintenance();
  return children;
}
