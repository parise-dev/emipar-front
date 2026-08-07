"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  PlusCircle,
  MessageCircle,
  ChevronDown,
  Users,
  BadgeCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ClientSheet } from "@/components/atendimento/client-sheet";

type Pedido = {
  id: string;
  nome: string;
  cpf?: string;
  phone: string;
  data_criacao?: string;
  produto?: string;
  quantidade: number;
  valor_total?: number;
  valor_frete?: number;
  status_pedido:
    | "Novo"
    | "Aberto"
    | "Andamento"
    | "Vendido"
    | "Cancelado"
    | string;
  status_pagamento?: string;
  status_envio?: string;
  seller?: string;
  endereco?: {
    cep?: string;
    logradouro?: string;
    complemento?: string;
    numero?: string;
    bairro?: string;
    localidade?: string;
    estado?: string;
    uf?: string;
    obs?: string;
  };
  ja_e_cliente?: boolean;
  sinalizacao_cliente?: string;
  calote_motivo?: string;
};

type AtendimentoPeriodFilter =
  | "todos"
  | "hoje"
  | "ontem"
  | "semana"
  | "mes"
  | "mes_passado"
  | "personalizado";

const ATENDIMENTO_PERIOD_FILTERS: {
  value: AtendimentoPeriodFilter;
  label: string;
}[] = [
  { value: "todos", label: "Todos" },
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "mes_passado", label: "Mês passado" },
  { value: "personalizado", label: "Personalizado" },
];

const API = "https://api.emipar.life";

function formatDateBR(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

function saudacaoBR() {
  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  ).getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function scrollToRow(id: string) {
  const el = document.querySelector(
    `[data-row-id="${CSS.escape(id)}"]`,
  ) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function normalizeStatusForFilter(status?: string) {
  const s = (status || "").trim();
  if (s === "Aberto") return "Novo"; // compat legado
  return s;
}

function pickCategoryForOrder(o?: Pedido) {
  if (!o) return "all" as const;

  const st = normalizeStatusForFilter(o.status_pedido);

  if (st === "Vendido") {
    if (o.status_envio === "Ag. Envio" || !o.status_envio)
      return "Vendido" as const;
    // se for vendido mas já foi pra envio/etiqueta, pode não entrar nesse filtro
    return "all" as const;
  }

  if (st === "Andamento") return "Andamento" as const;
  if (st === "Novo") return "Novo" as const;

  // qualquer outro status cai pra all
  return "all" as const;
}

function statusTone(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "vendido") return "emerald";
  if (s === "andamento") return "sky";
  if (s === "novo" || s === "aberto") return "amber";
  if (s === "cancelado") return "rose";
  return "zinc";
}

export default function AtendimentoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const lastOpenedRef = useRef<string>("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [periodFilter, setPeriodFilter] =
  useState<AtendimentoPeriodFilter>("hoje");
const [customStart, setCustomStart] = useState("");
const [customEnd, setCustomEnd] = useState("");

  const [category, setCategory] = useState<
    "all" | "Novo" | "Andamento" | "Vendido"
  >("Novo");
  const [templateMassOpen, setTemplateMassOpen] = useState(false);
  const [selected, setSelected] = useState<Pedido | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [highlightId, setHighlightId] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendingMass, setSendingMass] = useState(false);
  const [massProgress, setMassProgress] = useState({
    total: 0,
    done: 0,
    success: 0,
    error: 0,
  });

  async function loadOrders() {
  try {
    setLoading(true);

    const params = new URLSearchParams();

if (periodFilter !== "todos") {
  params.set("periodo", periodFilter);
}

if (periodFilter === "personalizado") {
  if (!customStart || !customEnd) {
    setOrders([]);
    return;
  }

  params.set("inicio", customStart);
  params.set("fim", customEnd);
}

const queryString = params.toString();

const res = await fetch(
  queryString ? `${API}/clientes?${queryString}` : `${API}/clientes`,
  {
    cache: "no-store",
  },
);

    const data = (await res.json()) as Pedido[];

    setOrders(Array.isArray(data) ? data : []);
    setSelectedIds([]);
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  loadOrders();
}, [periodFilter, customStart, customEnd]);

  // Quando vier ?open=<id>, abre o drawer
  useEffect(() => {
    const id = searchParams.get("open");
    if (!id) return;
    if (lastOpenedRef.current === id) return;
    if (loading) return;

    lastOpenedRef.current = id;

    (async () => {
      // tenta achar na lista atual primeiro
      const local = orders.find((o) => o.id === id);
      if (local) {
        // ✅ garante que o item apareça no filtro certo
        setCategory(pickCategoryForOrder(local));

        setSelected(local);
        setSheetOpen(true);

        setHighlightId(id);
        setTimeout(() => scrollToRow(id), 60);
        setTimeout(() => setHighlightId(""), 1400);

        setTimeout(() => {
          router.replace(pathname, { scroll: false });
        }, 200);

        return;
      }

      // se não achar, busca por id na API
      try {
        const res = await fetch(`${API}/clientes/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const c = (await res.json()) as Pedido;

        // ✅ garante que o item apareça no filtro certo
        setCategory(pickCategoryForOrder(c));

        setSelected(c);
        setSheetOpen(true);

        setHighlightId(id);
        setTimeout(() => scrollToRow(id), 60);
        setTimeout(() => setHighlightId(""), 1400);

        setTimeout(() => {
          router.replace(pathname, { scroll: false });
        }, 200);
      } catch {
        // silencioso
      }
    })();
  }, [searchParams, loading, orders, router, pathname]);

  const filtered = useMemo(() => {
    const isNovo = (s?: string) => s === "Novo" || s === "Aberto"; // compat legado
    if (category === "all") return orders;

    if (category === "Vendido") {
      return orders.filter(
        (o) =>
          o.status_pedido === "Vendido" &&
          (o.status_envio === "Ag. Envio" || !o.status_envio),
      );
    }

    if (category === "Novo") {
      return orders.filter((o) => isNovo(o.status_pedido));
    }

    return orders.filter((o) => o.status_pedido === category);
  }, [orders, category]);

  const counts = useMemo(() => {
    const total = orders.length;
    const novos = orders.filter(
      (o) => o.status_pedido === "Novo" || o.status_pedido === "Aberto",
    ).length;
    const andamento = orders.filter(
      (o) => o.status_pedido === "Andamento",
    ).length;
    const vendidoAg = orders.filter(
      (o) =>
        o.status_pedido === "Vendido" &&
        (o.status_envio === "Ag. Envio" || !o.status_envio),
    ).length;
    return { total, novos, andamento, vendidoAg };
  }, [orders]);

  async function handleMassTemplateSend() {
  setSendingMass(true);

  const total = selectedIds.length;

  setMassProgress({
    total,
    done: 0,
    success: 0,
    error: 0,
  });

  try {
    for (const id of selectedIds) {
      const cliente = orders.find((o) => o.id === id);

      if (!cliente) {
        setMassProgress((prev) => ({
          ...prev,
          done: prev.done + 1,
          error: prev.error + 1,
        }));

        continue;
      }

      try {
        // =====================================================
        // DADOS ORIGINAIS DO CHECKOUT
        // =====================================================

        const nome = cliente.nome;

        const quantidade = cliente.quantidade;

        const produto = cliente.produto || "ERONMAX";

        const logradouro =
          cliente.endereco?.logradouro || "";

        const localidade =
          cliente.endereco?.localidade || "";

        const numero =
          cliente.endereco?.numero || "";

        // =====================================================
        // FORMATA PEDIDO
        // Exemplo: 2 ERONMAX
        // =====================================================

        const pedido =
          `${quantidade} ${produto}`.trim();

        // =====================================================
        // FORMATA ENDEREÇO
        // Exemplo: Paulista, São Paulo, n° 71
        // =====================================================

        const enderecoBase = [
          logradouro,
          localidade,
        ]
          .filter(Boolean)
          .join(", ");

        const enderecoCompleto = numero
          ? `${enderecoBase}, n° ${numero}`
          : enderecoBase;

        // =====================================================
        // TEMPLATE META:
        //
        // Olá, {{1}}
        //
        // {{2}}
        //
        // {{3}}
        //
        // Fico no aguardo da sua confirmação.
        // =====================================================

        // {{1}}
        const variavelNome = nome;

        // {{2}}
        const variavelPedido =
          `Aqui é o Carlos, da equipe da Emipar Life. Recebemos seu pedido de ${pedido} e ele será entregue no endereço abaixo:`;

        // {{3}}
        const variavelEndereco =
          `📍 Rua: ${enderecoCompleto}`;

        // =====================================================
        // PREVIEW SALVO NO SEU SISTEMA
        // Fica igual ao WhatsApp
        // =====================================================

        const textPreview = `Olá, ${variavelNome}

${variavelPedido}

${variavelEndereco}

Fico no aguardo da sua confirmação.`;

        // =====================================================
        // ENVIA TEMPLATE PARA API
        // =====================================================

        const res = await fetch(
          `${API}/whatsapp/send-template/generic`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              to: cliente.phone,

              clientId: cliente.id,

              conversationId: "",

              templateName: "01_nottifica",

              variables: [
                variavelNome,
                variavelPedido,
                variavelEndereco,
              ],

              textPreview,
            }),
          },
        );

        const data = await res
          .json()
          .catch(() => null);

        // =====================================================
        // ERRO
        // =====================================================

        if (!res.ok || !data?.success) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : data?.error?.error?.message ||
                "Falha ao enviar template",
          );
        }

        // =====================================================
        // MANTÉM SUA REGRA ATUAL:
        // NOVO / ABERTO -> ANDAMENTO
        // =====================================================

        if (
          !data?.pending &&
          data?.conversationId &&
          (
            cliente.status_pedido === "Novo" ||
            cliente.status_pedido === "Aberto"
          )
        ) {
          await fetch(
            `${API}/clientes/${cliente.id}`,
            {
              method: "PUT",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                status_pedido: "Andamento",
              }),
            },
          );

          setOrders((prev) =>
            prev.map((pedidoAtual) =>
              pedidoAtual.id === cliente.id
                ? {
                    ...pedidoAtual,
                    status_pedido: "Andamento",
                  }
                : pedidoAtual,
            ),
          );
        }

        // =====================================================
        // SUCESSO
        // =====================================================

        setMassProgress((prev) => ({
          ...prev,
          done: prev.done + 1,
          success: prev.success + 1,
        }));
      } catch (error) {
        console.error(
          `Erro ao enviar template para ${cliente.nome}:`,
          error,
        );

        setMassProgress((prev) => ({
          ...prev,
          done: prev.done + 1,
          error: prev.error + 1,
        }));
      }
    }
  } finally {
    setSendingMass(false);
  }
}

  async function updateStatus(id: string, status_pedido: string) {
    // otimista
    setOrders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status_pedido } : p)),
    );

    // Cancelado de verdade
    if (status_pedido === "Cancelado") {
      await fetch(`${API}/clientes/${id}/cancelar`, { method: "PATCH" });

      const res = await fetch(`${API}/clientes/${id}`, { cache: "no-store" });
      if (res.ok) {
        const updated = (await res.json()) as Pedido;
        setOrders((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)),
        );
        setSelected((cur) => (cur?.id === updated.id ? updated : cur));
      }
      return;
    }

    // Se virou vendido, garante status_envio Ag. Envio num único request
    const body: any = { status_pedido };
    if (status_pedido === "Vendido") body.status_envio = "Ag. Envio";

    await fetch(`${API}/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function enviarWhatsApp(
    num: string,
    name: string,
    qtd: number,
    seller = "Lucas",
    item: any,
  ) {
    const msg = encodeURIComponent(
      `${saudacaoBR()} *${name}*, tudo bem? Aqui é o ${seller}, responsável pelo atendimento ao cliente da *EMIPAR*. ` +
        `Estou passando para avisar que seu pedido de *${qtd} ${item}* será entregue no endereço abaixo: `,
    );
    window.open(`https://wa.me/55${num}?text=${msg}`, "_blank");
  }

  function openClient(id: string) {
    const found = orders.find((o) => o.id === id);
    if (!found) return;

    setSelected(found);
    setSheetOpen(true);

    setHighlightId(id);
    setTimeout(() => scrollToRow(id), 60);
    setTimeout(() => setHighlightId(""), 1700);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Atendimento</h1>
          <p className="text-sm text-zinc-500">
  Gerencie pedidos, status e dados do cliente por período.
</p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
  <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
    {ATENDIMENTO_PERIOD_FILTERS.map((filter) => {
      const active = periodFilter === filter.value;

      return (
        <button
          key={filter.value}
          type="button"
          onClick={() => setPeriodFilter(filter.value)}
          className={[
            "rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition",
            active
              ? "border-emerald-200 bg-emerald-600 text-white shadow-emerald-600/20"
              : "border-zinc-200 bg-white/80 text-zinc-700 hover:bg-zinc-50",
          ].join(" ")}
        >
          {filter.label}
        </button>
      );
    })}

    <button
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-white"
      onClick={loadOrders}
      title="Recarregar"
      type="button"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      Atualizar
    </button>
  </div>

  {periodFilter === "personalizado" && (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/70 p-2 shadow-sm">
      <input
        type="date"
        value={customStart}
        onChange={(e) => setCustomStart(e.target.value)}
        className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
      />

      <span className="text-xs font-semibold text-zinc-400">até</span>

      <input
        type="date"
        value={customEnd}
        onChange={(e) => setCustomEnd(e.target.value)}
        className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  )}
</div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          tone="zinc"
          title="Todos"
          value={counts.total}
          active={category === "all"}
          onClick={() => setCategory("all")}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          tone="amber"
          title="Novos"
          value={counts.novos}
          active={category === "Novo"}
          onClick={() => setCategory("Novo")}
          icon={<Mail className="h-5 w-5" />}
        />
        <KpiCard
          tone="sky"
          title="Andamento"
          value={counts.andamento}
          active={category === "Andamento"}
          onClick={() => setCategory("Andamento")}
          icon={<MessageCircle className="h-5 w-5" />}
        />
        <KpiCard
          tone="emerald"
          title="Vendidos (Ag. envio)"
          value={counts.vendidoAg}
          active={category === "Vendido"}
          onClick={() => setCategory("Vendido")}
          icon={<BadgeCheck className="h-5 w-5" />}
        />
      </div>

      {/* Table Card */}
      <div className="cardPlus overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-medium text-zinc-700">
              Lista de pedidos
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                {filtered.length} itens
              </span>

              {selectedIds.length > 0 && (
                <button
                  onClick={() => setTemplateMassOpen(true)}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Enviar em massa ({selectedIds.length})
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur">
              <tr className="border-b text-zinc-500">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === filtered.length &&
                      filtered.length > 0
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filtered.map((i) => i.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left">Ações</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-left">Qtd</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Detalhes</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Vendedor</th>
                <th className="px-4 py-3 text-left">Recompra</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-zinc-500"
                    colSpan={8}
                  >
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-zinc-500"
                    colSpan={8}
                  >
                    Nenhum registro nessa visão.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isH = highlightId === item.id;
                  const tone = statusTone(item.status_pedido);

                  return (
                    <tr
                      key={item.id}
                      data-row-id={item.id}
                      className={[
                        "border-b last:border-b-0",
                        "hover:bg-zinc-50/80 transition-colors",
                        isH ? "rowGlow" : "",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, item.id]);
                            } else {
                              setSelectedIds((prev) =>
                                prev.filter((id) => id !== item.id),
                              );
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="btnIcon emerald"
                            title="WhatsApp"
                            onClick={() =>
                              enviarWhatsApp(
                                item.phone,
                                item.nome,
                                item.quantidade,
                                item.seller || "Lucas",
                                item.produto,
                              )
                            }
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button className="btnIcon sky" title="E-mail">
                            <Mail className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`statusPill ${tone}`}>
                            {item.status_pedido === "Aberto"
                              ? "Novo"
                              : item.status_pedido}
                          </span>
                          <span className="font-medium text-zinc-900">
                            {item.nome}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{item.phone}</td>
                      <td className="px-4 py-3 text-zinc-700">
                        {item.quantidade}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-flex items-center">
                          <select
                            className="h-9 rounded-xl border bg-white/70 px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-emerald-200 shadow-sm"
                            value={
                              item.status_pedido === "Aberto"
                                ? "Novo"
                                : item.status_pedido
                            }
                            onChange={(e) =>
                              updateStatus(item.id, e.target.value)
                            }
                          >
                            <option value="Novo">Novo</option>
                            <option value="Andamento">Andamento</option>
                            <option value="Vendido">Vendido</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-zinc-400" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openClient(item.id)}
                          className="btnSoft"
                        >
                          Abrir
                        </button>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatDateBR(item.data_criacao)}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {item.seller || "-"}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-block w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                              item.ja_e_cliente
                                ? "border-red-300 bg-red-100 text-red-600"
                                : "border-green-300 bg-green-100 text-green-600"
                            }`}
                          >
                            {item.ja_e_cliente ? "Recompra" : "Novo"}
                          </span>

                          {item.sinalizacao_cliente === "calote" && (
                            <span
                              title={
                                item.calote_motivo ||
                                "Cliente com histórico de calote"
                              }
                              className="inline-block w-fit rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700"
                            >
                              Calote
                            </span>
                          )}
                        </div>
                      </td>{" "}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientSheet
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setSelected(null);
        }}
        pedido={selected}
        onUpdated={(updated) => {
          setOrders((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p)),
          );
          setSelected(updated);
        }}
      />
      {templateMassOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Envio em massa
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {selectedIds.length} cliente(s) selecionado(s). Escolha o
                template para enviar.
              </p>
            </div>

            <button
              disabled={sendingMass}
              onClick={handleMassTemplateSend}
              className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 p-4 text-left hover:bg-zinc-50 disabled:opacity-60"
            >
              <div>
                <div className="font-semibold text-zinc-900">
                  Confirmar endereço
                </div>
                <div className="text-sm text-zinc-500">
                  Template aprovado confirmar_pedido
                </div>
              </div>

              {sendingMass && <Loader2 className="h-5 w-5 animate-spin" />}
            </button>

            {(sendingMass || massProgress.total > 0) && (
              <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-zinc-800">
                    Enviando templates
                  </span>
                  <span className="text-zinc-500">
                    {massProgress.done}/{massProgress.total}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    style={{
                      width: `${
                        massProgress.total
                          ? Math.round(
                              (massProgress.done / massProgress.total) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white p-2">
                    <div className="font-bold text-zinc-900">
                      {massProgress.total}
                    </div>
                    <div className="text-zinc-500">Total</div>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-2">
                    <div className="font-bold text-emerald-700">
                      {massProgress.success}
                    </div>
                    <div className="text-emerald-700">Sucesso</div>
                  </div>

                  <div className="rounded-xl bg-rose-50 p-2">
                    <div className="font-bold text-rose-700">
                      {massProgress.error}
                    </div>
                    <div className="text-rose-700">Erro</div>
                  </div>
                </div>

                {!sendingMass && massProgress.total > 0 && (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                    Envio finalizado.
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={sendingMass}
                onClick={() => setTemplateMassOpen(false)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* estilos locais (mesma vibe do dashboard) */}
      <style jsx global>{`
        .cardPlus {
          border-radius: 20px;
          border: 1px solid rgba(24, 24, 27, 0.08);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.78),
            rgba(255, 255, 255, 0.55)
          );
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
          backdrop-filter: blur(8px);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease;
        }
        .cardPlus:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.09);
          border-color: rgba(24, 24, 27, 0.14);
        }

        .iconBadge {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
        }
        .iconBadge svg {
          opacity: 0.95;
        }

        .iconBadge.zinc {
          background: linear-gradient(
            135deg,
            rgba(24, 24, 27, 0.12),
            rgba(24, 24, 27, 0.06)
          );
          color: rgb(63 63 70);
        }
        .iconBadge.emerald {
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.18),
            rgba(16, 185, 129, 0.08)
          );
          color: rgb(5 150 105);
        }
        .iconBadge.sky {
          background: linear-gradient(
            135deg,
            rgba(14, 165, 233, 0.18),
            rgba(14, 165, 233, 0.08)
          );
          color: rgb(2 132 199);
        }
        .iconBadge.amber {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.18),
            rgba(245, 158, 11, 0.08)
          );
          color: rgb(217 119 6);
        }

        .btnIcon {
          height: 40px;
          width: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1px solid rgba(24, 24, 27, 0.12);
          background: rgba(255, 255, 255, 0.65);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            border-color 0.16s ease;
        }
        .btnIcon:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 26px rgba(0, 0, 0, 0.1);
          border-color: rgba(24, 24, 27, 0.18);
          background: rgba(255, 255, 255, 0.8);
        }
        .btnIcon.emerald {
          color: rgb(5 150 105);
        }
        .btnIcon.sky {
          color: rgb(2 132 199);
        }

        .btnSoft {
          border-radius: 14px;
          border: 1px solid rgba(24, 24, 27, 0.12);
          background: rgba(255, 255, 255, 0.65);
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            border-color 0.16s ease;
        }
        .btnSoft:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 26px rgba(0, 0, 0, 0.1);
          border-color: rgba(24, 24, 27, 0.18);
          background: rgba(255, 255, 255, 0.8);
        }

        .statusPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(24, 24, 27, 0.08);
          background: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.04);
        }
        .statusPill.emerald {
          color: rgb(5 150 105);
          background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.16),
            rgba(255, 255, 255, 0.7)
          );
        }
        .statusPill.sky {
          color: rgb(2 132 199);
          background: linear-gradient(
            135deg,
            rgba(14, 165, 233, 0.16),
            rgba(255, 255, 255, 0.7)
          );
        }
        .statusPill.amber {
          color: rgb(217 119 6);
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.16),
            rgba(255, 255, 255, 0.7)
          );
        }
        .statusPill.rose {
          color: rgb(225 29 72);
          background: linear-gradient(
            135deg,
            rgba(244, 63, 94, 0.16),
            rgba(255, 255, 255, 0.7)
          );
        }
        .statusPill.zinc {
          color: rgb(63 63 70);
          background: linear-gradient(
            135deg,
            rgba(24, 24, 27, 0.1),
            rgba(255, 255, 255, 0.7)
          );
        }

        .rowGlow {
          background: linear-gradient(
            90deg,
            rgba(16, 185, 129, 0.16),
            rgba(255, 255, 255, 0.7)
          ) !important;
          animation: rowPulse 1.7s ease both;
        }
        @keyframes rowPulse {
          0% {
            box-shadow: inset 0 0 0 rgba(0, 0, 0, 0);
          }
          35% {
            box-shadow: inset 0 0 0 999px rgba(16, 185, 129, 0.08);
          }
          100% {
            box-shadow: inset 0 0 0 rgba(0, 0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}

function KpiCard({
  title,
  value,
  active,
  onClick,
  tone = "zinc",
  icon,
}: {
  title: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
  tone?: "zinc" | "amber" | "sky" | "emerald";
  icon: React.ReactNode;
}) {
  const toneClass = `iconBadge ${tone}`;

  return (
    <button
      onClick={onClick}
      className={[
        "cardPlus p-4 text-left w-full",
        active ? "ring-2 ring-emerald-200 border-emerald-200" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-700">{title}</div>
        <div className={toneClass}>{icon}</div>
      </div>

      <div className="mt-2 text-3xl font-semibold text-zinc-900">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">Clique para filtrar</div>
    </button>
  );
}
