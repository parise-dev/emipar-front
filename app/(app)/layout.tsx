// app/(app)/layout.tsx
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}