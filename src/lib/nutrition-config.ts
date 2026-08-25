import type { Familia, Ancora } from "./types";
import comuns from "../data/alimentos-comuns.json";

/**
 * Cada família tem um macro de referência fixo. É o eixo da equivalência:
 * trocar whey por frango pergunta "quanto de frango dá a mesma proteína?",
 * nunca "o que custa as mesmas calorias?".
 */
export const ANC: Record<Familia, Ancora> = {
  carbo: "C", pao: "C", cereal: "C", legum: "C", fruta: "C", doce: "C",
  carne: "P", ave: "P", peixe: "P", ovo: "P", prot: "P", leite: "P", queijo: "P",
  gord: "G",
  horta: "V",
};

/** Quais famílias podem substituir quais. */
export const VIZ: Record<Familia, Familia[]> = {
  prot:   ["carne", "ave", "peixe", "ovo", "queijo", "prot"],
  carne:  ["carne", "ave", "peixe", "ovo", "prot"],
  ave:    ["ave", "carne", "peixe", "ovo", "prot"],
  peixe:  ["peixe", "ave", "carne", "ovo", "prot"],
  ovo:    ["ovo", "ave", "carne", "peixe", "prot"],
  carbo:  ["carbo", "pao", "cereal"],
  pao:    ["pao", "carbo", "cereal"],
  cereal: ["cereal", "carbo", "pao"],
  legum:  ["legum"],
  gord:   ["gord"],
  fruta:  ["fruta"],
  horta:  ["horta"],
  leite:  ["leite", "queijo"],
  queijo: ["queijo", "leite"],
  doce:   ["doce"],
};

export const GLBL: Record<Familia, string> = {
  carbo: "Acompanhamento de carboidrato",
  pao: "Pães e torradas",
  cereal: "Cereais e farináceos",
  legum: "Leguminosas",
  carne: "Carnes vermelhas",
  ave: "Aves",
  peixe: "Pescados",
  ovo: "Ovos",
  leite: "Leites e iogurtes",
  queijo: "Queijos",
  fruta: "Frutas",
  horta: "Vegetais",
  gord: "Gorduras boas",
  doce: "Coringa doce",
  prot: "Proteína concentrada",
};

/**
 * Itens de uso corrente. Sem esta lista o algoritmo sugere corvina e corimba
 * antes de frango — nutricionalmente equivalentes, praticamente inúteis.
 */
export const COMUM = new Set<string>(comuns as string[]);

/** Limite de distância entre perfis de macro. Proteína tolera mais. */
export const LIM_P = 0.55;
export const LIM_OUTROS = 0.42;

/** Penalidades de score. */
export const PEN_PREPARO = 0.04;
export const PEN_INCOMUM = 0.25;
