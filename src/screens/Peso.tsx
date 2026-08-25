import { useState } from "react";
import { useStore } from "../lib/store";
import { Lista, Linha, Stat, Vazio } from "../components/ui";
import { GraficoPeso } from "../components/GraficoPeso";
import { ordenar, tendencia, ritmoSemanal, variacao7, variacaoTotal, pesoTendencia, alerta } from "../lib/weight";
import { kgf, sinal, numBR, hoje, deIso } from "../lib/format";

const cor = (v: number) => (v < 0 ? "var(--color-prot)" : v > 0 ? "var(--color-warn)" : "var(--color-ink)");

export function Peso() {
  const st = useStore();
  const [data, setData] = useState(hoje());
  const [kg, setKg] = useState("");

  const w = ordenar(st.weights);
  const agora = pesoTendencia(st.weights);
  const ritmo = ritmoSemanal(st.weights);
  const v7 = variacao7(st.weights);
  const vt = variacaoTotal(st.weights);
  const al = alerta(ritmo);

  const registrar = () => {
    const v = numBR(kg);
    if (!data || !v || v < 40 || v > 250) return;
    st.salvarPeso({ d: data, kg: Math.round(v * 10) / 10 });
    setKg("");
  };

  const CLASSE = { alerta: "note note-al", bom: "note note-gd", neutro: "note" } as const;

  return (
    <div className="px-4 pb-4" style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}>
      <h2 className="text-[21px] font-semibold">Peso</h2>

      <div className="mt-3 flex items-end gap-3">
        <div className="fld flex-1">
          <label htmlFor="w-d">Data</label>
          <input id="w-d" type="date" value={data} max={hoje()} onChange={e => setData(e.target.value)} />
        </div>
        <div className="fld max-w-[104px]">
          <label htmlFor="w-k">Peso (kg)</label>
          <input id="w-k" className="num" type="text" inputMode="decimal" value={kg}
            onChange={e => setKg(e.target.value)} onKeyDown={e => e.key === "Enter" && registrar()} placeholder="91,0" />
        </div>
        <button onClick={registrar} className="btn btn-sm">Registrar</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat rotulo="Peso de tendência" valor={agora !== null ? kgf(agora) : "—"} sub={agora !== null ? "kg · média 7 dias" : "sem registro"} />
        <Stat rotulo="Ritmo semanal" valor={ritmo !== null ? sinal(ritmo) : "—"} cor={ritmo !== null ? cor(ritmo) : undefined}
          sub={ritmo !== null ? "kg/sem · regressão 28 dias" : "mín. 4 registros"} />
        <Stat rotulo="Variação 7 dias" valor={v7 !== null ? sinal(v7) : "—"} cor={v7 !== null ? cor(v7) : undefined} sub="kg na tendência" />
        <Stat rotulo="Desde o início" valor={vt !== null ? sinal(vt) : "—"} cor={vt !== null ? cor(vt) : undefined}
          sub={`${w.length} registro${w.length === 1 ? "" : "s"}`} />
      </div>

      <div className="mt-3"><GraficoPeso weights={st.weights} /></div>

      {al && (
        <div className={`mt-3 ${CLASSE[al.nivel]}`}>
          <b>{al.titulo}</b> {al.texto}
        </div>
      )}

      <p className="sh">Registros</p>
      {!w.length ? <Vazio>Nenhum peso registrado.</Vazio> : (
        <Lista>
          {[...w].reverse().map(p => (
            <Linha
              key={p.d} titulo={`${kgf(p.kg)} kg`}
              sub={deIso(p.d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              acao={<button onClick={() => st.apagarPeso(p.d)} aria-label={`Apagar registro de ${p.d}`} className="shrink-0 px-1 text-[17px] leading-none text-dim">×</button>}
            />
          ))}
        </Lista>
      )}

      {tendencia(st.weights).length > 0 && tendencia(st.weights).length < 7 && (
        <div className="note mt-3">
          <b>A média de 7 dias ainda está se formando.</b> Com menos de uma semana de
          registros ela acompanha demais o ruído do dia — peso de água, intestino, sal.
          O ritmo semanal só aparece a partir de 4 registros.
        </div>
      )}
    </div>
  );
}
