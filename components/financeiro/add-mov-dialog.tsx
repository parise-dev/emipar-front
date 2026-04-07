"use client";

import { useEffect, useMemo, useState } from "react";

export function AddMovDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (payload: {
    tipo: "Entrada" | "Saída";
    categoria: string;
    descricao: string;
    origem: string;
    data: string; // yyyy-mm-dd
    valor: number;
  }) => void;
}) {
  const [tipo, setTipo] = useState<"Entrada" | "Saída">("Entrada");
  const [categoria, setCategoria] = useState("Outro");
  const [descricao, setDescricao] = useState("");
  const [origem, setOrigem] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTipo("Entrada");
    setCategoria("Outro");
    setDescricao("");
    setOrigem("");
    setData(new Date().toISOString().slice(0, 10));
    setValor(0);
    setSaving(false);
  }, [open]);

  const canSave = useMemo(() => {
    const v = Number(valor);
    return !!categoria && !!data && Number.isFinite(v) && v > 0 && !saving;
  }, [categoria, data, valor, saving]);

  function handleSave() {
    if (saving) return;

    const v = Number(valor);
    if (!categoria) return alert("Informe a categoria.");
    if (!data) return alert("Informe a data.");
    if (!Number.isFinite(v) || v <= 0) return alert("Informe um valor maior que zero.");

    setSaving(true);

    try {
      onSave({
        tipo,
        categoria,
        descricao: (descricao || "").trim(),
        origem: (origem || "").trim(),
        data,
        valor: v,
      });
      // quem fecha é o pai (onSave), mas deixo o state travado só pra evitar duplo clique
    } finally {
      // se o pai fechar o modal, o useEffect já reseta.
      // se não fechar, liberamos o botão:
      setTimeout(() => setSaving(false), 300);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-base font-semibold">Adicionar movimentação</div>
            <div className="text-xs text-zinc-500">Entradas e saídas do caixa</div>
          </div>
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            Informações Financeiras
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FieldSelect
              label="Tipo"
              value={tipo}
              onChange={(v: string) => setTipo(v as any)}
              options={[
                { value: "Entrada", label: "ENTRADA" },
                { value: "Saída", label: "SAÍDA" },
              ]}
            />

            <FieldSelect
              label="Categoria"
              value={categoria}
              onChange={setCategoria}
              options={[
                { value: "Anúncio", label: "Anúncio" },
                { value: "Frete", label: "Frete" },
                { value: "Cápsulas", label: "Cápsulas" },
                { value: "Potes", label: "Potes" },
                { value: "Impressões", label: "Impressões" },
                { value: "Adesivos", label: "Adesivos" },
                { value: "Caixas", label: "Caixas" },
                { value: "Outro", label: "Outro" },
              ]}
            />

            <Field label="Data" type="date" value={data} onChange={setData} />

            <Field
              label="Origem"
              value={origem}
              onChange={setOrigem}
              placeholder="Ex: Loggi / Pix / Cartão / Meta Ads"
            />

            <Field
              label="Valor"
              type="number"
              value={String(valor)}
              onChange={(v: string) => {
                const n = Number(v);
                // ✅ nunca deixa virar negativo (evita “-100”)
                setValor(Number.isFinite(n) ? Math.max(0, n) : 0);
              }}
              placeholder="0,00"
            />

            <div className="md:col-span-2">
              <label className="grid gap-1">
                <span className="text-xs text-zinc-600">Descrição</span>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Digite uma descrição (opcional)"
                  className="min-h-[96px] rounded-xl border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={!canSave}
            onClick={handleSave}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-zinc-600">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </label>
  );
}

function FieldSelect({ label, value, onChange, options }: any) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-zinc-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
      >
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
