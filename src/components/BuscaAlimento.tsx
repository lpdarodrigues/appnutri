import { useMemo, useState } from "react";
import { Sheet, Lista, Linha } from "./ui";
import { useStore } from "../lib/store";
import { buscar } from "../lib/busca";
import { r0, r1, procedencia } from "../lib/format";

export function BuscaAlimento({ aberto, onEscolher, onFechar }: {
  aberto: boolean; onEscolher: (id: string) => void; onFechar: () => void;
}) {
  const { catalogo } = useStore();
  const [q, setQ] = useState("");

  const lista = useMemo(() => buscar(catalogo, q, 40), [q, catalogo]);

  return (
    <Sheet aberto={aberto} titulo="Escolher alimento" sub="TACO + seus rótulos" onFechar={onFechar}>
      <div className="px-4 pb-2">
        <input
          value={q} onChange={e => setQ(e.target.value)} autoComplete="off" placeholder="Buscar…"
          className="w-full rounded-lg bg-surf2 px-3.5 py-2.5 text-[14.5px] outline-none placeholder:text-dim"
        />
      </div>
      <Lista plana>
        {lista.map(f => {
          const pr = procedencia(f);
          return (
            <Linha
              key={f.id}
              onClick={() => { onEscolher(f.id); setQ(""); }}
              titulo={<>{f.n}<span className={`tag ${pr.cls}`}>{pr.txt}</span></>}
              sub={`P ${r1(f.p)} · C ${r1(f.c)} · G ${r1(f.g)}`}
              valor={r0(f.kcal)}
              unidade={`kcal/100${f.un === "ml" ? "ml" : "g"}`}
            />
          );
        })}
        {!lista.length && (
          <div className="px-4 py-6 text-center">
            <div className="text-[13.5px] text-dim">Nada encontrado para “{q}”.</div>
            <div className="note mt-3 text-left">
              A base TACO usa nomes acadêmicos e não tem produtos de marca. Se for
              algo industrializado — iogurte grego, granola, pasta de amendoim —
              cadastre em <b>Alimentos</b> lendo o rótulo. É uma vez só.
            </div>
          </div>
        )}
      </Lista>
    </Sheet>
  );
}
