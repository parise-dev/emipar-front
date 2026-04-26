"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BoletoDialog } from "@/components/envios/boleto-dialog";
import { MessageCircle, X, MapPinned } from "lucide-react";

type Pedido = any;
const API = "https://api.emipar.life";

export function ClientSheet({
  open,
  onOpenChange,
  pedido,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedido: Pedido | null;
  onUpdated: (p: Pedido) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function abrirWhatsappCliente() {
  if (!form?.phone && !form?.id) {
    alert("Cliente sem telefone.");
    return;
  }

  try {
    const params = new URLSearchParams();

    if (form?.phone) params.set("phone", String(form.phone));
    if (form?.id) params.set("clientId", String(form.id));

    const res = await fetch(`${API}/whatsapp/conversations/find?${params.toString()}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data?.success && data?.exists && data?.data?.id) {
      onOpenChange(false);
      router.push(`/whatsapp?conversationId=${data.data.id}`);
      return;
    }

    setTemplatePickerOpen(true);
  } catch (error) {
    console.error("Erro ao buscar conversa do WhatsApp:", error);
    alert("Erro ao verificar conversa do WhatsApp.");
  }
}

async function enviarTemplateConfirmarPedido() {
  if (!form?.phone) {
  showToast("error", "Cliente sem telefone.");
  return;
}

  try {
    setSendingTemplate(true);

    const qtdProduto = `${Number(form.quantidade || 1)} ${form.produto || "ERONMAX"}`;

    const cidadeCompleta = [
      form.endereco?.bairro,
      form.endereco?.localidade || form.endereco?.cidade,
      form.endereco?.uf || form.endereco?.estado,
    ]
      .filter(Boolean)
      .join(" - ");

    const res = await fetch(`${API}/whatsapp/send-template/confirmar-pedido`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: String(form.phone),
        clientId: form.id || "",
        conversationId: "",
        nome: form.nome || "Cliente",
        nome_rep: "Carlos",
        emprs: "EMIPAR LIFE",
        qtd: qtdProduto,
        rua: form.endereco?.logradouro || "Endereço não informado",
        cidade: cidadeCompleta || "Cidade não informada",
        n: form.endereco?.numero || "S/N",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.success) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : data?.error?.error?.message || "Erro ao enviar template."
      );
    }

    setTemplatePickerOpen(false);
    showToast("success", "Template enviado para processamento.");
  } catch (error) {
    console.error("Erro ao enviar template:", error);
    showToast(
  "error",
  error instanceof Error ? error.message : "Erro ao enviar template."
);
  } finally {
    setSendingTemplate(false);
  }
}

  const [saving, setSaving] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [boletoOpen, setBoletoOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
const [sendingTemplate, setSendingTemplate] = useState(false);
const [toast, setToast] = useState<{
  type: "success" | "error";
  message: string;
} | null>(null);
  function normalizeStatusPedidoUI(s?: string) {
    if (!s) return "Novo";
    if (s === "Aberto") return "Novo"; // compat legado
    return s;
  }

  function closeSheet() {
    onOpenChange(false);
    router.replace(pathname, { scroll: false });
  }

  // ✅ sempre que abrir/alterar pedido, busca o cliente REAL no backend (com asaas)
  useEffect(() => {
    if (!pedido?.id) return;

    let alive = true;

    (async () => {
      try {
        const res = await fetch(`${API}/clientes/${pedido.id}`, { cache: "no-store" });
        const fresh = res.ok ? await res.json() : pedido;

        if (!alive) return;

        setForm({
          ...fresh,
          status_pedido: normalizeStatusPedidoUI(fresh.status_pedido),
          endereco: fresh.endereco || {},
        });
      } catch {
        if (!alive) return;
        // fallback
        setForm({
          ...pedido,
          status_pedido: normalizeStatusPedidoUI(pedido.status_pedido),
          endereco: pedido.endereco || {},
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [pedido?.id]);

  const canShow = useMemo(() => open && !!form, [open, form]);

  

  async function salvarCliente() {
    if (!form?.id) return;
    setSaving(true);
    try {
      const payload: any = {
        nome: form.nome,
        cpf: form.cpf,
        phone: form.phone,
        produto: form.produto,
        quantidade: Number(form.quantidade || 0),
        valor_total: Number(form.valor_total || 0),
        valor_frete: Number(form.valor_frete || 0),

        status_pedido: normalizeStatusPedidoUI(form.status_pedido),

        // ✅ mantém padrão do backend
        status_pagamento: form.status_pagamento || "Pendente",

        // financeiro (entrada quando marcar pago)
        data_pagamento: form.data_pagamento || "",
        origem_pagamento: form.origem_pagamento || "Pix",
        valor_pago:
          form.valor_pago != null && form.valor_pago !== ""
            ? Number(form.valor_pago)
            : undefined,

        observacao: form.observacao,
        data_entrega: form.data_entrega,

        endereco: {
          cep: form.endereco?.cep || "",
          logradouro: form.endereco?.logradouro || "",
          numero: form.endereco?.numero || "",
          bairro: form.endereco?.bairro || "",
          complemento: form.endereco?.complemento || "",
          localidade: form.endereco?.localidade || "",
          estado: form.endereco?.estado || "",
          uf: form.endereco?.uf || "",
          obs: form.endereco?.obs || "",
        },
      };

      // ✅ NÃO forçar "Ag. Envio" se já existe algo (evita reverter Etiqueta Gerada)
      if (form.status_envio) payload.status_envio = form.status_envio;

      await fetch(`${API}/clientes/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res2 = await fetch(`${API}/clientes/${form.id}`, { cache: "no-store" });
      if (res2.ok) {
        const fresh = await res2.json();
        setForm(fresh);
        onUpdated(fresh);
      } else {
        onUpdated(form);
      }

      closeSheet();
    } finally {
      setSaving(false);
    }
  }

  function showToast(type: "success" | "error", message: string) {
  setToast({ type, message });

  window.setTimeout(() => {
    setToast(null);
  }, 3500);
}

  async function cancelarPedido() {
    if (!form?.id) return;
    if (
      !confirm(
        "Cancelar este pedido? Isso vai reverter estoque/financeiro e marcar como Cancelado."
      )
    )
      return;

    setSaving(true);
    try {
      await fetch(`${API}/clientes/${form.id}/cancelar`, { method: "PATCH" });

      const res2 = await fetch(`${API}/clientes/${form.id}`, { cache: "no-store" });
      const fresh = res2.ok
        ? await res2.json()
        : { ...form, status_pedido: "Cancelado" };

      onUpdated(fresh);
      closeSheet();
    } finally {
      setSaving(false);
    }
  }

  async function gerarEtiqueta(obj: {
    codigo_rastreio: string;
    valor_envio: number;
    data_envio: string;
  }) {
    if (!form?.id) return;
    setSaving(true);

    try {
      const res = await fetch(`${API}/clientes/${form.id}/entrega`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status_envio: "Etiqueta Gerada",
          codigo_rastreio: obj.codigo_rastreio,
          valor_envio: Number(obj.valor_envio || 0),
          data_envio: obj.data_envio,
        }),
      });

      if (!res.ok) {
        let msg = "Erro ao gerar etiqueta.";
        try {
          const j = await res.json();
          msg = j?.error || j?.message || msg;
        } catch {}
        alert(msg);
        return;
      }

      const res2 = await fetch(`${API}/clientes/${form.id}`, { cache: "no-store" });
      const fresh = res2.ok
        ? await res2.json()
        : { ...form, status_envio: "Etiqueta Gerada" };

      setForm(fresh);
      onUpdated(fresh);

      setLabelOpen(false);
      closeSheet();
    } finally {
      setSaving(false);
    }
  }

  async function gerarBoleto(payload: { cpf: string; dueDate: string }) {
    if (!form?.id) return;

    const cpf = String(payload.cpf || "").trim();
    const dueDate = String(payload.dueDate || "").trim();

    if (!cpf) {
      alert("Informe o CPF.");
      return;
    }
    if (!dueDate) {
      alert("Informe a data de vencimento.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/clientes/${form.id}/gerar-boleto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, dueDate }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        const msg = data?.error || data?.message || "Erro ao gerar boleto.";
        alert(msg);
        return;
      }

      // ✅ aplica o retorno do POST IMEDIATAMENTE (UX)
      // ✅ se o backend devolveu o cliente completo, usa ele
if (data?.cliente) {
  const fresh = data.cliente;

  setForm({
    ...fresh,
    status_pedido: normalizeStatusPedidoUI(fresh.status_pedido),
    endereco: fresh.endereco || {},
  });

  onUpdated(fresh);

  setBoletoOpen(false);

  const url = fresh?.asaas?.bankSlipUrl;
  if (url) window.open(url, "_blank");

  return;
}


      // ✅ confirma no backend (garante que abriu com os dados “certos”)
      const res2 = await fetch(`${API}/clientes/${form.id}`, { cache: "no-store" });
      const fresh = res2.ok ? await res2.json() : form;

      setForm(fresh);
      onUpdated(fresh);

      setBoletoOpen(false);

      const url = fresh?.asaas?.bankSlipUrl || data?.bankSlipUrl;
      if (url) window.open(url, "_blank");
    } finally {
      setSaving(false);
    }
  }

  if (!canShow) return null;

  return (
    <div className="fixed inset-0 z-[10000]">
      <button className="absolute inset-0 bg-black/30" onClick={closeSheet} />

      <div className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-lg font-semibold">Detalhes do Cliente</div>
            <div className="text-xs text-zinc-500">Edite dados e financeiro</div>
          </div>
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={closeSheet}
          >
            Fechar
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 pb-28">
          <Section title="Informações do Cliente">
            <Grid>
              <Field
                label="Nome completo"
                value={form.nome}
                onChange={(v) => setForm({ ...form, nome: v })}
              />
              <Field
                label="CPF"
                value={form.cpf || ""}
                onChange={(v) => setForm({ ...form, cpf: v })}
              />
              <Field
                label="Telefone"
                value={form.phone || ""}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
            </Grid>
          </Section>

          <Section title="Endereço">
            <Grid>
              <Field
                label="CEP"
                value={form.endereco?.cep || ""}
                onChange={(v) =>
                  setForm({ ...form, endereco: { ...form.endereco, cep: v } })
                }
              />
              <Field
                label="Rua"
                value={form.endereco?.logradouro || ""}
                onChange={(v) =>
                  setForm({
                    ...form,
                    endereco: { ...form.endereco, logradouro: v },
                  })
                }
                className="md:col-span-2"
              />
              <Field
                label="Número"
                value={form.endereco?.numero || ""}
                onChange={(v) =>
                  setForm({
                    ...form,
                    endereco: { ...form.endereco, numero: v },
                  })
                }
              />
              <Field
                label="Complemento"
                value={form.endereco?.complemento || ""}
                onChange={(v) =>
                  setForm({
                    ...form,
                    endereco: { ...form.endereco, complemento: v },
                  })
                }
              />
              <Field
                label="Bairro"
                value={form.endereco?.bairro || ""}
                onChange={(v) =>
                  setForm({
                    ...form,
                    endereco: { ...form.endereco, bairro: v },
                  })
                }
              />
              <Field
                label="Cidade"
                value={form.endereco?.localidade || ""}
                onChange={(v) =>
                  setForm({
                    ...form,
                    endereco: { ...form.endereco, localidade: v },
                  })
                }
              />
              <Field
                label="Estado/UF"
                value={form.endereco?.uf || ""}
                onChange={(v) =>
                  setForm({ ...form, endereco: { ...form.endereco, uf: v } })
                }
              />
              <TextArea
                label="Observação"
                value={form.endereco?.obs || ""}
                onChange={(v: any) =>
                  setForm({ ...form, endereco: { ...form.endereco, obs: v } })
                }
                className="md:col-span-3"
              />
            </Grid>

            <div className="flex">
              <div className="pt-2">
                {form.status_pedido === "Vendido" &&
                  (form.status_envio === "Ag. Envio" || !form.status_envio) && (
                    <button
                      onClick={() => setLabelOpen(true)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Gerar etiqueta
                    </button>
                  )}
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                {!form?.asaas?.bankSlipUrl && (
                  <button
                    onClick={() => setBoletoOpen(true)}
                    className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                  >
                    Gerar boleto
                  </button>
                )}

                {form?.asaas?.bankSlipUrl ? (
                  <button
                    onClick={() => window.open(form.asaas.bankSlipUrl, "_blank")}
                    className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                  >
                    Abrir boleto
                  </button>
                ) : null}
              </div>
            </div>
          </Section>

          <Section title="Financeiro">
            <Grid>
              <Field
                label="Produto"
                value={form.produto || ""}
                onChange={(v) => setForm({ ...form, produto: v })}
              />
              <Field
                label="Quantidade"
                type="number"
                value={String(form.quantidade ?? 0)}
                onChange={(v) => setForm({ ...form, quantidade: Number(v) })}
              />
              <Field
                label="Valor total"
                type="number"
                value={String(form.valor_total ?? 0)}
                onChange={(v) => setForm({ ...form, valor_total: Number(v) })}
              />
              <Field
                label="Frete"
                type="number"
                value={String(form.valor_frete ?? 0)}
                onChange={(v) => setForm({ ...form, valor_frete: Number(v) })}
              />

              <div className="space-y-1">
                <div className="text-xs font-medium text-zinc-600">Status pedido</div>
                <select
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.status_pedido || "Novo"}
                  onChange={(e) => setForm({ ...form, status_pedido: e.target.value })}
                >
                  <option value="Novo">Novo</option>
                  <option value="Andamento">Andamento</option>
                  <option value="Vendido">Vendido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-zinc-600">Status pagamento</div>
                <select
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.status_pagamento || "Pendente"}
                  onChange={(e) => setForm({ ...form, status_pagamento: e.target.value })}
                >
                  {/* ✅ compatível com a API (Pendente = Não Pago) */}
                  <option value="Pendente">Pendente</option>
                  <option value="Não Pago">Não Pago</option>
                  <option value="Pago">Pago</option>
                  <option value="Extravio">Extravio</option>
                  <option value="Devolucao">Devolução</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-zinc-600">Status envio</div>
                <select
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.status_envio || "Ag. Envio"}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, status_envio: v });
                  }}
                >
                  <option value="Ag. Envio">Ag. Envio</option>
                  <option value="Etiqueta Gerada">Etiqueta Gerada</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Entregue">Entregue</option>
                  <option value="Devolucao">Devolução</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <Field
                label="Data pagamento"
                type="date"
                value={
                  (form as any).data_pagamento
                    ? String((form as any).data_pagamento).slice(0, 10)
                    : ""
                }
                onChange={(v) => setForm({ ...form, data_pagamento: v })}
              />
              <Field
                label="Origem pagamento"
                value={(form as any).origem_pagamento || ""}
                onChange={(v) => setForm({ ...form, origem_pagamento: v })}
              />
              <Field
                label="Valor pago"
                type="number"
                value={(form as any).valor_pago ?? ""}
                onChange={(v) => setForm({ ...form, valor_pago: v })}
              />
            </Grid>
          </Section>

          {form?.asaas?.bankSlipUrl ? (
            <Section title="Boleto (Asaas)">
              <div className="grid gap-2">
                <div className="text-sm">
                  <span className="text-zinc-500">Status: </span>
                  <span className="font-medium">{form?.asaas?.status || "-"}</span>
                </div>

                <div className="text-sm">
                  <span className="text-zinc-500">Payment ID: </span>
                  <span className="font-mono text-xs">
                    {form?.asaas?.paymentId || "-"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => window.open(form.asaas.bankSlipUrl, "_blank")}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Abrir PDF do boleto
                  </button>

                  <button
  onClick={() => window.open(`${API}/clientes/${form.id}/boleto/download`, "_blank")}
  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
>
  Baixar boleto
</button>


                  {form?.asaas?.invoiceUrl ? (
                    <button
                      onClick={() => window.open(form.asaas.invoiceUrl, "_blank")}
                      className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                    >
                      Abrir fatura (Asaas)
                    </button>
                  ) : null}
                </div>
              </div>
            </Section>
          ) : null}
        </div>

        <div className="shrink-0 border-t bg-white px-5 py-4">
  <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={cancelarPedido}
            disabled={saving}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Cancelar pedido
          </button>

          <button
            onClick={salvarCliente}
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          <button
  onClick={abrirWhatsappCliente}
  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
>
  <MessageCircle className="h-4 w-4" />
  Iniciar conversa
</button>
        </div>
        </div>

        {labelOpen && (
          <LabelDialog
            saving={saving}
            onClose={() => setLabelOpen(false)}
            onSave={(obj: any) => gerarEtiqueta(obj)}
          />
        )}

        <BoletoDialog
          open={boletoOpen}
          onOpenChange={setBoletoOpen}
          saving={saving}
          cliente={form}
          onConfirm={gerarBoleto}
        />
        {templatePickerOpen && (
  <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-900">
            Escolher template
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Esse cliente ainda não tem conversa aberta. Escolha um template aprovado para iniciar.
          </div>
        </div>

        <button
          onClick={() => setTemplatePickerOpen(false)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-zinc-500 hover:bg-zinc-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <button
        disabled={sendingTemplate}
        onClick={enviarTemplateConfirmarPedido}
        className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 p-4 text-left transition hover:bg-zinc-50 disabled:opacity-60"
      >
        <MapPinned className="h-5 w-5 text-zinc-600" />

        <div>
          <div className="text-sm font-semibold text-zinc-900">
            Confirmar endereço
          </div>
          <div className="text-xs text-zinc-500">
            Envia o template aprovado confirmar_pedido.
          </div>
        </div>
      </button>
    </div>
  </div>
)}
      </div>
      {toast && (
  <div
    className={[
      "absolute right-5 top-5 z-[10030] rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl",
      toast.type === "success"
        ? "bg-emerald-600 text-white"
        : "bg-rose-600 text-white",
    ].join(" ")}
  >
    {toast.message}
  </div>
)}
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Grid({ children }: any) {
  return <div className="grid gap-3 md:grid-cols-3">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  className = "",
  as = "input",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: React.HTMLInputTypeAttribute;
  className?: string;
  as?: "input" | "textarea";
}) {
  return (
    <div className={["space-y-1", className].join(" ")}>
      <div className="text-xs font-semibold text-zinc-500">{label}</div>

      {as === "textarea" ? (
        <textarea
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="min-h-[96px] w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-zinc-100"
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-zinc-100"
        />
      )}
    </div>
  );
}

function TextArea({ label, value, onChange, className = "" }: any) {
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="text-xs text-zinc-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-24 rounded-xl border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </label>
  );
}

function LabelDialog({ saving, onClose, onSave }: any) {
  const [codigo, setCodigo] = useState("");
  const [valor, setValor] = useState<number>(0);
  const [data, setData] = useState<string>(() => new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 z-[60]">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-base font-semibold">Gerar etiqueta</div>
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="p-5 grid gap-3 md:grid-cols-3">
          <Field
            label="Código de rastreio"
            value={codigo}
            onChange={setCodigo}
            className="md:col-span-2"
          />
          <Field
            label="Valor"
            type="number"
            value={String(valor)}
            onChange={(v: string) => setValor(Number(v))}
          />
          <Field label="Data" type="date" value={data} onChange={setData} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            onClick={() =>
              onSave({ codigo_rastreio: codigo, valor_envio: valor, data_envio: data })
            }
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
