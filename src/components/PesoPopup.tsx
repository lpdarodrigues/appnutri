import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { escala } from "../lib/substitutes";
import { r0, r1, caseira, numBR } from "../lib/format";

export interface AlvoPeso { dia: string; mi: number; ii: number }

/**
 * Popup para digitar o peso realmente consumido.
 *
 * Só grava no "Confirmar" — sair pelo cancelar, pelo fundo ou pelo Esc deixa o
 * valor como estava. É a ação mais frequente do diário, então abre com o campo
 * já focado e o número selecionado: dá para digitar o novo peso de cara.
 */
export function PesoPopup({ alvo, onFechar }: { alvo: AlvoPeso | null; onFechar: () => void }) {
  const st = useStore();
  const campo = useRef<HTMLInputElement>(null);

  const item = alvo ? st.refeicoesDia(alvo.dia)[alvo.mi]?.items[alvo.ii] : null;
  const f = item ? st.food(item.f) : null;

  const [txt, setTxt] = useState("");

  useEffect(() => {
    if (!alvo || !item) return;
    setTxt(String(item.q));
    const t = setTimeout(() => { campo.current?.focus(); campo.current?.select(); }, 60);
    return () => clearTimeout(t);
  }, [alvo?.dia, alvo?.mi, alvo?.ii]);

  useEffect(() => {
    if (!alvo) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [alvo, onFechar]);

  if (!alvo || !item || !f) return null;

  const q = Math.max(0, numBR(txt) || 0);
  const s = escala(f, q);
  const cs = caseira(f, q);
  const un = f.un || "g";

  const confirmar = () => {
    if (q > 0) st.editarDia(alvo.dia, m => { m[alvo.mi].items[alvo.ii].q = q; });
    onFechar();
  };

  return (
    <>
      <div onClick={onFechar} aria-hidden className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-[2px]" />
      <div
        role="dialog" aria-modal="true" aria-label={`Peso de ${f.n}`}
        className="fixed inset-x-0 top-1/2 z-[61] mx-auto w-[min(340px,calc(100vw-40px))] -translate-y-1/2"
      >
        <div className="card px-5 pb-4 pt-5">
          <div className="text-center text-[15px] font-semibold leading-snug">{f.n}</div>

          <div className="mt-4 flex items-baseline justify-center gap-2">
            <input
              ref={campo}
              type="text" inputMode="decimal" value={txt}
              onChange={e => setTxt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") confirmar(); }}
              aria-label={`Peso em ${un}`}
              className="num w-32 border-b-2 border-line bg-transparent pb-1 text-center text-[34px] font-semibold outline-none focus:border-carb"
            />
            <span className="num text-[15px] text-dim">{un}</span>
          </div>

          <div className="mt-3 text-center">
            {cs && <div className="num text-[13px] font-semibold">{cs}</div>}
            <div className="num mt-1 text-[11.5px] text-ink2">
              {r0(s.kcal)} kcal · P <b className="text-prot">{r1(s.p)}</b> · C <b className="text-carb">{r1(s.c)}</b> · G <b className="text-fat">{r1(s.g)}</b>
            </div>
          </div>

          <div className="mt-4 flex gap-1.5">
            {[-25, -10, +10, +25].map(d => (
              <button
                key={d}
                onClick={() => setTxt(String(Math.max(1, Math.round(q + d))))}
                className="num flex-1 rounded-lg border border-line py-2 text-[12px] font-medium text-ink2 active:bg-surf2"
              >{d > 0 ? `+${d}` : d}</button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={onFechar} className="btn btn-gh flex-1">Cancelar</button>
            <button onClick={confirmar} disabled={!(q > 0)} className="btn flex-1 disabled:opacity-35">Confirmar</button>
          </div>
        </div>
      </div>
    </>
  );
}
