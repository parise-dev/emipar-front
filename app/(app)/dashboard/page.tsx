"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Truck,
  BadgeDollarSign,
  Package,
  Wallet,
  HandCoins,
  Users,
} from "lucide-react";

type RankingItem = {
  vendedor: string;

  // ✅ novo (ranking geral / all-time)
  clientes_recebidos?: number; // total de leads recebidos
  vendidos_qtd?: number; // qtd vendidos (status atual)
  taxa_fechamento?: number; // % vendidos / recebidos

  // legado (se existir)
  valor_fechado?: number;

  // formato atual do meu server.js (mantive)
  fechado?: number;
  concluido?: number;
};

type DayDash = {
  data: string;

  // legado (se existir)
  financeiroGerado?: { quantidade_clientes: number; soma_valor_total: number };
  financeiroFechado?: { quantidade: number; soma_valor_total: number };
  financeiroRecebido?: { quantidade: number; soma_valor_total: number };
  financeiroConcluido?: { quantidade: number; soma_valor_total: number };

  custoFrete?: number;
  custoProdutos?: number;
  custoTotal?: number;
  lucro?: number;

  // ✅ novo (server.js atualizado)
  geradoHoje?: { quantidade_clientes: number; soma_valor_total: number };
  fechadoHoje?: { quantidade: number; soma_valor_total: number };
  recebidoHoje?: { quantidade: number; soma_valor_total: number };
  concluidoHoje?: { quantidade: number; soma_valor_total: number };

  gastoFrete?: number;
  gastoProdutos?: number;
  totalDia?: number;

  ranking?: RankingItem[];
};

type ApiDash = { hoje: DayDash; ontem: DayDash };

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [hoje, setHoje] = useState<DayDash | null>(null);
  const [ontem, setOntem] = useState<DayDash | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await fetch(`${API_BASE}/dashboard/diario`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const j = (await r.json()) as ApiDash;
        if (!mounted) return;
        setHoje(j.hoje);
        setOntem(j.ontem);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Erro ao carregar dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ normaliza: funciona com API nova + antiga
  const norm = useMemo(() => {
    const h = hoje || ({} as DayDash);
    const o = ontem || ({} as DayDash);

    const hGerado = h.geradoHoje ?? h.financeiroGerado ?? { quantidade_clientes: 0, soma_valor_total: 0 };
    const hFechado = h.fechadoHoje ?? h.financeiroFechado ?? { quantidade: 0, soma_valor_total: 0 };
    const hRecebido = h.recebidoHoje ?? h.financeiroRecebido ?? { quantidade: 0, soma_valor_total: 0 };
    const hConcluido = h.concluidoHoje ?? h.financeiroConcluido ?? { quantidade: 0, soma_valor_total: 0 };

    const oGerado = o.geradoHoje ?? o.financeiroGerado ?? { quantidade_clientes: 0, soma_valor_total: 0 };
    const oFechado = o.fechadoHoje ?? o.financeiroFechado ?? { quantidade: 0, soma_valor_total: 0 };

    const hCustoFrete = (h.gastoFrete ?? h.custoFrete ?? 0) || 0;
    const hCustoProdutos = (h.gastoProdutos ?? h.custoProdutos ?? 0) || 0;
    const hCustoTotal = (h.custoTotal ?? (hCustoFrete + hCustoProdutos)) || 0;

    // ✅ no server novo, "totalDia" já vem calculado (concluido - frete - produtos)
    // mas se não vier, calculamos aqui
    const hLucro = (h.totalDia ?? h.lucro ?? (hConcluido.soma_valor_total - hCustoTotal)) || 0;

    const oCustoFrete = (o.gastoFrete ?? o.custoFrete ?? 0) || 0;
    const oCustoProdutos = (o.gastoProdutos ?? o.custoProdutos ?? 0) || 0;
    const oCustoTotal = (o.custoTotal ?? (oCustoFrete + oCustoProdutos)) || 0;

    const oConcluido = o.concluidoHoje ?? o.financeiroConcluido ?? { quantidade: 0, soma_valor_total: 0 };
    const oLucro = (o.totalDia ?? o.lucro ?? (oConcluido.soma_valor_total - oCustoTotal)) || 0;

    const deltaLucro = hLucro - oLucro;

    return {
      // kpis
      geradoQtd: hGerado.quantidade_clientes ?? 0,
      geradoVal: hGerado.soma_valor_total ?? 0,

      fechadoQtd: hFechado.quantidade ?? 0,
      fechadoVal: hFechado.soma_valor_total ?? 0,

      recebidoQtd: hRecebido.quantidade ?? 0,
      recebidoVal: hRecebido.soma_valor_total ?? 0,

      concluidoQtd: hConcluido.quantidade ?? 0,
      concluidoVal: hConcluido.soma_valor_total ?? 0,

      custoFrete: hCustoFrete,
      custoProdutos: hCustoProdutos,
      custoTotal: hCustoTotal,

      lucro: hLucro,
      lucroOntem: oLucro,
      deltaLucro,

      // comparativo extra
      novosHoje: hGerado.quantidade_clientes ?? 0,
      novosOntem: oGerado.quantidade_clientes ?? 0,
      fechadoHoje: hFechado.soma_valor_total ?? 0,
      fechadoOntem: oFechado.soma_valor_total ?? 0,
    };
  }, [hoje, ontem]);

  const ranking = useMemo(() => {
    const list = hoje?.ranking || [];

    return list
      .map((r) => {
        const valorFechado = safeNum(r.valor_fechado ?? r.fechado ?? 0);
        const valorConcluido = safeNum(r.concluido ?? 0);
        const total = valorFechado + valorConcluido;

        const leads = safeInt(r.clientes_recebidos ?? 0);
        const vendidosQtd = safeInt(r.vendidos_qtd ?? 0);
        // server já manda taxa_fechamento, mas calculo fallback pra garantir
        const taxa = Number(
          safeNum(
            r.taxa_fechamento != null
              ? r.taxa_fechamento
              : leads > 0
              ? (vendidosQtd / leads) * 100
              : 0
          ).toFixed(1)
        );

        return {
          vendedor: r.vendedor || "Sem vendedor",
          valorFechado,
          valorConcluido,
          total,
          leads,
          vendidosQtd,
          taxa,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [hoje]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-600">Resumo do dia (hoje e ontem) com base na sua API.</p>
        </div>
        <button
          className="rounded-xl border bg-white/80 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white"
          onClick={() => window.location.reload()}
        >
          Atualizar
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
      ) : null}

      {/* TOP KPIs (cards melhores) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          tone="blue"
          title="Gerado Hoje"
          icon={<Users className="h-5 w-5" />}
          value={loading ? "..." : formatBRL(norm.geradoVal)}
          subtitle={loading ? "" : `${norm.geradoQtd} clientes`}
        />

        <KpiCard
          tone="green"
          title="Fechado Hoje"
          icon={<TrendingUp className="h-5 w-5" />}
          value={loading ? "..." : formatBRL(norm.fechadoVal)}
          subtitle={loading ? "" : `${norm.fechadoQtd} vendidos`}
        />

        <KpiCard
          tone="emerald"
          title="Recebido Hoje"
          icon={<HandCoins className="h-5 w-5" />}
          value={loading ? "..." : formatBRL(norm.recebidoVal)}
          subtitle={loading ? "" : `${norm.recebidoQtd} pagamentos`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* CUSTOS */}
        <Card className="cardPlus p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-700">Custos Hoje</div>
            <div className="iconBadge amber">
              <Package className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 space-y-2 text-sm">
            <Row label="Frete" value={loading ? "..." : formatBRL(norm.custoFrete)} />
            <Row label="Produtos" value={loading ? "..." : formatBRL(norm.custoProdutos)} />
            <div className="my-2 h-px w-full bg-zinc-100" />
            <Row label="Total custos" value={loading ? "..." : formatBRL(norm.custoTotal)} strong />
          </div>

          <div className="mt-3 rounded-2xl border bg-white/70 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-700">Lucro do Dia</div>
              <div className="iconBadge green">
                <BadgeDollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold">{loading ? "..." : formatBRL(norm.lucro)}</div>
            <p className="text-xs text-zinc-500">Concluído - Custos</p>
          </div>
        </Card>

        {/* COMPARATIVO */}
        <Card className="cardPlus p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-700">Comparativo</div>
            <div className="iconBadge sky">
              <Wallet className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-semibold">{loading ? "..." : formatBRL(norm.deltaLucro)}</div>
            <p className="text-sm text-zinc-600">Diferença do lucro (hoje - ontem)</p>

            {!loading ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-sm shadow-sm">
                {norm.deltaLucro >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">{norm.deltaLucro >= 0 ? "Melhor" : "Pior"} que ontem</span>
              </div>
            ) : null}

            <div className="mt-4 space-y-2 text-sm">
              <Row label="Novos (Hoje)" value={loading ? "..." : String(norm.novosHoje)} />
              <Row label="Novos (Ontem)" value={loading ? "..." : String(norm.novosOntem)} />
              <Row label="Fechado (Hoje)" value={loading ? "..." : formatBRL(norm.fechadoHoje)} />
              <Row label="Fechado (Ontem)" value={loading ? "..." : formatBRL(norm.fechadoOntem)} />
            </div>
          </div>
        </Card>

        {/* RANKING */}
        <Card className="cardPlus p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zinc-700">Ranking de vendedores - Geral</div>
            <div className="iconBadge violet">
              <Truck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 space-y-2 text-sm">
            {loading ? <div className="text-zinc-500">Carregando...</div> : null}
            {!loading && ranking.length === 0 ? <div className="text-zinc-500">Sem dados.</div> : null}

            {!loading &&
              ranking.map((r, idx) => (
                <div
                  key={r.vendedor + idx}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-white/60 px-3 py-2 shadow-sm"
                >
                  <div className="min-w-0 truncate">
                    <span className="mr-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                      #{idx + 1}
                    </span>
                    <span className="font-medium">{r.vendedor}</span>

                    <div className="mt-0.5 text-xs text-zinc-500">
                      Fechado: {formatBRL(r.valorFechado)} | Concluído: {formatBRL(r.valorConcluido)}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-zinc-600">
                        Leads: <b className="text-zinc-800">{r.leads}</b>
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        Vendidos: <b className="text-emerald-900">{r.vendidosQtd}</b>
                      </span>
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                        Taxa: <b className="text-sky-900">{r.taxa}%</b>
                      </span>
                    </div>
                  </div>

                  <div className="whitespace-nowrap font-semibold text-emerald-700">{formatBRL(r.total)}</div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* DETALHES */}
      <Card className="cardPlus p-4">
        <div className="text-sm font-medium text-zinc-700">Detalhes</div>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white/60 p-3 shadow-sm">
            <div className="text-xs font-semibold text-zinc-500">HOJE</div>
            <div className="mt-1 text-sm text-zinc-700">{hoje?.data || "-"}</div>
            <div className="mt-2 space-y-1 text-sm">
              <Row label="Gerado" value={formatBRL((hoje?.geradoHoje ?? hoje?.financeiroGerado)?.soma_valor_total)} />
              <Row label="Fechado" value={formatBRL((hoje?.fechadoHoje ?? hoje?.financeiroFechado)?.soma_valor_total)} />
              <Row label="Recebido" value={formatBRL((hoje?.recebidoHoje ?? hoje?.financeiroRecebido)?.soma_valor_total)} />
              <Row label="Concluído" value={formatBRL((hoje?.concluidoHoje ?? hoje?.financeiroConcluido)?.soma_valor_total)} />
              <Row
                label="Custos"
                value={formatBRL(
                  (hoje?.custoTotal ??
                    ((hoje?.gastoFrete ?? hoje?.custoFrete ?? 0) + (hoje?.gastoProdutos ?? hoje?.custoProdutos ?? 0))) as any
                )}
              />
              <Row label="Lucro" value={formatBRL((hoje?.totalDia ?? hoje?.lucro ?? 0) as any)} strong />
            </div>
          </div>

          <div className="rounded-2xl border bg-white/60 p-3 shadow-sm">
            <div className="text-xs font-semibold text-zinc-500">ONTEM</div>
            <div className="mt-1 text-sm text-zinc-700">{ontem?.data || "-"}</div>
            <div className="mt-2 space-y-1 text-sm">
              <Row label="Gerado" value={formatBRL((ontem?.geradoHoje ?? ontem?.financeiroGerado)?.soma_valor_total)} />
              <Row label="Fechado" value={formatBRL((ontem?.fechadoHoje ?? ontem?.financeiroFechado)?.soma_valor_total)} />
              <Row label="Recebido" value={formatBRL((ontem?.recebidoHoje ?? ontem?.financeiroRecebido)?.soma_valor_total)} />
              <Row label="Concluído" value={formatBRL((ontem?.concluidoHoje ?? ontem?.financeiroConcluido)?.soma_valor_total)} />
              <Row
                label="Custos"
                value={formatBRL(
                  (ontem?.custoTotal ??
                    ((ontem?.gastoFrete ?? ontem?.custoFrete ?? 0) + (ontem?.gastoProdutos ?? ontem?.custoProdutos ?? 0))) as any
                )}
              />
              <Row label="Lucro" value={formatBRL((ontem?.totalDia ?? ontem?.lucro ?? 0) as any)} strong />
            </div>
          </div>
        </div>
      </Card>

      {/* estilos locais */}
      <style jsx global>{`
        .cardPlus {
          border-radius: 20px;
          border: 1px solid rgba(24, 24, 27, 0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.55));
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
          backdrop-filter: blur(8px);
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .cardPlus:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.09);
          border-color: rgba(24, 24, 27, 0.14);
        }

        .iconBadge {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,.06);
          box-shadow: 0 10px 24px rgba(0,0,0,.06);
        }
        .iconBadge svg { opacity: .95; }

        .iconBadge.blue { background: linear-gradient(135deg, rgba(59,130,246,.18), rgba(59,130,246,.08)); color: rgb(37 99 235); }
        .iconBadge.green { background: linear-gradient(135deg, rgba(34,197,94,.18), rgba(34,197,94,.08)); color: rgb(22 163 74); }
        .iconBadge.emerald { background: linear-gradient(135deg, rgba(16,185,129,.18), rgba(16,185,129,.08)); color: rgb(5 150 105); }
        .iconBadge.sky { background: linear-gradient(135deg, rgba(14,165,233,.18), rgba(14,165,233,.08)); color: rgb(2 132 199); }
        .iconBadge.violet { background: linear-gradient(135deg, rgba(139,92,246,.18), rgba(139,92,246,.08)); color: rgb(109 40 217); }
        .iconBadge.amber { background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.08)); color: rgb(217 119 6); }
      `}</style>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone = "blue",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: "blue" | "green" | "emerald";
}) {
  const toneClass =
    tone === "green"
      ? "iconBadge green"
      : tone === "emerald"
      ? "iconBadge emerald"
      : "iconBadge blue";

  return (
    <Card className="cardPlus p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-700">{title}</div>
        <div className={toneClass}>{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {subtitle ? <div className="mt-1 text-sm text-zinc-600">{subtitle}</div> : null}
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-zinc-600">{label}</div>
      <div className={strong ? "font-semibold text-zinc-900" : "text-zinc-800"}>{value}</div>
    </div>
  );
}

function safeNum(v: any) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function safeInt(v: any, def = 0) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : def;
}

function formatBRL(v: any) {
  const n = typeof v === "number" ? v : parseFloat(v);
  if (!Number.isFinite(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
