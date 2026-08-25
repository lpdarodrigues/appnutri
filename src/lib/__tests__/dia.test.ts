import { describe, it, expect } from "vitest";
import { linhaParaDia, type DiaRow } from "../db";
import type { Meal } from "../types";

const REFEICOES: Meal[] = [
  { n: "Café da manhã", h: "07:30", items: [{ f: "t:485", q: 100 }] },
];

describe("leitura do dia gravado", () => {
  it("preserva as refeições ajustadas do dia", () => {
    const linha: DiaRow = { d: "2026-08-25", diet: "d:base", done: [0], meals: REFEICOES };
    const rec = linhaParaDia(linha);
    expect(rec.meals).toEqual(REFEICOES);
    expect(rec.diet).toBe("d:base");
    expect(rec.done).toEqual([0]);
  });

  it("dia sem ajuste continua sem refeições próprias — segue o plano", () => {
    const rec = linhaParaDia({ d: "2026-08-25", diet: "d:base", done: [] });
    expect(rec.meals).toBeUndefined();
  });

  it("não deixa a chave da data vazar para dentro do registro", () => {
    expect(Object.keys(linhaParaDia({ d: "2026-08-25", diet: "d:base", done: [] }))).not.toContain("d");
  });

  it("preserva campos futuros sem precisar ser alterada", () => {
    const linha = { d: "2026-08-25", diet: "d:base", done: [], anotacao: "treino pesado" } as DiaRow;
    expect(linhaParaDia(linha)).toHaveProperty("anotacao", "treino pesado");
  });
});
