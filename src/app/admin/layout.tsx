import { AdminCommandCenterShell } from "@/components/admin/AdminCommandCenterShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminCommandCenterShell>{children}</AdminCommandCenterShell>;
}
