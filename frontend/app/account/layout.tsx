import { AccountSidebar } from "@/components/account-sidebar";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <AccountSidebar />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
