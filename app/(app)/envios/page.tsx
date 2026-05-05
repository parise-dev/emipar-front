"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Plus,
  CheckCircle2,
  Sparkles,
  Clock3,
  Truck,
  PackageCheck,
  BadgeDollarSign,
  AlertTriangle,
  RotateCcw,
  Search,
  X,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { ClientSheet } from "@/components/atendimento/client-sheet";
import { PaymentDialog } from "@/components/envios/payment-dialog";

type Pedido = {
  id: string;
  nome: string;
  phone: string;
  quantidade: number;

  status_envio?:
    | "Etiqueta Gerada"
    | "Ag. Envio"
    | "Enviado"
    | "Entregue"
    | "Devolucao"
    | "Extravio"
    | string;

  status_pagamento?:
    | "Pago"
    | "Não Pago"
    | "Pendente"
    | "Aguardando Entrega"
    | string;

  status_extraviado?: "Pendente" | "Aberto" | "Finalizado" | string;
  extravio_resultado?: "Recebido" | "Perdido" | "" | string;

  codigo_rastreio?: string;
  valor_total?: number;
  data_pagamento?: string;
  origem_pagamento?: string;
  seller?: string;
};

type EnviosPeriodFilter =
  | "todos"
  | "hoje"
  | "ontem"
  | "semana"
  | "mes"
  | "mes_passado"
  | "personalizado";

const ENVIOS_PERIOD_FILTERS: {
  value: EnviosPeriodFilter;
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

// ✅ ordem que você quer (incluindo Ag. Envio como "Aguardando envio")
const cards = [
  {
    key: "Etiqueta Gerada",
    title: "Aguardando envio",
    icon: CheckCircle2,
    tone: "neutral",
  },
  { key: "Enviado", title: "Enviado", icon: Truck, tone: "sky" },
  { key: "Entregue", title: "Entregue", icon: PackageCheck, tone: "emerald" },
  { key: "Pendente", title: "Pendente", icon: Clock3, tone: "amber" },
  { key: "Pago", title: "Pago", icon: BadgeDollarSign, tone: "green" },
  { key: "Devolucao", title: "Devolução", icon: RotateCcw, tone: "neutral" },
  { key: "Extravio", title: "Extravio", icon: AlertTriangle, tone: "rose" },
] as const;

type CardKey = (typeof cards)[number]["key"];

function normPagamento(v?: string) {
  const s = String(v || "").trim();
  if (!s) return "Não Pago";
  return s;
}

function normEnvio(v?: string) {
  return String(v || "").trim();
}

function normText(v: any) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function EnviosPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [periodFilter, setPeriodFilter] = useState<EnviosPeriodFilter>("mes");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [active, setActive] = useState<CardKey>("Etiqueta Gerada");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payCtx, setPayCtx] = useState<Pedido | null>(null);

  const [q, setQ] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templateMassOpen, setTemplateMassOpen] = useState(false);
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

        /**
         * Envios deve filtrar pelo momento do envio/etiqueta,
         * não pela criação do cliente.
         */
        params.set("campoData", "data_envio");
      }

      if (periodFilter === "personalizado") {
        if (!customStart || !customEnd) {
          setOrders([]);
          setSelectedIds([]);
          return;
        }

        params.set("inicio", customStart);
        params.set("fim", customEnd);
      }

      const queryString = params.toString();

      const res = await fetch(
        queryString ? `${API}/clientes?${queryString}` : `${API}/clientes`,
        { cache: "no-store" },
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

  // ✅ Envios: entra quem tem status_envio definido (inclui "Ag. Envio")
  const shipped = useMemo(() => {
    return orders.filter((o) => {
      const se = normEnvio(o.status_envio);
      if (!se) return false;
      if (se === "Ag. Envio") return false; // ✅ IMPORTANTÍSSIMO: não mostrar Ag. Envio
      if (se === "Cancelado") return false;
      return true;
    });
  }, [orders]);

  const filteredBase = useMemo(() => {
    if (active === "Pendente") {
      return shipped.filter((c) => {
        const se = normEnvio(c.status_envio);
        const sp = normPagamento(c.status_pagamento);
        return se === "Entregue" && sp === "Pendente";
      });
    }

    if (active === "Pago") {
      return shipped.filter(
        (c) => normPagamento(c.status_pagamento) === "Pago",
      );
    }

    if (active === "Extravio") {
      return shipped.filter((c) => normEnvio(c.status_envio) === "Extravio");
    }

    if (active === "Devolucao") {
      return shipped.filter((c) => normEnvio(c.status_envio) === "Devolucao");
    }

    // ✅ aqui agora inclui "Ag. Envio" também
    return shipped.filter((c) => normEnvio(c.status_envio) === active);
  }, [shipped, active]);

  const filtered = useMemo(() => {
    const qq = normText(q);
    if (!qq) return filteredBase;

    return filteredBase.filter((c) => {
      const nome = normText(c.nome);
      const tel = normText(c.phone);
      const rastreio = normText(c.codigo_rastreio);
      return nome.includes(qq) || tel.includes(qq) || rastreio.includes(qq);
    });
  }, [filteredBase, q]);

  const selectedOrders = useMemo(() => {
    return orders.filter((order) => selectedIds.includes(order.id));
  }, [orders, selectedIds]);

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((item) => selectedIds.includes(item.id));

  const selectedWithTracking = selectedOrders.filter((item) =>
    String(item.codigo_rastreio || "").trim(),
  ).length;

  const selectedWithoutTracking = selectedOrders.length - selectedWithTracking;

  const counts = useMemo(() => {
    const base = Object.fromEntries(cards.map((c) => [c.key, 0])) as Record<
      CardKey,
      number
    >;

    for (const o of shipped) {
      const se = normEnvio(o.status_envio);
      const sp = normPagamento(o.status_pagamento);

      if (se === "Etiqueta Gerada") base["Etiqueta Gerada"]++;
      if (se === "Enviado") base["Enviado"]++;
      if (se === "Entregue") base["Entregue"]++;
      if (se === "Devolucao") base["Devolucao"]++;
      if (se === "Extravio") base["Extravio"]++;

      if (se === "Entregue" && sp === "Pendente") base["Pendente"]++;
      if (sp === "Pago") base["Pago"]++;
    }

    return base;
  }, [shipped]);

  async function updateEnvio(id: string, status_envio: string) {
    setOrders((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const next: any = { ...p, status_envio };

        if (status_envio === "Etiqueta Gerada")
          next.status_pagamento = "Aguardando Entrega";
        if (status_envio === "Enviado") next.status_pagamento = "Pendente";
        if (status_envio === "Entregue") next.status_pagamento = "Pendente";

        if (status_envio === "Extravio") {
          next.status_pagamento = "Não Pago";
          next.extravio_status = next.status_extraviado || "Pendente";
          next.extravio_resultado = next.status_extraviado || "";
        } else {
          next.status_extraviado = "";
          next.status_extraviado = "";
        }

        return next;
      }),
    );

    await fetch(`${API}/clientes/${id}/entrega`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status_envio }),
    });
  }

  function canEditPagamento(status_envio?: string) {
    const s = normEnvio(status_envio);
    return (
      s === "Enviado" ||
      s === "Entregue" ||
      s === "Extravio" ||
      s === "Devolucao"
    );
  }

  function onChangePagamento(item: Pedido, novoStatus: string) {
    if (!canEditPagamento(item.status_envio)) return;

    if (novoStatus === "Pago") {
      setPayCtx(item);
      setPayOpen(true);
      return;
    }

    const next = { ...item, status_pagamento: novoStatus };
    setOrders((prev) => prev.map((p) => (p.id === item.id ? next : p)));

    fetch(`${API}/clientes/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status_pagamento: novoStatus }),
    });
  }

  function onChangeExtraviado(item: Pedido, novoStatus: string) {
    // só permite alterar se realmente estiver em extravio
    if (item.status_envio !== "Extravio") return;

    const next: Pedido = {
      ...item,
      status_extraviado: novoStatus,
    };

    // se não estiver finalizado, limpa o resultado
    if (novoStatus !== "Finalizado") {
      (next as any).extravio_resultado = "";
    }

    // update otimista no front
    setOrders((prev) => prev.map((p) => (p.id === item.id ? next : p)));

    // persiste no backend
    fetch(`${API}/clientes/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status_envio: "Extravio",
        status_extraviado: novoStatus,
        extravio_resultado: (next as any).extravio_resultado || "",
      }),
    });
  }

  const totalCols = active === "Extravio" ? 9 : 8;

  function onChangeExtravioStatus(item: Pedido, status_extraviado: string) {
    const next: any = { ...item, status_extraviado };
    if (status_extraviado !== "Finalizado") next.extravio_resultado = "";

    setOrders((prev) => prev.map((p) => (p.id === item.id ? next : p)));

    fetch(`${API}/clientes/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status_envio: "Extravio",
        status_extraviado,
        extravio_resultado: next.extravio_resultado || "",
      }),
    });
  }

  function onChangeExtravioResultado(item: Pedido, extravio_resultado: string) {
    const next: any = { ...item, extravio_resultado };

    setOrders((prev) => prev.map((p) => (p.id === item.id ? next : p)));

    fetch(`${API}/clientes/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status_envio: "Extravio",
        extravio_status: item.status_extraviado || "Finalizado",
        extravio_resultado,
      }),
    });
  }

  async function confirmarPagamento(payload: {
    valor_pago?: number;
    data_pagamento: string;
    origem_pagamento: string;
  }) {
    if (!payCtx) return;

    const dataISO = payload.data_pagamento
      ? new Date(`${payload.data_pagamento}T12:00:00-03:00`).toISOString()
      : new Date().toISOString();

    const body = {
      status_pagamento: "Pago",
      data_pagamento: dataISO,
      origem_pagamento: payload.origem_pagamento,
      valor_pago: payload.valor_pago,
    };

    setOrders((prev) =>
      prev.map((p) =>
        p.id === payCtx.id
          ? {
              ...p,
              status_pagamento: "Pago",
              data_pagamento: body.data_pagamento,
              origem_pagamento: body.origem_pagamento,
              valor_pago: body.valor_pago,
            }
          : p,
      ),
    );

    await fetch(`${API}/clientes/${payCtx.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setPayOpen(false);
    setPayCtx(null);
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }

      return prev.filter((itemId) => itemId !== id);
    });
  }

  function toggleSelectAllFiltered(checked: boolean) {
    if (checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((item) => next.add(item.id));
        return Array.from(next);
      });
      return;
    }

    const filteredIds = new Set(filtered.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  }

  function openMassTemplateModal() {
    setMassProgress({
      total: 0,
      done: 0,
      success: 0,
      error: 0,
    });
    setTemplateMassOpen(true);
  }

  function closeMassTemplateModal() {
    if (sendingMass) return;
    setTemplateMassOpen(false);
  }

  async function handleMassCodigoRastreioSend() {
    const selectedClients = orders.filter((order) =>
      selectedIds.includes(order.id),
    );
    const total = selectedClients.length;

    if (!total) return;

    setSendingMass(true);
    setMassProgress({
      total,
      done: 0,
      success: 0,
      error: 0,
    });

    try {
      for (const cliente of selectedClients) {
        try {
          const res = await fetch(
            `${API}/whatsapp/send-template/cod-rastreio`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: cliente.phone,
                clientId: cliente.id,
                conversationId: "",
                nome: cliente.nome || "Cliente",
                codigo_rastreio: cliente.codigo_rastreio || "",
              }),
            },
          );

          const data = await res.json().catch(() => null);

          if (!res.ok || !data?.success) {
            throw new Error(
              data?.error || "Falha ao enviar código de rastreio",
            );
          }

          setMassProgress((prev) => ({
            ...prev,
            done: prev.done + 1,
            success: prev.success + 1,
          }));
        } catch (error) {
          console.error("Erro no envio em massa de rastreio:", {
            clienteId: cliente.id,
            nome: cliente.nome,
            error,
          });

          setMassProgress((prev) => ({
            ...prev,
            done: prev.done + 1,
            error: prev.error + 1,
          }));
        }

        await new Promise((resolve) => setTimeout(resolve, 900));
      }

      setSelectedIds([]);
    } finally {
      setSendingMass(false);
    }
  }

  function openClient(id: string) {
    const found = orders.find((o) => o.id === id);
    if (!found) return;
    setSelected(found);
    setSheetOpen(true);
  }

  const activeMeta = cards.find((c) => c.key === active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
  <div>
    <h1 className="text-2xl font-semibold">Envios</h1>
    <p className="text-sm text-zinc-600">
      Controle de etiqueta, envio, entrega e pagamento por período.
    </p>
  </div>

  <div className="flex flex-col items-start gap-2 lg:items-end">
    <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
      {ENVIOS_PERIOD_FILTERS.map((filter) => {
        const activeFilter = periodFilter === filter.value;

        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => setPeriodFilter(filter.value)}
            className={[
              "rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition",
              activeFilter
                ? "border-emerald-200 bg-emerald-600 text-white shadow-emerald-600/20"
                : "border-zinc-200 bg-white/80 text-zinc-700 hover:bg-zinc-50",
            ].join(" ")}
          >
            {filter.label}
          </button>
        );
      })}

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-white"
        onClick={loadOrders}
        title="Recarregar"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Atualizar
      </button>

      {selectedIds.length > 0 && (
        <button
          type="button"
          onClick={openMassTemplateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Enviar em massa ({selectedIds.length})
        </button>
      )}

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border bg-white/80 px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-white"
      >
        <Plus className="h-4 w-4" />
        Novo envio
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {cards.map((c) => (
          <StatusCard
            key={c.key}
            title={c.title}
            value={counts[c.key]}
            active={active === c.key}
            onClick={() => setActive(c.key)}
            icon={c.icon}
            tone={c.tone as any}
          />
        ))}
      </div>

      <div className="cardPlus rounded-2xl border bg-white p-0">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className={"iconBadge " + (activeMeta?.tone || "neutral")}>
              {activeMeta?.icon ? (
                <activeMeta.icon className="h-5 w-5" />
              ) : null}
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-800">
                Lista de envios
              </div>
              <div className="text-xs text-zinc-500">
                Visão atual: {activeMeta?.title}
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 lg:w-[420px]">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, telefone ou código de rastreio..."
                className="h-10 w-full rounded-xl border bg-white pl-9 pr-10 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {q ? (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 hover:bg-zinc-100"
                  title="Limpar"
                >
                  <X className="h-4 w-4 text-zinc-500" />
                </button>
              ) : null}
            </div>

            <div className="hidden whitespace-nowrap text-xs text-zinc-500 lg:block">
              {filteredBase.length} itens • {filtered.length} encontrados
            </div>
          </div>

          <div className="block text-xs text-zinc-500 lg:hidden">
            {filteredBase.length} itens • {filtered.length} encontrados
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[1220px] text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b text-zinc-500">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    disabled={filtered.length === 0 || sendingMass}
                    onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                    title="Selecionar todos da visão atual"
                  />
                </th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-left">Qtd</th>
                <th className="px-4 py-3 text-left">Status envio</th>
                <th className="px-4 py-3 text-left">Status pagamento</th>
                {active === "Extravio" && (
                  <th className="px-4 py-3 text-left">Status extravio</th>
                )}
                <th className="px-4 py-3 text-left">Cód rastreio</th>
                <th className="px-4 py-3 text-left">Detalhes</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-zinc-500"
                    colSpan={totalCols}
                  >
                    Carregando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-zinc-500"
                    colSpan={totalCols}
                  >
                    Nenhum resultado para a busca/filtro atual.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-b-0 hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        disabled={sendingMass}
                        onChange={(e) =>
                          toggleSelected(item.id, e.target.checked)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{item.nome}</td>
                    <td className="px-4 py-3">{item.phone}</td>
                    <td className="px-4 py-3">{item.quantidade}</td>

                    <td className="px-4 py-3">
                      <Select
                        value={normEnvio(item.status_envio) || ""}
                        onChange={(v) => updateEnvio(item.id, v)}
                        options={[
                          {
                            value: "Etiqueta Gerada",
                            label: "Etiqueta Gerada",
                          },
                          { value: "Enviado", label: "Enviado" },
                          { value: "Entregue", label: "Entregue" },
                          { value: "Devolucao", label: "Devolução" },
                          { value: "Extravio", label: "Extravio" },
                        ]}
                        tone={toneEnvio(item.status_envio)}
                      />
                    </td>

                    <td className="px-4 py-3">
                      {canEditPagamento(item.status_envio) ? (
                        <div className="space-y-2">
                          <Select
                            value={normPagamento(item.status_pagamento)}
                            onChange={(v) => onChangePagamento(item, v)}
                            options={[
                              {
                                value: "Aguardando Entrega",
                                label: "Aguardando Entrega",
                              },
                              { value: "Pendente", label: "Pendente" },
                              { value: "Pago", label: "Pago" },
                              { value: "Não Pago", label: "Não Pago" },
                            ]}
                            tone={tonePagamento(item.status_pagamento)}
                          />
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                          Aguardando envio
                        </span>
                      )}
                    </td>
                    {active === "Extravio" && (
                      <td className="px-4 py-3">
                        <Select
                          value={item.status_extraviado || "Pendente"}
                          onChange={(v) => onChangeExtraviado(item, v)}
                          options={[
                            { value: "Pendente", label: "Pendente" },
                            { value: "Aberto", label: "Aberto" },
                            { value: "Finalizado", label: "Finalizado" },
                          ]}
                          tone="warning"
                        />
                      </td>
                    )}

                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                      {item.codigo_rastreio || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => openClient(item.id)}
                        className="rounded-xl border bg-white/80 px-3 py-2 text-xs font-medium shadow-sm hover:bg-white"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        pedido={selected}
        onUpdated={(updated) => {
          setOrders((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p)),
          );
          setSelected(updated);
        }}
      />

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        cliente={payCtx}
        onConfirm={confirmarPagamento}
      />

      {templateMassOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Envio em massa
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {selectedIds.length} cliente(s) selecionado(s). Escolha o
                  template para enviar.
                </p>
              </div>

              <button
                type="button"
                onClick={closeMassTemplateModal}
                disabled={sendingMass}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Selecionados</span>
                <span className="font-bold text-zinc-900">
                  {selectedOrders.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">
                  Com código de rastreio preenchido
                </span>
                <span className="font-bold text-emerald-700">
                  {selectedWithTracking}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Sem código local no front</span>
                <span className="font-bold text-amber-700">
                  {selectedWithoutTracking}
                </span>
              </div>
              {selectedWithoutTracking > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                  Mesmo sem código aparecendo na tabela, a API ainda tenta
                  buscar pelo cliente no banco. Se não encontrar, esse cliente
                  vai contar como erro no progresso.
                </div>
              )}
            </div>

            <button
              disabled={sendingMass || selectedIds.length === 0}
              onClick={handleMassCodigoRastreioSend}
              className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">
                    Código de Rastreio
                  </div>
                  <div className="text-sm text-zinc-500">
                    Template aprovado: cod_rastreio
                  </div>
                </div>
              </div>

              {sendingMass ? (
                <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              ) : (
                <MessageCircle className="h-5 w-5 text-emerald-700" />
              )}
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
                onClick={closeMassTemplateModal}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {massProgress.total > 0 && !sendingMass ? "Fechar" : "Cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
        }
        .iconBadge svg {
          opacity: 0.95;
        }

        .iconBadge.green {
          background: linear-gradient(
            135deg,
            rgba(34, 197, 94, 0.18),
            rgba(34, 197, 94, 0.08)
          );
          color: rgb(22 163 74);
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
        .iconBadge.rose {
          background: linear-gradient(
            135deg,
            rgba(244, 63, 94, 0.18),
            rgba(244, 63, 94, 0.08)
          );
          color: rgb(225 29 72);
        }
        .iconBadge.neutral {
          background: linear-gradient(
            135deg,
            rgba(24, 24, 27, 0.06),
            rgba(24, 24, 27, 0.03)
          );
          color: rgb(63 63 70);
        }
      `}</style>
    </div>
  );
}

function StatusCard({
  title,
  value,
  active,
  onClick,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
  icon: any;
  tone: "green" | "emerald" | "sky" | "amber" | "rose" | "neutral";
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "cardPlus p-4 text-left",
        active ? "ring-2 ring-emerald-200 border-emerald-200" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-700">{title}</div>
        <div className={"iconBadge " + tone}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">Clique para filtrar</div>
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
  tone,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  tone: "neutral" | "warning" | "info" | "success" | "danger";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : tone === "info"
        ? "border-sky-300 bg-sky-50 text-sky-900"
        : tone === "success"
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : tone === "danger"
            ? "border-rose-300 bg-rose-50 text-rose-900"
            : "border-zinc-200 bg-white text-zinc-900";

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "h-9 rounded-xl border px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-emerald-200",
          toneClass,
        ].join(" ")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-zinc-400" />
    </div>
  );
}

function toneEnvio(v?: string): any {
  if (v === "Ag. Envio") return "warning";
  if (v === "Etiqueta Gerada") return "neutral";
  if (v === "Enviado") return "info";
  if (v === "Entregue") return "success";
  if (v === "Devolucao") return "neutral";
  if (v === "Extravio") return "danger";
  return "neutral";
}

function tonePagamento(v?: string): any {
  const s = String(v || "");
  if (s === "Pago") return "success";
  if (s === "Aguardando Entrega") return "info";
  if (s === "Pendente") return "warning";
  if (s === "Não Pago") return "danger";
  return "neutral";
}
