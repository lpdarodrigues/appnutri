import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Food, Diet, DayRec, WeightEntry, Ajustes, Macros, Meal } from "./types";
import { db, semear, lerAjustes, gravarAjustes } from "./db";
import { TACO } from "./catalog";
import { escala } from "./substitutes";

interface Estado {
  foods: Food[];
  diets: Diet[];
  days: Record<string, DayRec>;
  weights: WeightEntry[];
  ajustes: Ajustes;
  pronto: boolean;
}

const VAZIO: Estado = { foods: [], diets: [], days: {}, weights: [], ajustes: { pesoRef: 91, metaKcal: null, metaP: null, metaC: null, metaG: null }, pronto: false };

interface Ctx extends Estado {
  catalogo: Food[];
  food: (id: string) => Food | null;
  dia: (d: string) => DayRec;
  dieta: (id: string | undefined) => Diet | undefined;
  totaisRefeicao: (m: Meal) => Macros;
  totaisDieta: (d: Diet) => Macros;
  recarregar: () => Promise<void>;
  setDia: (d: string, rec: DayRec) => Promise<void>;
  salvarDieta: (d: Diet) => Promise<void>;
  apagarDieta: (id: string) => Promise<void>;
  salvarAlimento: (f: Food) => Promise<void>;
  apagarAlimento: (id: string) => Promise<void>;
  salvarPeso: (p: WeightEntry) => Promise<void>;
  apagarPeso: (d: string) => Promise<void>;
  salvarAjustes: (a: Ajustes) => Promise<void>;
}

const C = createContext<Ctx | null>(null);

export const ZERO: Macros = { kcal: 0, p: 0, c: 0, g: 0, fib: 0 };
const soma = (a: Macros, b: Macros): Macros => ({
  kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, g: a.g + b.g, fib: a.fib + b.fib,
});

export function Store({ children }: { children: ReactNode }) {
  const [e, setE] = useState<Estado>(VAZIO);

  const recarregar = async () => {
    const [foods, diets, dias, weights, ajustes] = await Promise.all([
      db.foods.toArray(), db.diets.toArray(), db.days.toArray(),
      db.weights.toArray(), lerAjustes(),
    ]);
    const days: Record<string, DayRec> = {};
    for (const r of dias) days[r.d] = { diet: r.diet, done: r.done };
    setE({ foods, diets, days, weights, ajustes, pronto: true });
  };

  useEffect(() => { semear().then(recarregar); }, []);

  // Catálogo: cadastrados primeiro, TACO depois. Memorizado — são 597 itens.
  const catalogo = useMemo(() => [...e.foods, ...TACO], [e.foods]);
  const indice = useMemo(() => {
    const m = new Map<string, Food>();
    for (const f of catalogo) m.set(f.id, f);
    return m;
  }, [catalogo]);

  const food = (id: string) => indice.get(id) ?? null;

  const totaisRefeicao = (m: Meal): Macros =>
    (m.items ?? []).reduce((a, it) => {
      const f = food(it.f);
      return f ? soma(a, escala(f, it.q)) : a;
    }, ZERO);

  const totaisDieta = (d: Diet): Macros =>
    (d.meals ?? []).reduce((a, m) => soma(a, totaisRefeicao(m)), ZERO);

  const dia = (d: string): DayRec =>
    e.days[d] ?? { diet: e.diets[0]?.id ?? "", done: [] };

  const dieta = (id: string | undefined) => e.diets.find(d => d.id === id) ?? e.diets[0];

  const ctx: Ctx = {
    ...e, catalogo, food, dia, dieta, totaisRefeicao, totaisDieta, recarregar,
    setDia: async (d, rec) => {
      await db.days.put({ d, ...rec });
      setE(s => ({ ...s, days: { ...s.days, [d]: rec } }));
    },
    salvarDieta: async d => {
      await db.diets.put(d);
      setE(s => ({ ...s, diets: s.diets.some(x => x.id === d.id) ? s.diets.map(x => (x.id === d.id ? d : x)) : [...s.diets, d] }));
    },
    apagarDieta: async id => {
      await db.diets.delete(id);
      setE(s => ({ ...s, diets: s.diets.filter(d => d.id !== id) }));
    },
    salvarAlimento: async f => {
      await db.foods.put(f);
      setE(s => ({ ...s, foods: s.foods.some(x => x.id === f.id) ? s.foods.map(x => (x.id === f.id ? f : x)) : [f, ...s.foods] }));
    },
    apagarAlimento: async id => {
      await db.foods.delete(id);
      setE(s => ({ ...s, foods: s.foods.filter(f => f.id !== id) }));
    },
    salvarPeso: async p => {
      await db.weights.put(p);
      setE(s => ({ ...s, weights: [...s.weights.filter(x => x.d !== p.d), p] }));
    },
    apagarPeso: async d => {
      await db.weights.delete(d);
      setE(s => ({ ...s, weights: s.weights.filter(x => x.d !== d) }));
    },
    salvarAjustes: async a => {
      await gravarAjustes(a);
      setE(s => ({ ...s, ajustes: a }));
    },
  };

  return <C.Provider value={ctx}>{children}</C.Provider>;
}

export function useStore() {
  const c = useContext(C);
  if (!c) throw new Error("useStore fora do Store");
  return c;
}
