import { useState } from "react";
import { useStore } from "../lib/store";
import { Lista, Linha, Stat, Vazio } from "../components/ui";
import { BuscaAlimento } from "../components/BuscaAlimento";
import { escala } from "../lib/substitutes";
import { r0, r1, caseira, numBR } from "../lib/format";
import { uid } from "../lib/db";
import type { Diet } from "../lib/types";

const gkg = (v: number, peso: number) => (v / peso).toFixed(2).replace(".", ",");

export function Dietas() {
  const st = useStore();
  const [edit, setEdit] = useState<Diet | null>(null);

  if (edit) return <Editor dieta={edit} onSair={() => setEdit(null)} />;

  const nova = (): Diet => ({ id: "d:" + uid(), n: "Nova dieta", meals: [{ n: "Refeição 1", h: "07:30", items: [] }] });

  return (
    <div className="px-4 pb-4" style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[21px] font-semibold">Dietas</h2>
        <button onClick={() => setEdit(nova())} className="btn btn-sm">+ Nova</button>
      </div>

      <div className="mt-3">
        {!st.diets.length ? <Vazio>Nenhuma dieta cadastrada.</Vazio> : (
          <Lista>
            {st.diets.map(d => {
              const t = st.totaisDieta(d);
              return (
                <Linha
                  key={d.id} onClick={() => setEdit(structuredClone(d))}
                  titulo={d.n}
                  sub={`${d.meals.length} refeições · P ${r1(t.p)} g · ${gkg(t.p, st.ajustes.pesoRef)} g/kg`}
                  valor={r0(t.kcal)} unidade="kcal"
                />
              );
            })}
          </Lista>
        )}
      </div>
    </div>
  );
}

function Editor({ dieta, onSair }: { dieta: Diet; onSair: () => void }) {
  const st = useStore();
  const [d, setD] = useState<Diet>(dieta);
  const [addEm, setAddEm] = useState<number | null>(null);
  const existe = st.diets.some(x => x.id === d.id);

  const t = st.totaisDieta(d);
  const up = (fn: (x: Diet) => void) => setD(s => { const n = structuredClone(s); fn(n); return n; });

  const HORARIOS = ["07:30", "12:00", "15:00", "19:30", "10:00", "22:00"];

  return (
    <div className="px-4 pb-4" style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}>
      <div className="flex items-center justify-between gap-3">
        <button onClick={onSair} className="text-[14px] text-dim">‹ Dietas</button>
        <button onClick={async () => { await st.salvarDieta({ ...d, n: d.n.trim() || "Sem nome" }); onSair(); }} className="btn btn-sm">Salvar</button>
      </div>

      <div className="fld mt-4">
        <label htmlFor="ed-nome">Nome da dieta</label>
        <input id="ed-nome" value={d.n} onChange={e => up(x => { x.n = e.target.value; })} placeholder="Ex.: Plano cutting" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat rotulo="Total" valor={r0(t.kcal)} sub="kcal/dia" />
        <Stat rotulo="Proteína" valor={r0(t.p)} sub={`g · ${gkg(t.p, st.ajustes.pesoRef)} g/kg`} cor="var(--color-prot)" />
        <Stat rotulo="Carboidrato" valor={r0(t.c)} sub="g" cor="var(--color-carb)" />
        <Stat rotulo="Gordura" valor={r0(t.g)} sub={`g · ${gkg(t.g, st.ajustes.pesoRef)} g/kg`} cor="var(--color-fat)" />
      </div>

      {d.meals.map((m, i) => {
        const mt = st.totaisRefeicao(m);
        return (
          <div key={i}>
            <p className="sh">Refeição {i + 1} · {r0(mt.kcal)} kcal · P {r1(mt.p)} g</p>
            <div className="flex items-end gap-3">
              <div className="fld max-w-[104px]">
                <label htmlFor={`h-${i}`}>Horário</label>
                <input id={`h-${i}`} type="time" value={m.h || ""} onChange={e => up(x => { x.meals[i].h = e.target.value; })} />
              </div>
              <div className="fld flex-1">
                <label htmlFor={`n-${i}`}>Nome</label>
                <input id={`n-${i}`} value={m.n} onChange={e => up(x => { x.meals[i].n = e.target.value; })} />
              </div>
              <button onClick={() => up(x => { x.meals.splice(i, 1); })} aria-label={`Remover refeição ${m.n}`} className="btn btn-gh btn-sm text-dim">✕</button>
            </div>

            <div className="mt-2.5">
              <Lista>
                {m.items.length ? m.items.map((it, j) => {
                  const f = st.food(it.f);
                  if (!f) return null;
                  const s = escala(f, it.q);
                  const cs = caseira(f, it.q);
                  return (
                    <Linha
                      key={j} titulo={f.n}
                      sub={`${cs ? cs + " · " : ""}${r0(s.kcal)} kcal · P ${r1(s.p)} · C ${r1(s.c)} · G ${r1(s.g)}`}
                      acao={
                        <div className="flex shrink-0 items-center gap-2">
                          <input
                            className="num w-14 border-b border-line bg-transparent pb-0.5 text-right text-[14px] font-semibold outline-none focus:border-carb"
                            type="text" inputMode="decimal" aria-label={`Quantidade de ${f.n} em gramas`}
                            value={it.q}
                            onChange={e => up(x => { x.meals[i].items[j].q = numBR(e.target.value) || 0; })}
                          />
                          <small className="num text-[9px] text-dim">g</small>
                          <button onClick={() => up(x => { x.meals[i].items.splice(j, 1); })} aria-label={`Remover ${f.n}`} className="px-1 text-[17px] leading-none text-dim">×</button>
                        </div>
                      }
                    />
                  );
                }) : <div className="empty !py-4 text-[13px]">Nenhum alimento</div>}
              </Lista>
              <button onClick={() => setAddEm(i)} className="btn btn-gh btn-sm mt-2 w-full">+ Alimento</button>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => up(x => { x.meals.push({ n: `Refeição ${x.meals.length + 1}`, h: HORARIOS[x.meals.length] || "", items: [] }); })}
        className="btn btn-gh mt-5 w-full"
      >+ Refeição</button>

      {existe && st.diets.length > 1 && (
        <button
          onClick={async () => { if (confirm(`Apagar a dieta "${d.n}"?`)) { await st.apagarDieta(d.id); onSair(); } }}
          className="btn btn-gh mt-2.5 w-full text-warn"
        >Apagar dieta</button>
      )}

      <BuscaAlimento
        aberto={addEm !== null}
        onFechar={() => setAddEm(null)}
        onEscolher={fid => { const i = addEm!; up(x => { x.meals[i].items.push({ f: fid, q: 100 }); }); setAddEm(null); }}
      />
    </div>
  );
}
