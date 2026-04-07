"use client";

import { useEffect, useState } from "react";

export function PaymentDialog({
  open,
  onOpenChange,
  cliente,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cliente: any | null;
  onConfirm: (payload: { valor_pago?: number; data_pagamento: string; origem_pagamento: string }) => void;
}) {
  const [valor, setValor] = useState<number>(0);
  const [data, setData] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [origem, setOrigem] = useState<string>("Pix");

  useEffect(() => {
    if (!cliente) return;
    setValor(Number(cliente.valor_total || 0));
    setData(new Date().toISOString().slice(0, 10));
    setOrigem("Pix");
  }, [cliente]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-base font-semibold">Confirmar pagamento</div>
            <div className="text-xs text-zinc-500">{cliente?.nome}</div>
          </div>
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => onOpenChange(false)}>
            Fechar
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Field label="Valor pago" type="number" value={String(valor)} onChange={(v: any) => setValor(Number(v))} />
          <Field label="Data do pagamento" type="date" value={data} onChange={setData} />
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600">Origem do pagamento</span>
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="Pix">PIX</option>
              <option value="Boleto">Boleto</option>
              <option value="Cartão">Cartão</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50" onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            onClick={() => onConfirm({ valor_pago: valor, data_pagamento: data, origem_pagamento: origem })}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: any) {
  return (
    <label className="grid gap-1">
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
