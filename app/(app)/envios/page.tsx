"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Plus,
  CheckCircle2,
  Clock3,
  Truck,
  PackageCheck,
  BadgeDollarSign,
  AlertTriangle,
  RotateCcw,
  Search,
  X,
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

  status_pagamento?: "Pago" | "Não Pago" | "Pendente" | "Aguardando Entrega" | string;

  status_extraviado?: "Pendente" | "Aberto" | "Finalizado" | string;
  extravio_resultado?: "Recebido" | "Perdido" | "" | string;

  codigo_rastreio?: string;
  valor_total?: number;
  data_pagamento?: string;
  origem_pagamento?: string;
  seller?: string;
};

const API = "https://api.emipar.life";

// ✅ ordem que você quer (incluindo Ag. Envio como "Aguardando envio")
const cards = [
  { key: "Etiqueta Gerada", title: "Aguardando envio", icon: CheckCircle2, tone: "neutral" },
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
  const [active, setActive] = useState<CardKey>("Etiqueta Gerada");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payCtx, setPayCtx] = useState<Pedido | null>(null);

  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/clientes`, { cache: "no-store" });
        const data = (await res.json()) as Pedido[];
        setOrders(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ Envios: entra quem tem status_envio definido (inclui "Ag. Envio")
  const shipped = useMemo(() => {
  return orders.filter((o) => {
    const se = normEnvio(o.status_envio);
    if (!se) return false;
    if (se === "Ag. Envio") return false;   // ✅ IMPORTANTÍSSIMO: não mostrar Ag. Envio
    if (se === "Cancelado") return false;
    return true;
  });
}, [orders]);


  const filteredBase = useMemo(() => {
    if (active === "Pendente") {
      return shipped.filter((c) => {
        const se = normEnvio(c.status_envio);
        const sp = normPagamento(c.status_pagamento);
        return se === "Entregue" && (sp === "Pendente");
      });
    }

    if (active === "Pago") {
      return shipped.filter((c) => normPagamento(c.status_pagamento) === "Pago");
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

  const counts = useMemo(() => {
    const base = Object.fromEntries(cards.map((c) => [c.key, 0])) as Record<CardKey, number>;

    for (const o of shipped) {
  const se = normEnvio(o.status_envio);
  const sp = normPagamento(o.status_pagamento);

  if (se === "Etiqueta Gerada") base["Etiqueta Gerada"]++;
  if (se === "Enviado") base["Enviado"]++;
  if (se === "Entregue") base["Entregue"]++;
  if (se === "Devolucao") base["Devolucao"]++;
  if (se === "Extravio") base["Extravio"]++;

  if (se === "Entregue" && (sp === "Pendente")) base["Pendente"]++;
  if (sp === "Pago") base["Pago"]++;
}


    return base;
  }, [shipped]);

  async function updateEnvio(id: string, status_envio: string) {
    setOrders((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const next: any = { ...p, status_envio };

        if (status_envio === "Etiqueta Gerada") next.status_pagamento = "Aguardando Entrega";
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
      })
    );

    await fetch(`${API}/clientes/${id}/entrega`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status_envio }),
    });
  }

  function canEditPagamento(status_envio?: string) {
    const s = normEnvio(status_envio);
    return s === "Enviado" || s === "Entregue" || s === "Extravio" || s === "Devolucao";
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


  const totalCols = active === "Extravio" ? 8 : 7;


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

  async function confirmarPagamento(payload: { valor_pago?: number; data_pagamento: string; origem_pagamento: string }) {
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
        : p
    )
  );

  await fetch(`${API}/clientes/${payCtx.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  setPayOpen(false);
  setPayCtx(null);
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
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Envios</h1>
          <p className="text-sm text-zinc-600">Controle de etiqueta, envio, entrega e pagamento.</p>
        </div>

        <button className="rounded-xl border bg-white/80 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo envio
        </button>
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
              {activeMeta?.icon ? <activeMeta.icon className="h-5 w-5" /> : null}
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-800">Lista de envios</div>
              <div className="text-xs text-zinc-500">Visão atual: {activeMeta?.title}</div>
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
          <table className="w-full min-w-[1150px] text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b text-zinc-500">
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
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan={totalCols}>
                    Carregando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan={totalCols}>
                    Nenhum resultado para a busca/filtro atual.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0 hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium">{item.nome}</td>
                    <td className="px-4 py-3">{item.phone}</td>
                    <td className="px-4 py-3">{item.quantidade}</td>

                    <td className="px-4 py-3">
                      <Select
                        value={normEnvio(item.status_envio) || ""}
                        onChange={(v) => updateEnvio(item.id, v)}
                        options={[
                          { value: "Etiqueta Gerada", label: "Etiqueta Gerada" },
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
                              { value: "Aguardando Entrega", label: "Aguardando Entrega" },
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


                    <td className="px-4 py-3 font-mono text-xs text-zinc-700">{item.codigo_rastreio || "-"}</td>

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
          setOrders((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setSelected(updated);
        }}
      />

      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} cliente={payCtx} onConfirm={confirmarPagamento} />

      <style jsx global>{`
        .cardPlus {
          border-radius: 20px;
          border: 1px solid rgba(24, 24, 27, 0.08);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.55));
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
          backdrop-filter: blur(8px);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
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
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(34, 197, 94, 0.08));
          color: rgb(22 163 74);
        }
        .iconBadge.emerald {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.08));
          color: rgb(5 150 105);
        }
        .iconBadge.sky {
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(14, 165, 233, 0.08));
          color: rgb(2 132 199);
        }
        .iconBadge.amber {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.08));
          color: rgb(217 119 6);
        }
        .iconBadge.rose {
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.18), rgba(244, 63, 94, 0.08));
          color: rgb(225 29 72);
        }
        .iconBadge.neutral {
          background: linear-gradient(135deg, rgba(24, 24, 27, 0.06), rgba(24, 24, 27, 0.03));
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
      className={["cardPlus p-4 text-left", active ? "ring-2 ring-emerald-200 border-emerald-200" : ""].join(" ")}
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
