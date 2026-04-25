import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <AdminSidebar />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
