import { Suspense } from "react";
import AtendimentoClient from "./atendimento-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Carregando…</div>}>
      <AtendimentoClient />
    </Suspense>
  );
}
