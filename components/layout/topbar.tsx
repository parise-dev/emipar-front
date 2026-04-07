"use client";

import { Search, Bell, Plus, LogOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api";
import { clearAuthSession, getUser } from "@/lib/auth";

type QuickClient = {
  id: string;
  nome?: string;
  phone?: string;
  produto?: string;
  seller?: string;
};

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function Topbar() {
  const router = useRouter();
  const user = getUser();

  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 350);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QuickClient[]>([]);
  const [open, setOpen] = useState(false);

  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        if (q.trim()) setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const term = debounced.trim();

    if (!term) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const data = await apiJson<any>(`/clientes/busca?q=${encodeURIComponent(term)}`);

        const arr = Array.isArray(data) ? data : [];
        if (!alive) return;

        const mapped: QuickClient[] = arr.map((c: any) => ({
          id: String(c.id),
          nome: c.nome,
          phone: c.phone,
          produto: c.produto,
          seller: c.seller,
        }));

        setResults(mapped);
        setOpen(true);
        setActiveIndex(mapped.length ? 0 : -1);
      } catch {
        if (!alive) return;
        setResults([]);
        setOpen(true);
        setActiveIndex(-1);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [debounced]);

  const hint = useMemo(() => {
    if (!q.trim()) return "Pesquisar cliente (nome, telefone, produto)…  Ctrl+K";
    if (loading) return "Buscando…";
    if (open && results.length === 0) return "Nenhum resultado";
    return "Pesquisar cliente (nome, telefone, produto)…  Ctrl+K";
  }, [q, loading, open, results.length]);

  function goToClient(id: string) {
    setOpen(false);
    setActiveIndex(-1);
    router.push(`/atendimento?open=${encodeURIComponent(id)}`);
  }

  function onKeyDownInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (q.trim()) setOpen(true);
      return;
    }

    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!results.length) return;
      setActiveIndex((i) => {
        const next = i < 0 ? 0 : Math.min(i + 1, results.length - 1);
        return next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      setActiveIndex((i) => {
        const next = i < 0 ? 0 : Math.max(i - 1, 0);
        return next;
      });
      return;
    }

    if (e.key === "Enter") {
      if (!results.length) return;
      const idx = activeIndex >= 0 ? activeIndex : 0;
      const chosen = results[idx];
      if (chosen?.id) goToClient(chosen.id);
    }
  }

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
        <div className="flex-1">
          <div ref={boxRef} className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

            <input
              ref={inputRef}
              id="quick-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => {
                if (q.trim()) setOpen(true);
              }}
              onKeyDown={onKeyDownInput}
              placeholder={hint}
              className="h-10 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />

            {open && q.trim() && (
              <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border bg-white shadow-lg">
                <div className="max-h-80 overflow-auto">
                  {results.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-zinc-500">
                      {loading ? "Buscando…" : "Nenhum resultado."}
                    </div>
                  ) : (
                    results.slice(0, 12).map((c, idx) => {
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={c.id}
                          className={[
                            "w-full px-4 py-3 text-left text-sm hover:bg-zinc-50",
                            active ? "bg-emerald-50" : "",
                          ].join(" ")}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => goToClient(c.id)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{c.nome || "Sem nome"}</div>
                              <div className="truncate text-xs text-zinc-500">
                                {c.phone || "—"} • {c.produto || "—"} • {c.seller || "—"}
                              </div>
                            </div>
                            <span className="rounded-full border px-2 py-1 text-xs text-zinc-500">
                              Abrir
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t px-4 py-2 text-xs text-zinc-500">
                  Dica: Ctrl+K para focar • Enter abre • ESC fecha • ↑/↓ navega
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push("/atendimento")}
          className="hidden md:inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Nova venda
        </button>

        <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hover:bg-zinc-50">
          <Bell className="h-4 w-4" />
        </button>

        <div className="hidden sm:flex items-center rounded-xl border bg-white px-3 py-2 text-sm text-zinc-700">
          {user?.nome || user?.email || "Usuário"}
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </header>
  );
}