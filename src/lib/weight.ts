import type { WeightEntry } from "./types";

const DIA = 864e5;
const ts = (d: string) => { const [a, b, c] = d.split("-").map(Number); return new Date(a, b - 1, c).getTime(); };

export const ordenar = (w: WeightEntry[]) => [...w].sort((a, b) => (a.d < b.d ? -1 : 1));

export interface PontoTendencia { d: string; v: number }

/** Média móvel de 7 dias sobre os pesos brutos (janela para trás, inclusiva). */
export function tendencia(weights: WeightEntry[]): PontoTendencia[] {
  const w = ordenar(weights);
  return w.map(p => {
    const t = ts(p.d);
    const janela = w.filter(q => { const dd = (t - ts(q.d)) / DIA; return dd >= 0 && dd < 7; });
    return { d: p.d, v: janela.reduce((a, q) => a + q.kg, 0) / janela.length };
  });
}

/**
 * Taxa semanal por regressão linear sobre os últimos 28 dias da TENDÊNCIA
 * (não dos pesos brutos). Negativo = perdendo peso. Null se faltam dados.
 */
export function ritmoSemanal(weights: WeightEntry[]): number | null {
  const t = tendencia(weights);
  if (t.length < 4) return null;
  const ultimo = ts(t[t.length - 1].d);
  const pts = t
    .filter(p => (ultimo - ts(p.d)) / DIA <= 28)
    .map(p => [(ts(p.d) - ultimo) / DIA, p.v] as [number, number]);
  if (pts.length < 4) return null;
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p[0], 0);
  const sy = pts.reduce((a, p) => a + p[1], 0);
  const sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
  const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0);
  const den = n * sxx - sx * sx;
  return den ? ((n * sxy - sx * sy) / den) * 7 : null;
}

/** Variação da tendência nos últimos 7 dias. */
export function variacao7(weights: WeightEntry[]): number | null {
  const t = tendencia(weights);
  if (t.length < 2) return null;
  const ultimo = ts(t[t.length - 1].d);
  const agora = t[t.length - 1].v;
  const anterior = [...t].reverse().find(p => (ultimo - ts(p.d)) / DIA >= 7);
  return anterior ? agora - anterior.v : null;
}

/** Variação da tendência desde o primeiro registro. */
export function variacaoTotal(weights: WeightEntry[]): number | null {
  const t = tendencia(weights);
  return t.length > 1 ? t[t.length - 1].v - t[0].v : null;
}

export const pesoTendencia = (weights: WeightEntry[]): number | null => {
  const t = tendencia(weights);
  return t.length ? t[t.length - 1].v : null;
};

export type NivelAlerta = "alerta" | "bom" | "neutro";
export interface Alerta { nivel: NivelAlerta; titulo: string; texto: string }

/**
 * Faixas de orientação clínica. Os limiares (1,2 e 0,55 kg/semana) e os textos
 * são deliberados — não são copy, são orientação. Não alterar sem motivo clínico.
 */
export function alerta(ritmo: number | null): Alerta | null {
  if (ritmo === null) return null;
  const abs = Math.abs(ritmo).toFixed(1).replace(".", ",");
  if (ritmo < -1.2)
    return { nivel: "alerta", titulo: "Ritmo acima do recomendado.",
      texto: `${abs} kg/semana. Acima de 1,2 kg/sem sustentado, a chance de perder massa magra junto sobe muito. Se persistir por duas semanas, suba a dieta para 1.850–1.900 kcal.` };
  if (ritmo < -0.55)
    return { nivel: "bom", titulo: "Faixa ideal.",
      texto: `${abs} kg/semana — rápido para ver resultado, lento para preservar músculo. Não mexa em nada.` };
  if (ritmo < 0)
    return { nivel: "neutro", titulo: "Lento, mas na direção certa.",
      texto: "Antes de cortar calorias, confira a aderência no Diário e o padrão de fim de semana." };
  return { nivel: "alerta", titulo: "A tendência parou de cair.",
    texto: "Verifique aderência dos últimos 14 dias, se as carnes estão sendo pesadas cruas, e os fins de semana." };
}
