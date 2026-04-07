"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";
import { Settings, Save, RotateCw } from "lucide-react";

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [seller, setSeller] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function carregar() {
    try {
      setLoading(true);
      setMsg(null);

      const r = await fetch(`${API_BASE}/configuracoes/vendedor`, { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());

      const j = await r.json();
      setSeller((j?.seller || "").toString());
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Erro ao carregar vendedor" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    try {
      const name = seller.trim();
      if (!name) return alert("Informe o nome do vendedor");

      setSaving(true);
      setMsg(null);

      const r = await fetch(`${API_BASE}/configuracoes/vendedor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller: name }),
      });

      if (!r.ok) throw new Error(await r.text());

      setMsg({ type: "success", text: "✅ Vendedor do dia atualizado!" });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-zinc-600">Portal: definir vendedor do dia (usado no Typebot).</p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <Settings className="h-4 w-4" />
          Vendedor do dia
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
            placeholder={loading ? "Carregando..." : "Nome do vendedor"}
            value={seller}
            onChange={(e) => setSeller(e.target.value)}
            disabled={loading || saving}
          />

          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            onClick={salvar}
            disabled={loading || saving}
          >
            {saving ? <RotateCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar"}
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 disabled:opacity-50"
            onClick={carregar}
            disabled={loading || saving}
          >
            <RotateCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
            Recarregar
          </button>
        </div>

        {msg ? (
          <div
            className={[
              "mt-4 rounded-xl border p-3 text-sm",
              msg.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
          >
            {msg.text}
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border bg-sky-50 p-3 text-xs text-sky-900">
          Dica: quando o Typebot cria um cliente, o sistema pega automaticamente o vendedor configurado aqui.
        </div>
      </Card>
    </div>
  );
}
