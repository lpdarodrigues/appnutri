import { useState } from "react";
import { useStore, ZERO } from "../lib/store";
import { Vazio } from "../components/ui";
import { ItemDoDia, type Alvo } from "../components/ItemDoDia";
import { BuscaAlimento } from "../components/BuscaAlimento";
import { escala } from "../lib/substitutes";
import { r0, r1, mil, caseira, hoje, somaDias, rotuloData, deIso } from "../lib/format";
import type { Macros } from "../lib/types";

const CORES = { p: "var(--color-prot)", c: "var(--color-carb)", g: "var(--color-fat)" };

export function Diario() {
  const st = useStore();
  const [cur, setCur] = useState(hoje());
  const [abertas, setAbertas] = useState<Set<number>>(new Set());
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [addEm, setAddEm] = useState<number | null>(null);

  const rec = st.dia(cur);
  const plano = st.dieta(rec.diet);
  const meals = st.refeicoesDia(cur);
  const ajustado = st.diaAjustado(cur);
  const done = rec.done ?? [];

  const geral: Macros = meals.reduce((a, m) => {
    const t = st.totaisRefeicao(m);
    return { kcal: a.kcal + t.kcal, p: a.p + t.p, c: a.c + t.c, g: a.g + t.g, fib: a.fib + t.fib };
  }, ZERO);

  const consumido: Macros = done.reduce((a, i) => {
    const m = meals[i];
    if (!m) return a;
    const t = st.totaisRefeicao(m);
    return { kcal: a.kcal + t.kcal, p: a.p + t.p, c: a.c + t.c, g: a.g + t.g, fib: a.fib + t.fib };
  }, ZERO);

  const alternar = (i: number) =>
    setAbertas(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const marcar = (i: number) => {
    const l = [...done];
    const k = l.indexOf(i);
    k < 0 ? l.push(i) : l.splice(k, 1);
    st.setDia(cur, { ...rec, done: l });
  };

  const ordenadas = meals
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (a.m.h || "99:99").localeCompare(b.m.h || "99:99"));

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg/95 px-4 pb-3 backdrop-blur" style={{ paddingTop: "max(env(safe-area-inset-top), 10px)" }}>
        <div className="flex items-center justify-between">
          <button onClick={() => setCur(somaDias(cur, -1))} aria-label="Dia anterior" className="grid h-8 w-8 place-items-center rounded-full bg-surf text-dim">‹</button>
          <b className="text-[15px] font-semibold capitalize">{rotuloData(cur)}</b>
          <button onClick={() => cur < hoje() && setCur(somaDias(cur, 1))} disabled={cur >= hoje()} aria-label="Próximo dia" className="grid h-8 w-8 place-items-center rounded-full bg-surf text-dim disabled:opacity-30">›</button>
        </div>

        <div className="card mt-2.5 flex items-end justify-between px-4 py-3">
          <div>
            <div className="eyebrow">Consumido</div>
            <div className="flex items-baseline gap-1.5">
              <b className="num text-[30px] font-semibold leading-none">{mil(consumido.kcal)}</b>
              <span className="num text-[9px] tracking-wider text-dim">KCAL</span>
            </div>
          </div>
          <div className="num text-right text-[10px] leading-relaxed text-dim">
            meta <em className="not-italic font-semibold text-ink">{mil(geral.kcal)}</em><br />
            restam <em className="not-italic font-semibold text-ink">{mil(Math.max(0, geral.kcal - consumido.kcal))}</em>
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          {([["PRO", "p"], ["CAR", "c"], ["GOR", "g"]] as const).map(([rot, k]) => (
            <div key={k} className="flex flex-1 items-center gap-1.5">
              <i className="num not-italic text-[8.5px] tracking-wider text-dim">{rot}</i>
              <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, geral[k] ? (consumido[k] / geral[k]) * 100 : 0)}%`, background: CORES[k] }} />
              </div>
              <b className="num text-[9px] font-medium text-dim">{r0(consumido[k])}/{r0(geral[k])}</b>
            </div>
          ))}
        </div>
      </header>

      <div className="px-4 pb-4">
        {st.diets.length > 1 && !ajustado && (
          <>
            <p className="sh !mt-3">Dieta do dia</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {st.diets.map(x => (
                <button key={x.id} onClick={() => st.setDia(cur, { diet: x.id, done: [] })} className={`pill ${x.id === plano?.id ? "pill-on" : ""}`}>{x.n}</button>
              ))}
            </div>
          </>
        )}

        {ajustado && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-surf px-3.5 py-2.5 shadow-sm">
            <div className="text-[12px] leading-snug text-dim">
              <b className="text-ink">Dia ajustado.</b> Você mudou este dia — o plano
              “{plano?.n}” continua intacto.
            </div>
            <button
              onClick={() => { if (confirm("Descartar os ajustes deste dia e voltar a seguir o plano?")) st.voltarAoPlano(cur); }}
              className="num shrink-0 rounded-md border border-line px-2.5 py-1.5 text-[10px] tracking-wide text-dim"
            >desfazer</button>
          </div>
        )}

        {!meals.length ? (
          <div className="mt-3"><Vazio>Nenhuma refeição neste dia.<br />Abra <b>Dietas</b> para montar seu plano.</Vazio></div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {ordenadas.map(({ m, i }) => {
              const t = st.totaisRefeicao(m);
              const on = done.includes(i);
              const op = abertas.has(i);
              return (
                <div key={i} className={`card overflow-hidden transition-opacity ${on ? "opacity-60" : ""}`}>
                  <button onClick={() => alternar(i)} aria-expanded={op} aria-label={`${m.n}, ${r0(t.kcal)} calorias`} className="w-full px-4 pt-3.5 pb-3 text-left">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-[15px] font-semibold">
                        {m.h && <span className="num mr-2 text-[10.5px] font-medium text-dim">{m.h}</span>}
                        {m.n}
                      </h3>
                      <div className="num shrink-0 text-[15px] font-semibold">{r0(t.kcal)}</div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="num text-[10.5px] text-dim">
                        P <u className="no-underline font-semibold text-ink">{r1(t.p)}</u> · C <u className="no-underline font-semibold text-ink">{r1(t.c)}</u> · G <u className="no-underline font-semibold text-ink">{r1(t.g)}</u> g
                      </div>
                      <div className="text-dim transition-transform duration-200" style={{ transform: `rotate(${op ? 90 : 0}deg)` }}>›</div>
                    </div>
                  </button>

                  {op && (
                    <div className="border-t border-line">
                      {m.items.map((it, j) => {
                        const f = st.food(it.f);
                        if (!f) return null;
                        const sc = escala(f, it.q);
                        const cs = caseira(f, it.q);
                        return (
                          <button key={j} onClick={() => setAlvo({ dia: cur, mi: i, ii: j })} className="flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left active:bg-surf2">
                            <div className="min-w-0 flex-1">
                              <div className="text-[13.5px] leading-snug">{f.n}</div>
                              <div className="num mt-0.5 text-[11px] text-dim">
                                {cs && <b className="font-semibold text-ink">{cs}</b>}{cs && " · "}{r1(it.q)} g · {r0(sc.kcal)} kcal · P {r1(sc.p)}
                              </div>
                            </div>
                            <span className="num shrink-0 rounded-md bg-surf2 px-2 py-1 text-[9px] tracking-wide text-carb">ajustar</span>
                          </button>
                        );
                      })}

                      {!m.items.length && (
                        <div className="px-4 py-3 text-center text-[12.5px] text-dim">Nenhum alimento nesta refeição.</div>
                      )}

                      <button
                        onClick={() => setAddEm(i)}
                        className="w-full border-b border-line px-4 py-2.5 text-left text-[12.5px] font-medium text-carb active:bg-surf2"
                      >+ Adicionar alimento</button>
                    </div>
                  )}

                  <button onClick={() => marcar(i)} className={`flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-[12px] font-medium ${on ? "text-prot" : "text-dim"}`}>
                    <span className={`grid h-4 w-4 place-items-center rounded-[5px] border ${on ? "border-prot bg-prot" : "border-line bg-surf"}`}>
                      {on && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.4L3.3 5.7L8 1" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    {on ? "Consumida" : "Marcar como consumida"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: 14 }, (_, k) => {
            const dd = somaDias(hoje(), k - 13);
            const rc = st.days[dd];
            const n = rc ? st.refeicoesDia(dd).length : (plano?.meals.length ?? 4);
            const feitas = rc ? rc.done.length : 0;
            return (
              <button key={dd} onClick={() => setCur(dd)} className={`shrink-0 rounded-lg px-2 py-1.5 ${dd === cur ? "bg-ink text-white" : "bg-surf text-dim"}`}>
                <em className="num block text-[10px] not-italic font-medium">{deIso(dd).toLocaleDateString("pt-BR", { day: "2-digit" })}</em>
                <div className="mt-1 flex justify-center gap-[2px]">
                  {Array.from({ length: Math.min(n, 5) }, (_, q) => (
                    <i key={q} className={`h-[3px] w-[3px] rounded-full ${q < feitas ? (dd === cur ? "bg-white" : "bg-prot") : dd === cur ? "bg-white/30" : "bg-line"}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {meals.length > 0 && (
          <div className="num mt-4 text-center text-[9px] leading-relaxed tracking-wider text-dim uppercase">
            {ajustado ? "Dia ajustado" : plano?.n} · {meals.length} refeições · {r0(geral.kcal)} kcal · P {r1(geral.p)} g<br />
            fibras {r1(geral.fib)} g · proteína {(geral.p / st.ajustes.pesoRef).toFixed(2).replace(".", ",")} g/kg
          </div>
        )}
      </div>

      <ItemDoDia alvo={alvo} onFechar={() => setAlvo(null)} />

      <BuscaAlimento
        aberto={addEm !== null}
        onFechar={() => setAddEm(null)}
        onEscolher={fid => {
          const i = addEm!;
          const f = st.food(fid);
          // porção inicial: uma medida caseira quando existe, senão 100 g
          const q = f?.mp && f.mp > 0 ? f.mp : 100;
          st.editarDia(cur, m => { m[i].items.push({ f: fid, q }); });
          setAddEm(null);
        }}
      />
    </>
  );
}
