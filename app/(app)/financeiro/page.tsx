"use client";

import { useEffect, useMemo, useState } from "react";
import { AddMovDialog } from "@/components/financeiro/add-mov-dialog";
import { addRegistro, FinanceiroRegistro, loadRegistros } from "@/lib/financeiro-store";
import { Coins, X, Plus } from "lucide-react";
import { API_BASE } from "@/lib/api";

type TipoFilter = "" | "Entrada" | "Saída";

function toBRL(v: number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type ApiMov = {
  id: string;
  tipo: "Entrada" | "Saída";
  categoria: string;
  descricao: string;
  origem: string;
  data: string; // ISO
  valor: number;
};

function normalizeApiItem(it: any): FinanceiroRegistro {
  return {
    id: String(it.id),
    tipo: it.tipo === "Saída" ? "Saída" : "Entrada",
    categoria: it.categoria || "Outro",
    descricao: it.descricao || "",
    origem: it.origem || "",
    data: it.data || new Date().toISOString(),
    valor: Number(it.valor || 0),
  };
}

export default function FinanceiroPage() {
  const [items, setItems] = useState<FinanceiroRegistro[]>([]);
  const [open, setOpen] = useState(false);

  const [tipo, setTipo] = useState<TipoFilter>("");
  const [descricao, setDescricao] = useState("");
  const [origem, setOrigem] = useState("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  async function carregar() {
    try {
      setLoading(true);
      setErr("");

      // ✅ tenta API primeiro
      const r = await fetch(`${API_BASE}/financeiro`, { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());

      const j = (await r.json()) as ApiMov[];
      const normalized = Array.isArray(j) ? j.map(normalizeApiItem) : [];

      // ordena por data desc
      normalized.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setItems(normalized);
    } catch (e: any) {
      // ✅ fallback: store local (não trava tua tela)
      setErr(e?.message || "Erro ao carregar financeiro. Mostrando dados locais.");
      try {
        setItems(loadRegistros());
      } catch {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const entradas = items
      .filter((x) => x.tipo === "Entrada")
      .reduce((acc, x) => acc + (Number(x.valor) || 0), 0);
    const saidas = items
      .filter((x) => x.tipo === "Saída")
      .reduce((acc, x) => acc + (Number(x.valor) || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (tipo && it.tipo !== tipo) return false;

      if (descricao && !(it.descricao || "").toLowerCase().includes(descricao.toLowerCase()))
        return false;

      if (origem && !(it.origem || "").toLowerCase().includes(origem.toLowerCase()))
        return false;

      if (dataInicio) {
        const di = new Date(dataInicio + "T00:00:00");
        if (new Date(it.data) < di) return false;
      }
      if (dataFim) {
        const df = new Date(dataFim + "T23:59:59");
        if (new Date(it.data) > df) return false;
      }
      return true;
    });
  }, [items, tipo, descricao, origem, dataInicio, dataFim]);

  function aplicarPeriodo(tipo: "hoje" | "semana" | "mes") {
  const hoje = new Date();

  const format = (d: Date) => d.toISOString().slice(0, 10);

  if (tipo === "hoje") {
    const data = format(hoje);
    setDataInicio(data);
    setDataFim(data);
    return;
  }

  if (tipo === "semana") {
    const inicio = new Date(hoje);
    const dia = inicio.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    inicio.setDate(inicio.getDate() + diff);

    setDataInicio(format(inicio));
    setDataFim(format(hoje));
    return;
  }

  if (tipo === "mes") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    setDataInicio(format(inicio));
    setDataFim(format(hoje));
  }
}

  function limpar() {
    setTipo("");
    setDescricao("");
    setOrigem("");
    setDataInicio("");
    setDataFim("");
  }

  async function salvar(payload: {
    tipo: "Entrada" | "Saída";
    categoria: string;
    descricao: string;
    origem: string;
    data: string; // yyyy-mm-dd
    valor: number;
  }) {
    // mantém seu padrão de “meio-dia” pra não quebrar fuso
    const iso = new Date(payload.data + "T12:00:00").toISOString();

    // ✅ tenta salvar na API
    try {
      const body = {
        ...payload,
        descricao: (payload.descricao || "").trim(),
        origem: (payload.origem || "").trim(),
        categoria: (payload.categoria || "Outro").trim(),
        data: iso,
        valor: Number(payload.valor || 0),
      };

      const r = await fetch(`${API_BASE}/financeiro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) throw new Error(await r.text());

      const created = normalizeApiItem(await r.json());

      // ✅ atualiza UI sem reload
      setItems((prev) => [created, ...prev]);
      setOpen(false);
      return;
    } catch (e: any) {
      // ✅ fallback: salva local (igual você já tinha)
      const novo = addRegistro({ ...payload, data: iso });
      setItems((prev) => [novo, ...prev]);
      setOpen(false);

      alert(
        (e?.message || "Falha ao salvar na API.") +
          "\nSalvei localmente para não perder. Depois você pode sincronizar."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Financeiro</h1>
            <p className="text-sm text-zinc-500">Entradas, saídas e controle do saldo.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregar}
            className="rounded-2xl border bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Atualizar
          </button>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar movimentação
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {err}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard title="Entradas" value={loading ? "..." : toBRL(totals.entradas)} tone="success" />
        <KpiCard title="Saídas" value={loading ? "..." : toBRL(totals.saidas)} tone="danger" />
        <KpiCard title="Saldo Atual" value={loading ? "..." : toBRL(totals.saldo)} tone="neutral" />
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium">Filtros</div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={limpar}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
            >
              <X className="h-4 w-4" />
              Limpar
            </button>
          </div>
        </div>
      <div className="mt-3 flex flex-wrap gap-2">
  <button
    onClick={() => aplicarPeriodo("hoje")}
    className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
  >
    Hoje
  </button>

  <button
    onClick={() => aplicarPeriodo("semana")}
    className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
  >
    Esta semana
  </button>

  <button
    onClick={() => aplicarPeriodo("mes")}
    className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
  >
    Este mês
  </button>
</div>
        <div className="mt-3 grid gap-2 md:grid-cols-6">
          <label className="grid gap-1 md:col-span-1">
            <span className="text-xs text-zinc-600">Tipo</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as any)}
              className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">Todos</option>
              <option value="Entrada">Entradas</option>
              <option value="Saída">Saídas</option>
            </select>
          </label>

          <Field label="Descrição" value={descricao} onChange={setDescricao} className="md:col-span-2" />
          <Field label="Origem" value={origem} onChange={setOrigem} className="md:col-span-1" />
          <Field label="De" type="date" value={dataInicio} onChange={setDataInicio} className="md:col-span-1" />
          <Field label="Até" type="date" value={dataFim} onChange={setDataFim} className="md:col-span-1" />
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-medium">Movimentações</div>
          <div className="text-xs text-zinc-500">{loading ? "..." : `${filtered.length} itens`}</div>
        </div>

        <div className="overflow-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b text-zinc-500">
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">Origem</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Valor</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                    Carregando...
                  </td>
                </tr>
              ) : (
                <>
                  {filtered.map((it) => (
                    <tr key={it.id} className="border-b last:border-b-0 hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <TipoPill tipo={it.tipo} />
                      </td>
                      <td className="px-4 py-3">{it.categoria}</td>
                      <td className="px-4 py-3">{it.descricao}</td>
                      <td className="px-4 py-3">{it.origem}</td>
                      <td className="px-4 py-3">{new Date(it.data).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3 font-medium">
                        <span className={it.tipo === "Entrada" ? "text-emerald-700" : "text-rose-700"}>
                          {toBRL(it.valor)}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-zinc-500" colSpan={6}>
                        Nenhuma movimentação encontrada.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddMovDialog open={open} onOpenChange={setOpen} onSave={salvar} />
    </div>
  );
}

function KpiCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "success" | "danger" | "neutral";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
      ? "text-rose-700"
      : "text-zinc-900";
  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className={"mt-2 text-3xl font-semibold " + cls}>{value}</div>
      <div className="mt-2 text-xs text-zinc-500">Atualizado em tempo real</div>
    </div>
  );
}

function TipoPill({ tipo }: { tipo: "Entrada" | "Saída" }) {
  const cls =
    tipo === "Entrada"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : "bg-rose-50 text-rose-800 border-rose-200";
  return (
    <span className={"inline-flex rounded-full border px-3 py-1 text-xs font-medium " + cls}>
      {tipo}
    </span>
  );
}

function Field({ label, value, onChange, type = "text", className = "" }: any) {
  return (
    <label className={"grid gap-1 " + className}>
      <span className="text-xs text-zinc-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </label>
  );
}
