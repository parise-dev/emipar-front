export type FinanceiroRegistro = {
  id: string;
  tipo: "Entrada" | "Saída";
  categoria: string;
  descricao: string;
  origem: string;
  data: string; // ISO
  valor: number;
};

const LS_KEY = "emipar.financeiro.v1";

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

export function loadRegistros(): FinanceiroRegistro[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<FinanceiroRegistro[]>(localStorage.getItem(LS_KEY));
  if (parsed && Array.isArray(parsed)) return parsed;
  return seed();
}

export function saveRegistros(items: FinanceiroRegistro[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export function addRegistro(item: Omit<FinanceiroRegistro, "id">): FinanceiroRegistro {
  const registros = loadRegistros();
  const novo: FinanceiroRegistro = { ...item, id: crypto.randomUUID() };
  const next = [novo, ...registros];
  saveRegistros(next);
  return novo;
}

export function updateRegistro(id: string, patch: Partial<FinanceiroRegistro>): FinanceiroRegistro[] {
  const registros = loadRegistros();
  const next = registros.map(r => r.id === id ? { ...r, ...patch } : r);
  saveRegistros(next);
  return next;
}

function seed(): FinanceiroRegistro[] {
  // Seed leve para não vir vazio na primeira vez (pode apagar depois)
  const today = new Date();
  const iso = (d: Date) => d.toISOString();
  const sample: FinanceiroRegistro[] = [
    {
      id: crypto.randomUUID(),
      tipo: "Saída",
      categoria: "Frete",
      descricao: "Envio do cliente Nelson cordeiro",
      origem: "Loggi",
      data: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate()-3)),
      valor: 14.67,
    },
    {
      id: crypto.randomUUID(),
      tipo: "Saída",
      categoria: "Frete",
      descricao: "Envio do cliente Devanir constantino",
      origem: "Loggi",
      data: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate()-3)),
      valor: 15.23,
    },
    {
      id: crypto.randomUUID(),
      tipo: "Entrada",
      categoria: "Venda",
      descricao: "Pagamento pedido - ERONMAX (PIX)",
      origem: "Pix",
      data: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate()-2)),
      valor: 159.00,
    },
  ];
  saveRegistros(sample);
  return sample;
}
