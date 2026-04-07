"use client";

import { useEffect, useState } from "react";

export function BoletoDialog({
  open,
  onOpenChange,
  saving,
  cliente,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saving?: boolean;
  cliente: any | null;
  onConfirm: (payload: { cpf: string; dueDate: string }) => void;
}) {
  const [cpf, setCpf] = useState("");
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!cliente) return;

    // se já tiver cpf salvo no cliente, pré-preenche
    setCpf(String(cliente.cpf || ""));
    setDueDate(new Date().toISOString().slice(0, 10));
  }, [cliente]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />

      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-base font-semibold">Gerar boleto</div>
            <div className="text-xs text-zinc-500">{cliente?.nome}</div>
          </div>

          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Field
            label="CPF"
            value={cpf}
            onChange={setCpf}
            placeholder="000.000.000-00"
          />

          <Field
            label="Vencimento"
            type="date"
            value={dueDate}
            onChange={setDueDate}
          />

          <p className="text-xs text-zinc-500">
            O boleto será gerado com o <b>valor total</b> do pedido.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => onOpenChange(false)}>
            Cancelar
          </button>

          <button
            disabled={!!saving}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            onClick={() => onConfirm({ cpf, dueDate })}
          >
            {saving ? "Gerando..." : "Gerar boleto"}
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
