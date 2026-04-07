"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";
import {
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  Boxes,
  X,
  Pencil,
} from "lucide-react";

type EstoqueItem = {
  id: string;
  produto: string;
  quantidade: number;
  custo_unitario?: number;
  atualizado_em?: string;
};

type GrupoVendaItem = {
  produtoId: string; // id do estoque
  produto: string; // nome (para exibir)
  quantidade: number; // qtd usada no combo
  custo_unitario: number; // cache do custo para mostrar no front (API também pode recalcular)
};

type GrupoVenda = {
  id: string;
  nome: string;
  preco_venda: number;
  itens: GrupoVendaItem[];
  atualizado_em?: string;
};

export default function EstoquePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // estoque
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [q, setQ] = useState("");
  const [novo, setNovo] = useState({ produto: "", quantidade: 0, custo_unitario: 0 });

  // grupos
  const [loadingGrupos, setLoadingGrupos] = useState(true);
  const [grupos, setGrupos] = useState<GrupoVenda[]>([]);
  const [qGrupo, setQGrupo] = useState("");

  // modal grupo
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [grupoMode, setGrupoMode] = useState<"create" | "edit">("create");
  const [grupoForm, setGrupoForm] = useState<{
    id?: string;
    nome: string;
    preco_venda: number;
    itens: GrupoVendaItem[];
  }>({ nome: "", preco_venda: 0, itens: [] });

  async function carregarEstoque() {
    try {
      setLoading(true);
      setErr("");
      const r = await fetch(`${API_BASE}/estoque`, { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setItens(j);
    } catch (e: any) {
      setErr(e?.message || "Erro ao carregar estoque");
    } finally {
      setLoading(false);
    }
  }

  async function carregarGrupos() {
    try {
      setLoadingGrupos(true);
      const r = await fetch(`${API_BASE}/grupos-venda`, { cache: "no-store" });
      if (!r.ok) {
        // Se ainda não existe a rota na API, não quebra tela.
        setGrupos([]);
        return;
      }
      const j = await r.json();
      setGrupos(Array.isArray(j) ? j : []);
    } catch {
      setGrupos([]);
    } finally {
      setLoadingGrupos(false);
    }
  }

  useEffect(() => {
    carregarEstoque();
    carregarGrupos();
  }, []);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return itens;
    return itens.filter((i) => (i.produto || "").toLowerCase().includes(t));
  }, [itens, q]);

  const gruposFiltrados = useMemo(() => {
    const t = qGrupo.trim().toLowerCase();
    if (!t) return grupos;
    return grupos.filter((g) => (g.nome || "").toLowerCase().includes(t));
  }, [grupos, qGrupo]);

  async function adicionarProduto() {
    try {
      if (!novo.produto.trim()) return alert("Informe o produto");

      const payload = {
        produto: novo.produto.trim(),
        quantidade: Number(novo.quantidade || 0),
        custo_unitario: Number(novo.custo_unitario || 0),
      };

      const r = await fetch(`${API_BASE}/estoque`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());

      setNovo({ produto: "", quantidade: 0, custo_unitario: 0 });
      await carregarEstoque();
    } catch (e: any) {
      alert(e?.message || "Erro ao adicionar item");
    }
  }

  async function salvarEdicaoProduto(id: string, quantidade: number, custo_unitario: number) {
    try {
      const payload: any = {};
      if (Number.isFinite(quantidade)) payload.quantidade = Number(quantidade);
      if (Number.isFinite(custo_unitario)) payload.custo_unitario = Number(custo_unitario);

      const r = await fetch(`${API_BASE}/estoque/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());

      await carregarEstoque();
      // custo muda -> recarrega grupos (pra recalcular custo na UI)
      await carregarGrupos();
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar");
    }
  }

  async function deletarProduto(id: string) {
    try {
      if (!confirm("Deletar este produto do estoque?")) return;
      const r = await fetch(`${API_BASE}/estoque/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
      await carregarEstoque();
      await carregarGrupos();
    } catch (e: any) {
      alert(e?.message || "Erro ao deletar");
    }
  }

  function abrirCriarGrupo() {
    setGrupoMode("create");
    setGrupoForm({ nome: "", preco_venda: 0, itens: [] });
    setGrupoOpen(true);
  }

  function abrirEditarGrupo(g: GrupoVenda) {
    setGrupoMode("edit");
    setGrupoForm({
      id: g.id,
      nome: g.nome || "",
      preco_venda: Number(g.preco_venda || 0),
      itens: Array.isArray(g.itens) ? g.itens.map((x) => ({ ...x, quantidade: Number(x.quantidade || 0) })) : [],
    });
    setGrupoOpen(true);
  }

  function addItemNoGrupo(prod: EstoqueItem) {
    const exists = grupoForm.itens.find((x) => x.produtoId === prod.id);
    if (exists) return;

    setGrupoForm((s) => ({
      ...s,
      itens: [
        ...s.itens,
        {
          produtoId: prod.id,
          produto: prod.produto,
          quantidade: 1,
          custo_unitario: Number(prod.custo_unitario || 0),
        },
      ],
    }));
  }

  function removerItemGrupo(produtoId: string) {
    setGrupoForm((s) => ({ ...s, itens: s.itens.filter((x) => x.produtoId !== produtoId) }));
  }

  function updateQtdGrupo(produtoId: string, quantidade: number) {
    setGrupoForm((s) => ({
      ...s,
      itens: s.itens.map((x) => (x.produtoId === produtoId ? { ...x, quantidade } : x)),
    }));
  }

  const custoGrupo = useMemo(() => {
    return (grupoForm.itens || []).reduce((sum, it) => {
      const qtd = Number(it.quantidade || 0);
      const custo = Number(it.custo_unitario || 0);
      return sum + qtd * custo;
    }, 0);
  }, [grupoForm.itens]);

  async function salvarGrupo() {
    try {
      if (!grupoForm.nome.trim()) return alert("Informe o nome do grupo");
      if (!grupoForm.itens.length) return alert("Selecione ao menos 1 item do estoque para o grupo");

      // normaliza payload pro backend
      const payload = {
        nome: grupoForm.nome.trim(),
        preco_venda: Number(grupoForm.preco_venda || 0),
        itens: grupoForm.itens.map((x) => ({
          produtoId: x.produtoId,
          quantidade: Number(x.quantidade || 0),
        })),
      };

      const url =
        grupoMode === "edit" && grupoForm.id
          ? `${API_BASE}/grupos-venda/${grupoForm.id}`
          : `${API_BASE}/grupos-venda`;

      const method = grupoMode === "edit" ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error(await r.text());

      setGrupoOpen(false);
      await carregarGrupos();
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar grupo");
    }
  }

  async function deletarGrupo(id: string) {
    try {
      if (!confirm("Deletar este grupo de venda?")) return;
      const r = await fetch(`${API_BASE}/grupos-venda/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
      await carregarGrupos();
    } catch (e: any) {
      alert(e?.message || "Erro ao deletar grupo");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estoque</h1>
          <p className="text-sm text-zinc-600">
            Produtos do estoque + Grupos de venda (venda casada).
          </p>
        </div>
        <button
          className="rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50"
          onClick={async () => {
            await carregarEstoque();
            await carregarGrupos();
          }}
        >
          Atualizar
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
      ) : null}

      {/* PRODUTO */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <Package className="h-4 w-4" />
          Adicionar produto
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            placeholder="Nome do produto"
            value={novo.produto}
            onChange={(e) => setNovo((s) => ({ ...s, produto: e.target.value }))}
          />
          <input
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            type="number"
            placeholder="Quantidade"
            value={novo.quantidade}
            onChange={(e) => setNovo((s) => ({ ...s, quantidade: Number(e.target.value) }))}
          />
          <input
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            type="number"
            step="0.01"
            placeholder="Custo unitário"
            value={novo.custo_unitario}
            onChange={(e) => setNovo((s) => ({ ...s, custo_unitario: Number(e.target.value) }))}
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            onClick={adicionarProduto}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </Card>

      {/* LISTA ESTOQUE */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
            <Search className="h-4 w-4" />
            Buscar produto
          </div>
          <input
            className="w-full max-w-md rounded-xl border bg-white px-3 py-2 text-sm"
            placeholder="Digite o nome do produto..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-zinc-600">
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Quantidade</th>
                <th className="px-3 py-2">Custo unitário</th>
                <th className="px-3 py-2">Atualizado</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-zinc-500" colSpan={5}>
                    Carregando...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-zinc-500" colSpan={5}>
                    Nenhum item.
                  </td>
                </tr>
              ) : (
                filtrados.map((it) => (
                  <RowItem
                    key={it.id}
                    item={it}
                    onSave={salvarEdicaoProduto}
                    onDelete={deletarProduto}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* GRUPOS DE VENDA */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
            <Boxes className="h-4 w-4" />
            Grupos de venda (venda casada)
          </div>

          <div className="flex items-center gap-2">
            <input
              className="w-full max-w-sm rounded-xl border bg-white px-3 py-2 text-sm"
              placeholder="Buscar grupo..."
              value={qGrupo}
              onChange={(e) => setQGrupo(e.target.value)}
            />
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              onClick={abrirCriarGrupo}
            >
              <Plus className="h-4 w-4" />
              Criar grupo
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="text-left text-zinc-600">
                <th className="px-3 py-2">Grupo</th>
                <th className="px-3 py-2">Preço venda</th>
                <th className="px-3 py-2">Custo (estimado)</th>
                <th className="px-3 py-2">Itens</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingGrupos ? (
                <tr>
                  <td className="px-3 py-6 text-zinc-500" colSpan={5}>
                    Carregando grupos...
                  </td>
                </tr>
              ) : gruposFiltrados.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-zinc-500" colSpan={5}>
                    Nenhum grupo cadastrado.
                    {/*
                    <div className="text-xs text-zinc-500 mt-1">
                      Se essa seção ficar vazia, sua API ainda não tem as rotas /grupos-venda (normal por enquanto).
                    </div>*/}
                  </td>
                </tr>
              ) : (
                gruposFiltrados.map((g) => {
                  const custo = (g.itens || []).reduce((s, it) => s + Number(it.quantidade || 0) * Number(it.custo_unitario || 0), 0);
                  return (
                    <tr key={g.id} className="border-t">
                      <td className="px-3 py-3 font-medium text-zinc-800">{g.nome}</td>
                      <td className="px-3 py-3">{formatBRL(g.preco_venda)}</td>
                      <td className="px-3 py-3">{formatBRL(custo)}</td>
                      <td className="px-3 py-3 text-zinc-700">
                        <div className="flex flex-wrap gap-2">
                          {(g.itens || []).slice(0, 5).map((it, idx) => (
                            <span
                              key={it.produtoId + idx}
                              className="rounded-full border bg-white px-3 py-1 text-xs"
                            >
                              {it.quantidade}x {it.produto}
                            </span>
                          ))}
                          {(g.itens || []).length > 5 ? (
                            <span className="text-xs text-zinc-500">+{(g.itens || []).length - 5}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 font-semibold hover:bg-zinc-50"
                            onClick={() => abrirEditarGrupo(g)}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100"
                            onClick={() => deletarGrupo(g.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Deletar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {grupoOpen ? (
        <GrupoDialog
          onClose={() => setGrupoOpen(false)}
          mode={grupoMode}
          form={grupoForm}
          setForm={setGrupoForm}
          estoque={itens}
          custoGrupo={custoGrupo}
          onAddItem={addItemNoGrupo}
          onRemoveItem={removerItemGrupo}
          onUpdateQtd={updateQtdGrupo}
          onSave={salvarGrupo}
        />
      ) : null}
    </div>
  );
}

function RowItem({
  item,
  onSave,
  onDelete,
}: {
  item: EstoqueItem;
  onSave: (id: string, quantidade: number, custo_unitario: number) => void;
  onDelete: (id: string) => void;
}) {
  const [qtd, setQtd] = useState<number>(Number(item.quantidade || 0));
  const [custo, setCusto] = useState<number>(Number(item.custo_unitario || 0));

  return (
    <tr className="border-t">
      <td className="px-3 py-3 font-medium text-zinc-800">{item.produto}</td>

      <td className="px-3 py-3">
        <input
          className="w-28 rounded-lg border bg-white px-2 py-1"
          type="number"
          value={qtd}
          onChange={(e) => setQtd(Number(e.target.value))}
        />
      </td>

      <td className="px-3 py-3">
        <input
          className="w-32 rounded-lg border bg-white px-2 py-1"
          type="number"
          step="0.01"
          value={custo}
          onChange={(e) => setCusto(Number(e.target.value))}
        />
      </td>

      <td className="px-3 py-3 text-zinc-600">{formatDate(item.atualizado_em)}</td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 font-semibold hover:bg-zinc-50"
            onClick={() => onSave(item.id, qtd, custo)}
          >
            <Save className="h-4 w-4" />
            Salvar
          </button>

          <button
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100"
            onClick={() => onDelete(item.id)}
            title="Deletar produto"
          >
            <Trash2 className="h-4 w-4" />
            Deletar
          </button>
        </div>
      </td>
    </tr>
  );
}

function GrupoDialog({
  onClose,
  mode,
  form,
  setForm,
  estoque,
  custoGrupo,
  onAddItem,
  onRemoveItem,
  onUpdateQtd,
  onSave,
}: {
  onClose: () => void;
  mode: "create" | "edit";
  form: { id?: string; nome: string; preco_venda: number; itens: GrupoVendaItem[] };
  setForm: (v: any) => void;
  estoque: EstoqueItem[];
  custoGrupo: number;
  onAddItem: (p: EstoqueItem) => void;
  onRemoveItem: (produtoId: string) => void;
  onUpdateQtd: (produtoId: string, qtd: number) => void;
  onSave: () => void;
}) {
  const [busca, setBusca] = useState("");

  const estoqueFiltrado = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return estoque;
    return estoque.filter((e) => (e.produto || "").toLowerCase().includes(t));
  }, [estoque, busca]);

  return (
    <div className="fixed inset-0 z-[80]">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute left-1/2 top-1/2 w-[94%] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-base font-semibold">
              {mode === "create" ? "Criar grupo de venda" : "Editar grupo de venda"}
            </div>
            <div className="text-xs text-zinc-500">Selecione produtos do estoque e defina a quantidade de cada.</div>
          </div>
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 grid gap-4 lg:grid-cols-2">
          {/* FORM */}
          <Card className="p-4">
            <div className="text-sm font-medium text-zinc-700">Dados do grupo</div>

            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-zinc-600">Nome do grupo</span>
                <input
                  className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Fire Big"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-zinc-600">Preço de venda do grupo</span>
                <input
                  className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  type="number"
                  step="0.01"
                  value={String(form.preco_venda ?? 0)}
                  onChange={(e) => setForm({ ...form, preco_venda: Number(e.target.value) })}
                  placeholder="Ex: 97"
                />
              </label>

              <div className="rounded-xl border bg-white p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Custo estimado</span>
                  <span className="font-semibold">{formatBRL(custoGrupo)}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Calculado pelo custo_unitario do estoque × quantidade do combo.
                </div>
              </div>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                onClick={onSave}
              >
                <Save className="h-4 w-4" />
                Salvar grupo
              </button>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium text-zinc-700">Itens do grupo</div>

              <div className="mt-2 space-y-2">
                {form.itens.length === 0 ? (
                  <div className="rounded-xl border bg-white p-3 text-sm text-zinc-500">
                    Nenhum item adicionado.
                  </div>
                ) : (
                  form.itens.map((it) => (
                    <div key={it.produtoId} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-800">{it.produto}</div>
                        <div className="text-xs text-zinc-500">
                          Custo unit.: {formatBRL(it.custo_unitario)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          className="w-20 rounded-lg border bg-white px-2 py-1 text-sm"
                          type="number"
                          value={String(it.quantidade ?? 0)}
                          onChange={(e) => onUpdateQtd(it.produtoId, Number(e.target.value))}
                        />
                        <button
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                          onClick={() => onRemoveItem(it.produtoId)}
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* ESTOQUE PICKER */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-zinc-700">Adicionar produtos do estoque</div>
              <input
                className="h-10 w-64 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="Buscar produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="mt-3 overflow-auto max-h-[520px] rounded-xl border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left text-zinc-600">
                    <th className="px-3 py-2">Produto</th>
                    <th className="px-3 py-2">Estoque</th>
                    <th className="px-3 py-2">Custo</th>
                    <th className="px-3 py-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {estoqueFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-zinc-500">
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : (
                    estoqueFiltrado.map((p) => {
                      const ja = form.itens.some((x) => x.produtoId === p.id);
                      return (
                        <tr key={p.id} className="border-b last:border-b-0">
                          <td className="px-3 py-3 font-medium text-zinc-800">{p.produto}</td>
                          <td className="px-3 py-3 text-zinc-700">{p.quantidade}</td>
                          <td className="px-3 py-3 text-zinc-700">{formatBRL(p.custo_unitario ?? 0)}</td>
                          <td className="px-3 py-3">
                            <button
                              disabled={ja}
                              onClick={() => onAddItem(p)}
                              className={[
                                "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold",
                                ja
                                  ? "border bg-zinc-100 text-zinc-400 cursor-not-allowed"
                                  : "bg-sky-600 text-white hover:bg-sky-700",
                              ].join(" ")}
                            >
                              <Plus className="h-4 w-4" />
                              {ja ? "Adicionado" : "Adicionar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

             {/*   
            <div className="mt-3 text-xs text-zinc-500">
              Dica: o grupo funciona como “venda casada”. Na venda, você manda `grupoId` e `quantidade`
              e a API dá baixa no estoque multiplicando as quantidades do combo.
            </div>*/ }  
          </Card>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function formatBRL(v: any) {
  const n = typeof v === "number" ? v : parseFloat(v);
  if (!Number.isFinite(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
