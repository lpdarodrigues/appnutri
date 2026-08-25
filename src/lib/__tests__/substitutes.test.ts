import { describe, it, expect } from "vitest";
import { substitutos, rootn } from "../substitutes";
import { catalogo, acharPorNome } from "../catalog";
import { COMUM } from "../nutrition-config";
import type { Food } from "../types";

/**
 * Whey de teste, definido aqui de propósito: o caso validado não pode depender
 * da dieta de exemplo que o app distribui, que pode mudar.
 * 40 g deste whey = 29,3 g de proteína — o mesmo do caso original.
 */
const WHEY: Food = {
  id: "u:teste-whey", n: "Whey (teste)", cat: "Meus rótulos", gr: "prot",
  kcal: 393.3, p: 73.3, c: 9.0, g: 6.7, fib: 2.3, na: 153,
  un: "g", md: "dosador", mp: 30, mdp: "dosadores", ok: true, src: "user",
};

const CAT = [WHEY, ...catalogo()];
const pega = (nome: string) => acharPorNome(CAT, nome);
const raizes = (list: { x: Food }[]) => list.map(o => rootn(o.x.n));
const nomes = (list: { x: Food }[]) => list.map(o => o.x.n);

describe("motor de substituição — âncora de macro", () => {
  it("ancora carboidrato em arroz e proteína em whey", () => {
    expect(substitutos(pega("Arroz, tipo 1, cozido"), 100, CAT).a).toBe("C");
    expect(substitutos(WHEY, 40, CAT).a).toBe("P");
    expect(substitutos(pega("Azeite, de oliva, extra virgem"), 10, CAT).a).toBe("G");
  });

  it("iguala o macro-âncora, não as calorias", () => {
    const R = substitutos(pega("Arroz, tipo 1, cozido"), 100, CAT, 12);
    // 100 g de arroz cozido = 28,1 g de carboidrato
    expect(R.base).toBeCloseTo(28.1, 1);
    for (const o of R.list) expect(o.x.c * o.q / 100).toBeCloseTo(R.base, 5);
  });

  it("whey 40 g pede a proteína equivalente (29,3 g)", () => {
    const R = substitutos(WHEY, 40, CAT, 12);
    expect(R.base).toBeCloseTo(29.32, 1);
    for (const o of R.list) expect(o.x.p * o.q / 100).toBeCloseTo(R.base, 5);
  });
});

describe("caso 1 — arroz cozido 100 g", () => {
  const R = substitutos(pega("Arroz, tipo 1, cozido"), 100, CAT, 12);

  it("sugere cará, batata inglesa, polenta, inhame e mandioca", () => {
    const r = raizes(R.list);
    for (const esperado of ["cará", "batata", "polenta", "inhame", "mandioca"]) {
      expect(r, `faltou "${esperado}" em: ${nomes(R.list).join(" | ")}`).toContain(esperado);
    }
  });

  it("NUNCA sugere gelatina em pó nem geleia", () => {
    const n = nomes(R.list).join(" | ").toLowerCase();
    expect(n).not.toContain("gelatina");
    expect(n).not.toContain("geléia");
    expect(n).not.toContain("geleia");
  });
});

describe("caso 2 — whey 40 g", () => {
  const R = substitutos(WHEY, 40, CAT, 12);

  it("sugere clara de ovo, atum fresco, merluza e frango", () => {
    const r = raizes(R.list);
    for (const esperado of ["ovo", "atum", "merluza", "frango"]) {
      expect(r, `faltou "${esperado}" em: ${nomes(R.list).join(" | ")}`).toContain(esperado);
    }
  });

  it("ordena por custo calórico entre as fontes de uso corrente", () => {
    // A clara é a fonte mais magra do dia a dia; o frango custa mais caloria
    // para a mesma proteína, então vem depois.
    const r = raizes(R.list);
    expect(r.indexOf("ovo")).toBeLessThan(r.indexOf("frango"));
    expect(r.indexOf("merluza")).toBeLessThan(r.indexOf("frango"));
  });

  it("a lista sai ordenada por score", () => {
    const sc = R.list.map(o => o.sc);
    expect(sc).toEqual([...sc].sort((a, b) => a - b));
  });

  it("a penalidade de uso corrente mantém peixes exóticos fora do topo", () => {
    // Sem o +0,25 o algoritmo sugere corvina e corimba antes de frango.
    for (const o of R.list.slice(0, 6)) {
      expect(COMUM.has(rootn(o.x.n)), `"${o.x.n}" não é de uso corrente`).toBe(true);
    }
  });
});

describe("caso 3 — azeite 10 g", () => {
  const R = substitutos(pega("Azeite, de oliva, extra virgem"), 10, CAT, 12);

  it("sugere óleo de canola, castanha-do-Brasil e nozes", () => {
    const r = raizes(R.list);
    for (const esperado of ["óleo", "castanha-do-brasil", "noz"]) {
      expect(r, `faltou "${esperado}" em: ${nomes(R.list).join(" | ")}`).toContain(esperado);
    }
  });

  it("NUNCA sugere margarina nem banha", () => {
    const n = nomes(R.list).join(" | ").toLowerCase();
    expect(n).not.toContain("margarina");
    expect(n).not.toContain("banha");
  });
});

describe("caso 4 — feijão carioca 90 g", () => {
  const R = substitutos(pega("Feijão, carioca, cozido"), 90, CAT, 12);

  it("sugere lentilha, ervilha e grão-de-bico", () => {
    const r = raizes(R.list);
    for (const esperado of ["lentilha", "ervilha", "grão-de-bico"]) {
      expect(r, `faltou "${esperado}" em: ${nomes(R.list).join(" | ")}`).toContain(esperado);
    }
  });

  it("leguminosa só troca com leguminosa", () => {
    for (const o of R.list) expect(o.x.gr).toBe("legum");
  });
});

describe("caso 5 — famílias fechadas", () => {
  it("fruta só sugere fruta", () => {
    const R = substitutos(pega("Banana, prata, crua"), 100, CAT, 12);
    expect(R.list.length).toBeGreaterThan(0);
    for (const o of R.list) expect(o.x.gr).toBe("fruta");
  });

  it("vegetal só sugere vegetal", () => {
    const R = substitutos(pega("Brócolis, cozido"), 100, CAT, 12);
    expect(R.list.length).toBeGreaterThan(0);
    for (const o of R.list) expect(o.x.gr).toBe("horta");
  });

  it("proteína animal não vira carboidrato", () => {
    const R = substitutos(pega("Frango, peito, sem pele, grelhado"), 150, CAT, 12);
    expect(R.list.length).toBeGreaterThan(0);
    for (const o of R.list) {
      expect(["carne", "ave", "peixe", "ovo", "prot"]).toContain(o.x.gr);
    }
  });
});

describe("higiene do resultado", () => {
  it("não repete o mesmo alimento em preparos diferentes", () => {
    const r = raizes(substitutos(pega("Arroz, tipo 1, cozido"), 100, CAT, 12).list);
    expect(new Set(r).size).toBe(r.length);
  });

  it("nunca devolve o próprio alimento", () => {
    const arroz = pega("Arroz, tipo 1, cozido");
    expect(substitutos(arroz, 100, CAT, 12).list.map(o => o.x.id)).not.toContain(arroz.id);
  });

  it("mantém as quantidades numa faixa praticável (4 a 450 g)", () => {
    for (const alvo of [pega("Arroz, tipo 1, cozido"), WHEY, pega("Feijão, carioca, cozido")]) {
      for (const o of substitutos(alvo, 100, CAT, 12).list) {
        expect(o.q).toBeGreaterThanOrEqual(4);
        expect(o.q).toBeLessThanOrEqual(450);
      }
    }
  });

  it("alimento sem família não gera substitutos", () => {
    const R = substitutos(pega("Gelatina, sabores variados, pó"), 20, CAT);
    expect(R.a).toBeNull();
    expect(R.list).toHaveLength(0);
  });
});
