import { useMemo } from "react";
import { Sheet, Lista, Linha } from "./ui";
import { useStore } from "../lib/store";
import { substitutos, escala, NOME_ANCORA, REF_ANCORA } from "../lib/substitutes";
import { GLBL } from "../lib/nutrition-config";
import { r0, r1, caseira } from "../lib/format";
import type { Food } from "../lib/types";

export function SubstitutosSheet({
  alvo, onFechar, onTrocar,
}: {
  alvo: { f: Food; q: number } | null;
  onFechar: () => void;
  onTrocar?: (novoId: string, novaQtd: number) => void;
}) {
  const { catalogo } = useStore();
  const R = useMemo(
    () => (alvo ? substitutos(alvo.f, alvo.q, catalogo, 12) : null),
    [alvo, catalogo],
  );

  if (!alvo) return <Sheet aberto={false} titulo="" onFechar={onFechar}><div /></Sheet>;

  const { f, q } = alvo;
  const s = escala(f, q);

  if (!R || !R.a || !R.list.length) {
    return (
      <Sheet aberto titulo={`Substituir ${f.n}`} sub="Sem equivalentes na base para este item" onFechar={onFechar}>
        <div className="empty px-5">
          Não encontrei alimentos com perfil de macros parecido.
          <br />Cadastre um em <b>Alimentos</b> ou ajuste a quantidade direto na dieta.
        </div>
      </Sheet>
    );
  }

  const un = R.a === "V" ? "kcal" : "g";

  return (
    <Sheet
      aberto
      titulo={`Substituir ${f.n}`}
      sub={`Ancorado n${R.a === "V" ? "as calorias" : "o " + NOME_ANCORA[R.a]} · ${r1(R.base)} ${un} · família ${f.gr ? GLBL[f.gr] : "—"}`}
      onFechar={onFechar}
    >
      <div className="px-0 pb-1">
        <Lista plana>
          <Linha
            destaque
            titulo={<span className="text-carb">{f.n}<span className="tag tag-taco">ATUAL</span></span>}
            sub={`${r0(s.kcal)} kcal · P ${r1(s.p)} · C ${r1(s.c)} · G ${r1(s.g)}`}
            valor={r1(q)}
            unidade="g"
          />
          {R.list.map(o => {
            const dp = o.p - s.p, dc = o.c - s.c, dg = o.g - s.g;
            const extra = [
              R.a !== "P" && Math.abs(dp) >= 1 ? `P ${dp > 0 ? "+" : ""}${r1(dp)}` : "",
              R.a !== "C" && Math.abs(dc) >= 1.5 ? `C ${dc > 0 ? "+" : ""}${r1(dc)}` : "",
              R.a !== "G" && Math.abs(dg) >= 1 ? `G ${dg > 0 ? "+" : ""}${r1(dg)}` : "",
            ].filter(Boolean).join(" · ");
            const cor = o.dk < -5 ? "var(--color-prot)" : o.dk > 5 ? "var(--color-fat)" : "var(--color-dim)";
            const cs = caseira(o.x, o.q);
            return (
              <Linha
                key={o.x.id}
                onClick={onTrocar ? () => { onTrocar(o.x.id, Math.round(o.q)); onFechar(); } : undefined}
                titulo={o.x.n}
                sub={<>
                  {cs && <><b className="text-ink font-semibold">{cs}</b> · </>}
                  {r0(o.kcal)} kcal <span style={{ color: cor }}>({o.dk >= 0 ? "+" : ""}{r0(o.dk)})</span>
                  {extra && ` · ${extra}`}
                </>}
                valor={r0(o.q)}
                unidade="g"
              />
            );
          })}
        </Lista>
        <div className="note mx-4 mt-3.5">
          <b>Como as quantidades são calculadas:</b> cada opção iguala {REF_ANCORA[R.a]} do
          item original — não as calorias. É assim que a troca preserva a estrutura da dieta.
          O número entre parênteses mostra quanto você ganha ou perde em calorias ao fazer a
          troca; verde significa que sobra espaço no dia.
        </div>
      </div>
    </Sheet>
  );
}
