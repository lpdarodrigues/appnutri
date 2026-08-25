import { useState } from "react";
import { Store, useStore } from "./lib/store";
import { Diario } from "./screens/Diario";
import { Dietas } from "./screens/Dietas";
import { Alimentos } from "./screens/Alimentos";
import { Peso } from "./screens/Peso";
import { Ajustes } from "./screens/Ajustes";

type Aba = "dia" | "dietas" | "alimentos" | "peso" | "ajustes";

const ABAS: { k: Aba; rot: string; icone: string }[] = [
  { k: "dia", rot: "Diário", icone: "M3 5h14M3 10h14M3 15h9" },
  { k: "dietas", rot: "Dietas", icone: "M4 4h12v12H4zM7 8h6M7 11h4" },
  { k: "alimentos", rot: "Alimentos", icone: "M9 3a6 6 0 100 12A6 6 0 009 3zM17 17l-3.5-3.5" },
  { k: "peso", rot: "Peso", icone: "M3 14l4-5 3.5 3L17 5" },
  { k: "ajustes", rot: "Ajustes", icone: "M10 7a3 3 0 100 6 3 3 0 000-6zM10 2v2M10 16v2M2 10h2M16 10h2" },
];

function Conteudo() {
  const [aba, setAba] = useState<Aba>("dia");
  const { pronto } = useStore();

  if (!pronto) {
    return <div className="grid min-h-dvh place-items-center"><div className="eyebrow">carregando…</div></div>;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[520px]" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
      {aba === "dia" && <Diario />}
      {aba === "dietas" && <Dietas />}
      {aba === "alimentos" && <Alimentos />}
      {aba === "peso" && <Peso />}
      {aba === "ajustes" && <Ajustes />}

      <nav
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[520px] justify-around border-t border-line bg-surf/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegação principal"
      >
        {ABAS.map(a => (
          <button
            key={a.k} onClick={() => setAba(a.k)} aria-current={aba === a.k ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 ${aba === a.k ? "text-ink" : "text-dim"}`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d={a.icone} stroke="currentColor" strokeWidth={aba === a.k ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={`text-[9.5px] ${aba === a.k ? "font-semibold" : ""}`}>{a.rot}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return <Store><Conteudo /></Store>;
}
