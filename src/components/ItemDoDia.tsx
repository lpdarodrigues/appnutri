import { useEffect, useMemo, useState } from "react";
import { Sheet, Lista, Linha } from "./ui";
import { useStore } from "../lib/store";
import { substitutos, escala, EM_ANCORA, REF_ANCORA } from "../lib/substitutes";
import { GLBL } from "../lib/nutrition-config";
import { r0, r1, caseira, numBR, procedencia } from "../lib/format";

export interface Alvo { dia: string; mi: number; ii: number }

/**
 * Painel de um item do diário: ajusta o peso, remove do dia, ou troca por um
 * equivalente. A lista de substitutos recalcula junto com a quantidade — é a
 * mesma âncora de macro, só que sobre o peso que está na tela agora.
 */
export function ItemDoDia({ alvo, onFechar }: { alvo: Alvo | null; onFechar: () => void }) {
  const st = useStore();

  const item = alvo ? st.refeicoesDia(alvo.dia)[alvo.mi]?.items[alvo.ii] : null;
  const f = item ? st.food(item.f) : null;

  const [qtd, setQtd] = useState("");
  useEffect(() => { if (item) setQtd(String(item.q)); }, [alvo?.dia, alvo?.mi, alvo?.ii]);

  const q = Math.max(0, numBR(qtd) || 0);

  const R = useMemo(
    () => (f && q > 0 ? substitutos(f, q, st.catalogo, 12) : null),
    [f, q, st.catalogo],
  );

  if (!alvo || !item || !f) {
    return <Sheet aberto={false} titulo="" onFechar={onFechar}><div /></Sheet>;
  }

  const s = escala(f, q);
  const cs = caseira(f, q);
  const pr = procedencia(f);

  const gravarQtd = (valor: string) => {
    setQtd(valor);
    const n = numBR(valor);
    if (Number.isFinite(n) && n > 0) {
      st.editarDia(alvo.dia, m => { m[alvo.mi].items[alvo.ii].q = n; });
    }
  };

  const remover = () => {
    st.editarDia(alvo.dia, m => { m[alvo.mi].items.splice(alvo.ii, 1); });
    onFechar();
  };

  const trocar = (novoId: string, novaQtd: number) => {
    st.editarDia(alvo.dia, m => {
      m[alvo.mi].items[alvo.ii] = { f: novoId, q: novaQtd };
    });
    onFechar();
  };

  return (
    <Sheet
      aberto
      titulo={f.n}
      sub={`${f.cat}${f.gr ? ` · ${GLBL[f.gr]}` : ""} · ${pr.txt}`}
      onFechar={onFechar}
    >
      <div className="px-4 pb-2">
        {/* Quantidade */}
        <div className="card px-4 py-3.5">
          <div className="flex items-end gap-3">
            <div className="fld flex-1">
              <label htmlFor="it-q">Quantidade ({f.un || "g"})</label>
              <input
                id="it-q" className="num text-[19px] font-semibold" type="text" inputMode="decimal"
                value={qtd} onChange={e => gravarQtd(e.target.value)}
                onFocus={e => e.currentTarget.select()}
              />
            </div>
            <div className="pb-1 text-right">
              <div className="num text-[19px] font-semibold leading-none">{r0(s.kcal)}</div>
              <div className="num text-[8.5px] tracking-wider text-dim uppercase">kcal</div>
            </div>
          </div>

          {cs && <div className="num mt-2.5 text-[12.5px]"><b>{cs}</b></div>}

          <div className="num mt-2 flex gap-4 text-[11px] text-dim">
            <span>P <b className="text-prot">{r1(s.p)}</b></span>
            <span>C <b className="text-carb">{r1(s.c)}</b></span>
            <span>G <b className="text-fat">{r1(s.g)}</b></span>
            {s.fib > 0 && <span>fibra <b className="text-ink">{r1(s.fib)}</b></span>}
          </div>

          <div className="mt-3 flex gap-2">
            {[-25, -10, +10, +25].map(d => (
              <button
                key={d}
                onClick={() => gravarQtd(String(Math.max(1, Math.round(q + d))))}
                className="num flex-1 rounded-lg border border-line py-1.5 text-[12px] font-medium text-dim active:bg-surf2"
              >{d > 0 ? `+${d}` : d}</button>
            ))}
          </div>
        </div>

        <button onClick={remover} className="btn btn-gh mt-2.5 w-full text-warn">
          Remover do dia
        </button>

        {/* Substitutos */}
        {R && R.a && R.list.length > 0 && (
          <>
            <p className="sh">
              Trocar por · ancorado {EM_ANCORA[R.a]} · {r1(R.base)} {R.a === "V" ? "kcal" : "g"}
            </p>
            <Lista>
              {R.list.map(o => {
                const dp = o.p - s.p, dc = o.c - s.c, dg = o.g - s.g;
                const extra = [
                  R.a !== "P" && Math.abs(dp) >= 1 ? `P ${dp > 0 ? "+" : ""}${r1(dp)}` : "",
                  R.a !== "C" && Math.abs(dc) >= 1.5 ? `C ${dc > 0 ? "+" : ""}${r1(dc)}` : "",
                  R.a !== "G" && Math.abs(dg) >= 1 ? `G ${dg > 0 ? "+" : ""}${r1(dg)}` : "",
                ].filter(Boolean).join(" · ");
                const cor = o.dk < -5 ? "var(--color-prot)" : o.dk > 5 ? "var(--color-fat)" : "var(--color-dim)";
                const csx = caseira(o.x, o.q);
                return (
                  <Linha
                    key={o.x.id}
                    onClick={() => trocar(o.x.id, Math.round(o.q))}
                    titulo={o.x.n}
                    sub={<>
                      {csx && <><b className="text-ink font-semibold">{csx}</b> · </>}
                      {r0(o.kcal)} kcal <span style={{ color: cor }}>({o.dk >= 0 ? "+" : ""}{r0(o.dk)})</span>
                      {extra && ` · ${extra}`}
                    </>}
                    valor={r0(o.q)}
                    unidade="g"
                  />
                );
              })}
            </Lista>
            <div className="note mt-3">
              <b>Toque numa opção para trocar.</b> Cada uma iguala {REF_ANCORA[R.a]} do
              item atual — não as calorias. É assim que a troca preserva a estrutura da
              dieta. O número entre parênteses mostra quanto você ganha ou perde em
              calorias; verde significa que sobra espaço no dia.
            </div>
          </>
        )}

        {R && (!R.a || !R.list.length) && (
          <div className="note mt-4">
            Não encontrei equivalentes na base para este item. Você ainda pode ajustar o
            peso acima ou removê-lo do dia.
          </div>
        )}
      </div>
    </Sheet>
  );
}
