import { useMemo } from "react";
import { Sheet, Lista, Linha } from "./ui";
import { useStore } from "../lib/store";
import { substitutos, escala, EM_ANCORA, REF_ANCORA } from "../lib/substitutes";
import { GLBL } from "../lib/nutrition-config";
import { r0, r1, caseira, procedencia } from "../lib/format";

export interface Alvo { dia: string; mi: number; ii: number }

/**
 * Substituições de um item do diário.
 *
 * O peso é editado no popup (toque no número, na própria linha); aqui a
 * quantidade aparece só como contexto — é ela que define a âncora de macro que
 * as opções precisam igualar.
 */
export function ItemDoDia({ alvo, onFechar }: { alvo: Alvo | null; onFechar: () => void }) {
  const st = useStore();

  const item = alvo ? st.refeicoesDia(alvo.dia)[alvo.mi]?.items[alvo.ii] : null;
  const f = item ? st.food(item.f) : null;
  const q = item?.q ?? 0;

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

  const remover = () => {
    st.editarDia(alvo.dia, m => { m[alvo.mi].items.splice(alvo.ii, 1); });
    onFechar();
  };

  const trocar = (novoId: string, novaQtd: number) => {
    st.editarDia(alvo.dia, m => { m[alvo.mi].items[alvo.ii] = { f: novoId, q: novaQtd }; });
    onFechar();
  };

  return (
    <Sheet
      aberto
      titulo={`Trocar ${f.n}`}
      sub={`${cs ? cs + " · " : ""}${r1(q)} ${f.un || "g"} · ${r0(s.kcal)} kcal · ${pr.txt}`}
      onFechar={onFechar}
    >
      <div className="px-4 pb-2">
        {R && R.a && R.list.length > 0 ? (
          <>
            <p className="sh !mt-2">
              Ancorado {EM_ANCORA[R.a]} · {r1(R.base)} {R.a === "V" ? "kcal" : "g"} · família {f.gr ? GLBL[f.gr] : "—"}
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
        ) : (
          <div className="note mt-2">
            Não encontrei equivalentes na base para este item. Você ainda pode mudar o
            peso tocando no número, na linha da refeição.
          </div>
        )}

        <button onClick={remover} className="btn btn-gh mt-3 w-full text-warn">
          Remover do dia
        </button>
      </div>
    </Sheet>
  );
}
