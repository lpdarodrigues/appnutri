import { useState } from "react";
import { useStore, ZERO } from "../lib/store";
import { Vazio } from "../components/ui";
import { ItemDoDia, type Alvo } from "../components/ItemDoDia";
import { BuscaAlimento } from "../components/BuscaAlimento";
import { AnelCalorias, BarraMacro } from "../components/AnelCalorias";
import { escala } from "../lib/substitutes";
import { r0, r1, caseira, hoje, somaDias, rotuloData, deIso } from "../lib/format";
import type { Macros } from "../lib/types";

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
      <header className="px-4 pb-1" style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        <div className="hero px-5 pb-5 pt-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setCur(somaDias(cur, -1))} aria-label="Dia anterior"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[15px] text-white/70 active:bg-white/20">‹</button>
            <b className="text-[15px] font-semibold capitalize tracking-tight">{rotuloData(cur)}</b>
            <button onClick={() => cur < hoje() && setCur(somaDias(cur, 1))} disabled={cur >= hoje()} aria-label="Próximo dia"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[15px] text-white/70 active:bg-white/20 disabled:opacity-25">›</button>
          </div>

          <div className="mt-3 flex items-center gap-5">
            <AnelCalorias consumido={consumido.kcal} meta={geral.kcal} />
            <div className="flex-1 space-y-3">
              <BarraMacro rotulo="PROTEÍNA" atual={consumido.p} meta={geral.p} cor="var(--color-prot-lt)" />
              <BarraMacro rotulo="CARBO" atual={consumido.c} meta={geral.c} cor="var(--color-carb-lt)" />
              <BarraMacro rotulo="GORDURA" atual={consumido.g} meta={geral.g} cor="var(--color-fat-lt)" />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="num text-[9px] tracking-[0.11em] text-white/40">
              {ajustado ? "DIA AJUSTADO" : (plano?.n ?? "").toUpperCase()}
            </span>
            <span className="num text-[9px] tracking-[0.11em] text-white/40">
              {done.length}/{meals.length} REFEIÇÕES · {r1(geral.fib)} G FIBRA
            </span>
          </div>
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
                <div key={i} className="card overflow-hidden" style={on ? { boxShadow: "0 0 0 1.5px var(--color-prot), 0 1px 2px rgb(13 20 28 / .05), 0 4px 16px -4px rgb(13 20 28 / .07)" } : undefined}>
                  <button onClick={() => alternar(i)} aria-expanded={op} aria-label={`${m.n}, ${r0(t.kcal)} calorias`} className="w-full px-4 pt-4 pb-3.5 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {m.h && (
                          <span className="num shrink-0 rounded-md bg-surf2 px-1.5 py-1 text-[9.5px] font-medium text-ink2">{m.h}</span>
                        )}
                        <h3 className="truncate text-[15.5px] font-semibold">{m.n}</h3>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-1">
                        <span className="num text-[17px] font-semibold leading-none">{r0(t.kcal)}</span>
                        <span className="num text-[8.5px] tracking-wider text-dim">KCAL</span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="chip chip-p">P <b>{r1(t.p)}</b></span>
                        <span className="chip chip-c">C <b>{r1(t.c)}</b></span>
                        <span className="chip chip-g">G <b>{r1(t.g)}</b></span>
                      </div>
                      <div className="shrink-0 text-[15px] text-dim transition-transform duration-200" style={{ transform: `rotate(${op ? 90 : 0}deg)` }}>›</div>
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
                          // Linha e lixeira são botões irmãos — um <button> não pode
                          // conter outro, e a lixeira precisa do próprio alvo de toque.
                          <div key={j} className="flex items-center border-b border-line last:border-0">
                            <button
                              onClick={() => setAlvo({ dia: cur, mi: i, ii: j })}
                              className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-4 text-left active:bg-surf2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-[13.5px] font-medium leading-snug text-ink">{f.n}</div>
                                <div className="num mt-1 text-[11px] text-ink2">
                                  {cs && <b className="font-semibold text-ink">{cs}</b>}{cs && <span className="text-dim"> · </span>}{r1(it.q)} g<span className="text-dim"> · </span>{r0(sc.kcal)} kcal<span className="text-dim"> · </span>P {r1(sc.p)}
                                </div>
                              </div>
                              <span className="num shrink-0 rounded-lg border border-line px-1.5 py-1.5 text-[9px] tracking-wide text-dim">ajustar</span>
                            </button>
                            <button
                              onClick={() => st.editarDia(cur, ms => { ms[i].items.splice(j, 1); })}
                              aria-label={`Remover ${f.n} do dia`}
                              className="grid h-11 w-9 shrink-0 place-items-center text-dim active:text-warn"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                                <path d="M2.8 4.3h10.4M6.4 4.3V3.1a.8.8 0 01.8-.8h1.6a.8.8 0 01.8.8v1.2M12 4.3l-.5 8.2a1.1 1.1 0 01-1.1 1H5.6a1.1 1.1 0 01-1.1-1L4 4.3M6.6 7v4M9.4 7v4"
                                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
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

                  <button onClick={() => marcar(i)}
                    className={`flex w-full items-center justify-center gap-2 border-t px-4 py-3 text-[12.5px] font-semibold transition-colors ${on ? "border-transparent bg-[#E4F1ED] text-prot" : "border-line text-dim active:bg-surf2"}`}>
                    <span className={`grid h-4 w-4 place-items-center rounded-[5px] border transition-colors ${on ? "border-prot bg-prot" : "border-line bg-surf"}`}>
                      {on && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.4L3.3 5.7L8 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
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
              <button key={dd} onClick={() => setCur(dd)} className={`shrink-0 rounded-xl px-2.5 py-2 transition-all ${dd === cur ? "bg-ink text-white shadow-[0_2px_8px_-2px_rgb(13_20_28/.35)]" : "bg-surf text-dim shadow-[0_1px_2px_rgb(13_20_28/.05)]"}`}>
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
          <div className="num mt-4 text-center text-[9px] leading-relaxed tracking-[0.1em] text-dim uppercase">
            {r0(geral.kcal)} kcal planejadas · proteína {(geral.p / st.ajustes.pesoRef).toFixed(2).replace(".", ",")} g/kg
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
