"use client";

import { useEffect, useMemo, useState } from "react";

export function LoggiRefundDialog({
  open,
  onOpenChange,
  pedido,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedido: any | null;
  onConfirm: (payload: {
    valor_reembolso: number;
    data_reembolso: string;
  }) => void;
}) {
  const [valor, setValor] = useState<number>(0);
  const [data, setData] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (!pedido) return;

    setValor(
      Number(
        pedido.loggi_valor_reembolso ??
          pedido.valor_total ??
          0,
      ),
    );

    setData(
      pedido.loggi_data_reembolso
        ? new Date(pedido.loggi_data_reembolso).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
  }, [pedido]);

  const canSave = useMemo(() => {
    const v = Number(valor);
    return Number.isFinite(v) && v > 0 && !!data;
  }, [valor, data]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />

      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-base font-semibold">
              Confirmar reembolso Loggi
            </div>
            <div className="text-xs text-zinc-500">{pedido?.nome}</div>
          </div>

          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </button>
        </div>

        <div className="space-y-3 p-5">
          <Field
            label="Valor reembolsado"
            type="number"
            value={String(valor)}
            onChange={(v: string) => {
              const n = Number(v);
              setValor(Number.isFinite(n) ? Math.max(0, n) : 0);
            }}
          />

          <Field
            label="Data do reembolso"
            type="date"
            value={data}
            onChange={setData}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </button>

          <button
            disabled={!canSave}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() =>
              onConfirm({
                valor_reembolso: Number(valor),
                data_reembolso: data,
              })
            }
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