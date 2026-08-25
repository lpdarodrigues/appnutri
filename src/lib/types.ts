export type Familia =
  | "carbo" | "pao" | "cereal" | "legum"
  | "carne" | "ave" | "peixe" | "ovo" | "prot"
  | "leite" | "queijo" | "fruta" | "horta" | "gord" | "doce";

/** Macro de referência de uma família. V = volume (ancora por caloria). */
export type Ancora = "P" | "C" | "G" | "V";

/** Valores sempre por 100 g / 100 ml. */
export interface Food {
  id: string;
  n: string;
  cat: string;
  gr: Familia | null;
  kcal: number;
  p: number;
  c: number;
  g: number;
  fib: number;
  na: number;
  un: "g" | "ml";
  md?: string | null;
  mp?: number | null;
  mdp?: string | null;
  /** true = valores vindos de rótulo do fabricante; false/ausente = estimado */
  ok?: boolean;
  src: "taco" | "user";
}

export interface MealItem { f: string; q: number }
export interface Meal { n: string; h: string; items: MealItem[] }
export interface Diet { id: string; n: string; meals: Meal[] }
export interface DayRec { diet: string; done: number[] }
export interface WeightEntry { d: string; kg: number }

export interface Macros { kcal: number; p: number; c: number; g: number; fib: number }

export interface Ajustes {
  pesoRef: number;
  metaKcal: number | null;
  metaP: number | null;
  metaC: number | null;
  metaG: number | null;
}
