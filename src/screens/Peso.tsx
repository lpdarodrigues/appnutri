import { useState } from "react";
import { useStore } from "../lib/store";
import { Lista, Linha, Vazio } from "../components/ui";
import { GraficoPeso } from "../components/GraficoPeso";
import { ordenar, tendencia, ritmoSemanal, variacao7, variacaoTotal, pesoTendencia, alerta } from "../lib/weight";
import { kgf, sinal, numBR, hoje, deIso } from "../lib/format";

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
  const nTend = tendencia(st.weights).length;

  const registrar = () => {
    const v = numBR(kg);
    if (!data || !v || v < 40 || v > 250) return;
    st.salvarPeso({ d: data, kg: Math.round(v * 10) / 10 });
    setKg("");
  };

  const CLASSE = { alerta: "note note-al", bom: "note note-gd", neutro: "note" } as const;

  return (
    <div className="px-4 pb-4" style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}>
      <div className="hero px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="num text-[8.5px] tracking-[0.12em] text-white/45">PESO DE TENDÊNCIA</div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <b className="num text-[34px] font-semibold leading-none tracking-tight">{agora !== null ? kgf(agora) : "—"}</b>
              <span className="num text-[10px] text-white/45">KG</span>
            </div>
            <div className="num mt-1 text-[9.5px] text-white/45">média móvel de 7 dias</div>
          </div>

          <div className="text-right">
            <div className="num text-[8.5px] tracking-[0.12em] text-white/45">RITMO SEMANAL</div>
            <div className="mt-1.5 flex items-baseline justify-end gap-1.5">
              <b className="num text-[34px] font-semibold leading-none tracking-tight"
                style={{ color: ritmo === null ? "#fff" : ritmo < 0 ? "var(--color-prot-lt)" : "#E88B7B" }}>
                {ritmo !== null ? sinal(ritmo) : "—"}
              </b>
            </div>
            <div className="num mt-1 text-[9.5px] text-white/45">
              {ritmo !== null ? "kg/sem · regressão 28 dias" : "mín. 4 registros"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t border-white/10 pt-3">
          {([
            ["7 DIAS", v7 !== null ? sinal(v7) : "—"],
            ["DESDE O INÍCIO", vt !== null ? sinal(vt) : "—"],
            ["REGISTROS", String(w.length)],
          ] as const).map(([rot, val]) => (
            <div key={rot}>
              <div className="num text-[8px] tracking-[0.12em] text-white/35">{rot}</div>
              <div className="num mt-1 text-[14px] font-semibold">{val}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="sh">Registrar pesagem</p>
      <div className="card px-4 py-3.5">
        <div className="flex items-end gap-3">
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
      </div>

      <p className="sh">Evolução</p>
      <GraficoPeso weights={st.weights} />

      {al && <div className={`mt-3 ${CLASSE[al.nivel]}`}><b>{al.titulo}</b> {al.texto}</div>}

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

      {nTend > 0 && nTend < 7 && (
        <div className="note mt-3">
          <b>A média de 7 dias ainda está se formando.</b> Com menos de uma semana de
          registros ela acompanha demais o ruído do dia — peso de água, intestino, sal.
          O ritmo semanal só aparece a partir de 4 registros.
        </div>
      )}
    </div>
  );
}
