import Dexie, { type Table } from "dexie";
import type { Food, Diet, DayRec, WeightEntry, Ajustes } from "./types";
import { SEED_FOODS, SEED_DIET } from "./catalog";

export interface DiaRow extends DayRec { d: string }
export interface ConfigRow { chave: string; valor: unknown }

export const AJUSTES_PADRAO: Ajustes = {
  pesoRef: 91, metaKcal: null, metaP: null, metaC: null, metaG: null,
};

class NutriDB extends Dexie {
  foods!: Table<Food, string>;
  diets!: Table<Diet, string>;
  days!: Table<DiaRow, string>;
  weights!: Table<WeightEntry, string>;
  config!: Table<ConfigRow, string>;

  constructor() {
    super("appnutri");
    this.version(1).stores({
      foods: "id, n",
      diets: "id",
      days: "d",
      weights: "d",
      config: "chave",
    });
  }
}

export const db = new NutriDB();

/** Na primeira abertura, planta a dieta de exemplo. */
export async function semear() {
  if (await db.config.get("semeado")) return;
  await db.transaction("rw", db.foods, db.diets, db.config, async () => {
    await db.foods.bulkPut(SEED_FOODS);
    await db.diets.put(structuredClone(SEED_DIET));
    await db.config.put({ chave: "semeado", valor: true });
  });
}

export async function lerAjustes(): Promise<Ajustes> {
  const row = await db.config.get("ajustes");
  return { ...AJUSTES_PADRAO, ...((row?.valor as Partial<Ajustes>) ?? {}) };
}

export const gravarAjustes = (a: Ajustes) => db.config.put({ chave: "ajustes", valor: a });

/** Backup manual: tudo em um JSON. Não há nuvem, então isto é o backup. */
export async function exportar(): Promise<string> {
  const [foods, diets, days, weights, ajustes] = await Promise.all([
    db.foods.toArray(), db.diets.toArray(), db.days.toArray(),
    db.weights.toArray(), lerAjustes(),
  ]);
  return JSON.stringify(
    { app: "appnutri", versao: 1, exportadoEm: new Date().toISOString(), foods, diets, days, weights, ajustes },
    null, 2,
  );
}

export async function importar(texto: string) {
  const d = JSON.parse(texto);
  if (d?.app !== "appnutri") throw new Error("Este arquivo não é um backup do Nutri.");
  await db.transaction("rw", db.foods, db.diets, db.days, db.weights, db.config, async () => {
    await Promise.all([db.foods.clear(), db.diets.clear(), db.days.clear(), db.weights.clear()]);
    if (d.foods?.length) await db.foods.bulkPut(d.foods);
    if (d.diets?.length) await db.diets.bulkPut(d.diets);
    if (d.days?.length) await db.days.bulkPut(d.days);
    if (d.weights?.length) await db.weights.bulkPut(d.weights);
    if (d.ajustes) await db.config.put({ chave: "ajustes", valor: d.ajustes });
    await db.config.put({ chave: "semeado", valor: true });
  });
}

/**
 * Converte a linha do banco no registro do dia.
 *
 * Existe como função separada porque listar campo a campo aqui já causou perda
 * silenciosa dos ajustes do dia: gravava certo, relia errado, e o usuário só
 * descobria ao reabrir o app. Tudo que não é a chave `d` faz parte do registro.
 */
export const linhaParaDia = ({ d: _chave, ...resto }: DiaRow): DayRec => resto;

export const uid = () => Math.random().toString(36).slice(2, 9);
