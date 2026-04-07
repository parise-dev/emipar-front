"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Headset,
  Truck,
  Wallet,
  Package,
  Settings,
  Menu,
  X,
} from "lucide-react";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Atendimento", href: "/atendimento", icon: Headset },
  { label: "Envios", href: "/envios", icon: Truck },
  { label: "Financeiro", href: "/financeiro", icon: Wallet },
  { label: "Estoque", href: "/estoque", icon: Package },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // ✅ fecha ao trocar de rota
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ✅ trava scroll quando menu mobile aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* ✅ MOBILE TOPBAR */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-sky-100 bg-white/85 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-sky-700 ring-1 ring-black/5">
            <Image src="/logo.png" alt="Gull" fill className="object-contain p-1" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-black tracking-tight leading-none">
    EMIPAR LIFE
  </div>
            <div className="text-xs text-zinc-500">CRM</div>
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white shadow-sm hover:bg-zinc-50"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5 text-zinc-700" />
        </button>
      </header>

      {/* ✅ DESKTOP SIDEBAR (igual seu original) */}
      <aside className="hidden w-56 flex-col border-r border-sky-100 bg-gradient-to-b from-sky-600 via-sky-700 to-slate-900 text-white md:flex">
        
        <Brand />
      
        <nav className="flex flex-1 flex-col gap-2 px-3 py-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname?.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  active ? "bg-white/15 text-white" : "text-white/90 hover:bg-white/10",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 text-xs text-white/60">Tema • v3</div>
      </aside>

      {/* ✅ MOBILE DRAWER */}
      <div
        className={[
          "fixed inset-0 z-50 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        {/* overlay */}
        <div
          onClick={() => setOpen(false)}
          className={[
            "absolute inset-0 bg-black/40 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        {/* drawer */}
        <div
          className={[
            "absolute left-0 top-0 h-full w-[82%] max-w-[320px] border-r border-sky-100 bg-gradient-to-b from-sky-600 via-sky-700 to-slate-900 text-white shadow-2xl transition-transform",
            open ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-5 py-5">
            <Brand compact />

            <button
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 hover:bg-white/15"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-2 px-3 py-2">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                    active ? "bg-white/15 text-white" : "text-white/90 hover:bg-white/10",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 text-xs text-white/60">Tema • v3</div>
        </div>
      </div>
    </>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 sm:mt-5 mb-7 sm:ps-4">
      <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
        <Image src="/logo.png" alt="Gull" fill className="object-contain p-1" />
      </div>

      {!compact ? (
       <div>
  <div className="text-lg font-extrabold tracking-wide leading-none">
    EMIPAR LIFE
  </div>
  <div className="mt-0.5 text-[11px] uppercase tracking-wide text-white/70">
    CRM
  </div>
</div>

      ) : (
        <div>
  <div className="text-base font-extrabold tracking-tight leading-none">
    EMIPAR LIFE
  </div>
  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-white/70">
    CRM
  </div>
</div>

      )}
    </div>
  );
}
