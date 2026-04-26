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
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100 md:flex-row">
        <Sidebar />

        <div className="flex min-h-0 w-full flex-1 flex-col">
          <div className="hidden md:block">
            <Header />
          </div>

          <main className="flex-1 p-3 md:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}