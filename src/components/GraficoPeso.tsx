import type { WeightEntry } from "../lib/types";
import { ordenar, tendencia } from "../lib/weight";
import { deIso } from "../lib/format";

const dt = (d: string) => deIso(d).getTime();

export function GraficoPeso({ weights }: { weights: WeightEntry[] }) {
  const w = ordenar(weights);
  const t = tendencia(weights);

  if (w.length < 2) {
    return (
      <div className="card empty">
        {w.length ? "Mais um registro e o gráfico aparece." : "Registre seu peso para acompanhar a tendência."}
      </div>
    );
  }

  const W = 340, H = 168, L = 34, R = 10, T = 12, B = 24;
  const t0 = dt(w[0].d), t1 = dt(w[w.length - 1].d);
  const span = Math.max(1, (t1 - t0) / 864e5);

  const vs = [...w.map(p => p.kg), ...t.map(p => p.v)];
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const pad = Math.max(0.6, (hi - lo) * 0.22);
  lo -= pad; hi += pad;

  const X = (d: string) => L + ((dt(d) - t0) / 864e5 / span) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);

  const fmt = (d: string) => deIso(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <div className="card px-3 py-3">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block" role="img"
        aria-label={`Evolução do peso de ${fmt(w[0].d)} a ${fmt(w[w.length - 1].d)}`}>
        {[0, 0.5, 1].map(f => {
          const v = lo + (hi - lo) * f, y = Y(v);
          return (
            <g key={f}>
              <line x1={L} y1={y.toFixed(1)} x2={W - R} y2={y.toFixed(1)} stroke="#E3E9EE" />
              <text x={L - 6} y={(y + 3.5).toFixed(1)} textAnchor="end" fontFamily="IBM Plex Mono" fontSize="8.5" fill="#8B99A7">
                {v.toFixed(1).replace(".", ",")}
              </text>
            </g>
          );
        })}
        {w.map(p => <circle key={p.d} cx={X(p.d).toFixed(1)} cy={Y(p.kg).toFixed(1)} r="2.4" fill="#2160A8" opacity=".55" />)}
        <path
          d={t.map((p, i) => `${i ? "L" : "M"}${X(p.d).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ")}
          fill="none" stroke="#0E151D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
        <text x={L} y={H - 7} fontFamily="IBM Plex Mono" fontSize="8.5" fill="#8B99A7">{fmt(w[0].d)}</text>
        <text x={W - R} y={H - 7} textAnchor="end" fontFamily="IBM Plex Mono" fontSize="8.5" fill="#8B99A7">{fmt(w[w.length - 1].d)}</text>
      </svg>
      <div className="num mt-1 flex justify-center gap-4 text-[8.5px] tracking-wider text-dim uppercase">
        <span className="flex items-center gap-1.5"><i className="h-[5px] w-[5px] rounded-full bg-carb opacity-60" />Peso do dia</span>
        <span className="flex items-center gap-1.5"><i className="h-[2px] w-3 rounded bg-ink" />Média móvel 7 dias</span>
      </div>
    </div>
  );
}
