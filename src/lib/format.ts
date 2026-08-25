import type { Food } from "./types";

/** Inteiro. */
export const r0 = (n: number) => Math.round(n);

/** Uma casa decimal, vírgula, sem ",0" pendurado. 12.04 -> "12"; 12.36 -> "12,4" */
export const r1 = (n: number) =>
  (Math.round(n * 10) / 10).toFixed(1).replace(".", ",").replace(",0", "");

/** Sempre com uma casa: 91 -> "91,0" */
export const kgf = (n: number) => n.toFixed(1).replace(".", ",");

/** Milhar com ponto, à brasileira. */
export const mil = (n: number) => Math.round(n).toLocaleString("pt-BR");

export const sinal = (n: number) => (n > 0 ? "+" : "") + kgf(n);

/** Aceita vírgula na digitação. */
export const numBR = (s: string) => parseFloat(String(s).replace(",", "."));

const DIA = 864e5;

export const iso = (d: Date) => {
  const z = new Date(d);
  z.setMinutes(z.getMinutes() - z.getTimezoneOffset());
  return z.toISOString().slice(0, 10);
};

export const deIso = (s: string) => {
  const [a, b, c] = s.split("-").map(Number);
  return new Date(a, b - 1, c);
};

export const hoje = () => iso(new Date());
export const somaDias = (d: string, n: number) => iso(new Date(deIso(d).getTime() + n * DIA));

export function rotuloData(d: string): string {
  if (d === hoje()) return "Hoje";
  if (d === somaDias(hoje(), -1)) return "Ontem";
  return deIso(d)
    .toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    .replace(/\./g, "");
}

const FRACAO: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

/**
 * Converte gramas em medida caseira legível.
 * 40 g de whey (dosador de 30 g) -> "1 ¼ dosadores"
 */
export function caseira(f: Food, q: number): string | null {
  if (!f.md || !f.mp) return null;
  const r = Math.round((q / f.mp) * 4) / 4;
  if (r < 0.25 || r > 40) return null;
  const inteiro = Math.floor(r);
  const fr = r - inteiro;
  const txt = (inteiro ? String(inteiro) : "") + (fr ? (inteiro ? " " : "") + FRACAO[fr] : "");
  const medida = r > 1 && f.mdp ? f.mdp : f.md;
  return `${txt} ${medida}`;
}

/** Etiqueta de procedência do número. Nunca inventamos valor nutricional. */
export function procedencia(f: Food): { txt: string; cls: string; fonte: string } {
  if (f.src === "taco")
    return { txt: "TACO", cls: "tag-taco",
      fonte: "Fonte: TACO — Tabela Brasileira de Composição de Alimentos, NEPA/Unicamp, 4ª edição." };
  if (f.ok)
    return { txt: "RÓTULO", cls: "tag-rotulo", fonte: "Valores do rótulo do fabricante, cadastrados por você." };
  return { txt: "ESTIM.", cls: "tag-estim", fonte: "Valores estimados por você — confira no rótulo quando puder." };
}
