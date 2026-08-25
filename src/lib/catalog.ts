import type { Food, Diet } from "./types";
import taco from "../data/taco.json";
import seedAlimentos from "../data/seed-alimentos.json";
import seedDieta from "../data/seed-dieta.json";

export const TACO = taco as Food[];

export const SEED_FOODS: Food[] = (seedAlimentos as any[]).map(f => ({
  ...f, src: "user" as const, gr: f.gr ?? null, na: f.na ?? 0, fib: f.fib ?? 0,
}));

export const SEED_DIET = seedDieta as Diet;

/** Universo de busca e de substituição: cadastrados primeiro, TACO depois. */
export function catalogo(userFoods: Food[] = SEED_FOODS): Food[] {
  return [...userFoods, ...TACO];
}

import { norm } from "./busca";
export { norm };

export function acharPorNome(lista: Food[], trecho: string): Food {
  const q = norm(trecho);
  const f = lista.find(x => norm(x.n) === q) ?? lista.find(x => norm(x.n).includes(q));
  if (!f) throw new Error(`Alimento não encontrado no catálogo: "${trecho}"`);
  return f;
}
