import type { Food, Ancora, Macros } from "./types";
import { ANC, VIZ, COMUM, LIM_P, LIM_OUTROS, PEN_PREPARO, PEN_INCOMUM } from "./nutrition-config";

/** Proporção calórica dos três macros. Null quando o alimento não tem energia. */
export function prof(f: Pick<Food, "p" | "c" | "g">): { P: number; C: number; G: number } | null {
  const P = f.p * 4, C = f.c * 4, G = f.g * 9, T = P + C + G;
  return T <= 0 ? null : { P: P / T, C: C / T, G: G / T };
}

export function anchor(f: Pick<Food, "p" | "c" | "g" | "gr">): Ancora | null {
  if (!prof(f)) return null;
  return f.gr ? ANC[f.gr] ?? null : null;
}

/** Raiz do nome: "Arroz, tipo 1, cozido" -> "arroz". Usada para deduplicar. */
export const rootn = (n: string) => n.split(",")[0].trim().toLowerCase();

/** Classifica o preparo, para preferir cru↔cru e cozido↔cozido. */
export const prepn = (n: string): "pronto" | "cru" | "n" =>
  /cozid|assad|grelhad|refogad|frit|milanesa|torrad/i.test(n) ? "pronto"
  : /\bcru|\bcrua|fresc/i.test(n) ? "cru"
  : "n";

const CAMPO: Record<Ancora, "p" | "c" | "g" | "kcal"> = { P: "p", C: "c", G: "g", V: "kcal" };

export interface Substituto {
  x: Food;
  /** gramas do substituto que igualam o macro-âncora */
  q: number;
  /** distância euclidiana entre perfis de macro */
  d: number;
  kcal: number; p: number; c: number; g: number;
  /** diferença calórica em relação ao item original */
  dk: number;
  sc: number;
}

export interface ResultadoSubs {
  a: Ancora | null;
  /** quantidade do macro-âncora que precisa ser igualada */
  base: number;
  /** calorias do item original */
  kb: number;
  list: Substituto[];
}

/**
 * Encontra substitutos igualando o MACRO-ÂNCORA da família, nunca as calorias.
 *
 * @param f        alimento a substituir
 * @param qtd      quantidade atual, em gramas
 * @param catalogo universo de alimentos candidatos (TACO + cadastrados)
 * @param n        quantas opções retornar
 */
export function substitutos(f: Food, qtd: number, catalogo: Food[], n = 10): ResultadoSubs {
  const a = anchor(f);
  const pf = prof(f);
  if (!a || !pf || !f.gr) return { a: null, base: 0, kb: 0, list: [] };

  const mk = CAMPO[a];
  const base = f[mk] * qtd / 100;
  const kb = f.kcal * qtd / 100;
  const pp = prepn(f.n);
  const vizinhas = VIZ[f.gr] ?? [f.gr];
  const lim = a === "P" ? LIM_P : LIM_OUTROS;

  const candidatos = catalogo
    .filter(x =>
      x.id !== f.id &&
      x.gr !== null &&
      vizinhas.includes(x.gr) &&
      x.kcal > 5 &&
      x[mk] > 0.3 &&
      anchor(x) === a)
    .map(x => {
      const q = base / x[mk] * 100;
      const px = prof(x)!;
      return {
        x, q,
        d: Math.hypot(px.P - pf.P, px.C - pf.C, px.G - pf.G),
        kcal: x.kcal * q / 100,
        p: x.p * q / 100,
        c: x.c * q / 100,
        g: x.g * q / 100,
      };
    })
    .filter(o => o.q >= 4 && o.q <= 450 && o.d < lim);

  // Deduplica por raiz do nome, guardando a melhor variante de cada alimento.
  const best: Record<string, Substituto> = {};
  for (const o of candidatos) {
    const r = rootn(o.x.n);
    // Proteína ordena por custo calórico (fonte mais magra primeiro).
    // Carboidrato e gordura ordenam por semelhança de perfil.
    const core = a === "P" ? o.kcal / kb : o.d;
    const sc = core
      + (prepn(o.x.n) === pp ? 0 : PEN_PREPARO)
      + (COMUM.has(r) ? 0 : PEN_INCOMUM);
    if (!best[r] || sc < best[r].sc) best[r] = { ...o, sc, dk: o.kcal - kb };
  }

  return {
    a, base, kb,
    list: Object.values(best).sort((A, B) => A.sc - B.sc).slice(0, n),
  };
}

/** Rótulos usados na interface para explicar a âncora. */
export const NOME_ANCORA: Record<Ancora, string> = {
  P: "proteína", C: "carboidrato", G: "gordura", V: "volume",
};
export const REF_ANCORA: Record<Ancora, string> = {
  P: "a proteína", C: "o carboidrato", G: "a gordura", V: "as calorias",
};

/** Com a preposição já concordada — proteína e gordura são femininas. */
export const EM_ANCORA: Record<Ancora, string> = {
  P: "na proteína", C: "no carboidrato", G: "na gordura", V: "nas calorias",
};

export const escala = (f: Food, q: number): Macros => ({
  kcal: f.kcal * q / 100,
  p: f.p * q / 100,
  c: f.c * q / 100,
  g: f.g * q / 100,
  fib: (f.fib || 0) * q / 100,
});
