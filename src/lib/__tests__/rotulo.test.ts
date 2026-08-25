import { describe, it, expect } from "vitest";
import { lerRotulo, medidaUnitaria } from "../rotulo";

/** Rótulo antigo: uma coluna só, por porção. */
const ANTIGO = `
INFORMAÇÃO NUTRICIONAL
Porção de 30 g (2 colheres de sopa)
                     Quantidade por porção   %VD(*)
Valor energético     117 kcal = 491 kJ       6%
Carboidratos         20 g                    7%
Proteínas            3,0 g                   4%
Gorduras totais      2,5 g                   5%
Gorduras saturadas   0,5 g                   2%
Gorduras trans       0 g                     **
Fibra alimentar      1,2 g                   5%
Sódio                95 mg                   4%
`;

/** Rótulo novo (RDC 429): duas colunas, 100 g primeiro. */
const NOVO = `
INFORMAÇÃO NUTRICIONAL
                          100 g      Porção de 25 g    %VD*
Valor energético          253 kcal   63 kcal           3%
Carboidratos totais       43,9 g     11 g              4%
Açúcares totais           3,1 g      0,8 g             2%
Proteínas                 9,4 g      2,4 g             5%
Gorduras totais           3,7 g      0,9 g             2%
Gorduras saturadas        0,7 g      0,2 g             1%
Fibra alimentar           6,9 g      1,7 g             7%
Sódio                     180 mg     45 mg             2%
`;

/** Duas colunas com a porção primeiro — ordem invertida. */
const INVERTIDO = `
INFORMAÇÃO NUTRICIONAL
                      Porção de 200 ml     100 ml
Valor energético      62 kcal              31 kcal
Carboidratos          9,6 g                4,8 g
Proteínas             6 g                  3 g
Gorduras totais       0 g                  0 g
Sódio                 100 mg               50 mg
`;

/** Reconhecimento em coluna: números caem em linhas separadas. */
const EM_COLUNA = `
INFORMAÇÃO NUTRICIONAL
Porção de 100 g
Valor energético
393 kcal
Carboidratos
9 g
Proteínas
73,3 g
Gorduras totais
6,7 g
Fibra alimentar
2,3 g
Sódio
153 mg
`;

describe("rótulo antigo — coluna única por porção", () => {
  const { campos, base, avisos } = lerRotulo(ANTIGO);

  it("converte a medida caseira para a unidade", () => {
    // o rótulo diz "2 colheres de sopa = 30 g"; o app precisa de 1 colher = 15 g
    expect(campos.md).toBe("colher de sopa");
    expect(campos.mp).toBe(15);
  });

  it("converte de 30 g para 100 g", () => {
    expect(base).toBe("porcao");
    expect(campos.kcal).toBe(390);          // 117 × 100/30
    expect(campos.c).toBeCloseTo(66.7, 0);  // 20 × 100/30
    expect(campos.p).toBe(10);              // 3,0 × 100/30
    expect(campos.g).toBeCloseTo(8.3, 0);   // 2,5 × 100/30
  });

  it("avisa que converteu", () => {
    expect(avisos.join(" ")).toContain("porção de 30 g");
  });

  it("NUNCA confunde kJ com kcal", () => {
    expect(campos.kcal).not.toBe(Math.round(491 * 100 / 30));
  });

  it("ignora o %VD", () => {
    expect(campos.c).not.toBe(7);
    expect(campos.p).not.toBe(4);
  });

  it("pega gorduras TOTAIS, não saturadas nem trans", () => {
    expect(campos.g).toBeCloseTo(8.3, 0);   // 2,5 e não 0,5 nem 0
  });
});

describe("rótulo novo — duas colunas, 100 g primeiro", () => {
  const { campos, base } = lerRotulo(NOVO);

  it("usa a coluna de 100 g sem converter", () => {
    expect(base).toBe("100g");
    expect(campos.kcal).toBe(253);
    expect(campos.c).toBe(43.9);
    expect(campos.p).toBe(9.4);
    expect(campos.g).toBe(3.7);
    expect(campos.fib).toBe(6.9);
    expect(campos.na).toBe(180);
  });

  it("não pega a coluna da porção por engano", () => {
    expect(campos.kcal).not.toBe(63);
    expect(campos.c).not.toBe(11);
  });

  it("não confunde açúcares com carboidratos totais", () => {
    expect(campos.c).toBe(43.9);
  });
});

describe("colunas invertidas — porção primeiro", () => {
  const { campos } = lerRotulo(INVERTIDO);

  it("descobre qual coluna é a de 100 pela proporção", () => {
    expect(campos.kcal).toBe(31);
    expect(campos.c).toBe(4.8);
    expect(campos.p).toBe(3);
    expect(campos.na).toBe(50);
  });

  it("reconhece que é líquido", () => {
    expect(campos.un).toBe("ml");
  });
});

describe("texto reconhecido em coluna", () => {
  const { campos } = lerRotulo(EM_COLUNA);

  it("junta o nutriente com o número da linha seguinte", () => {
    expect(campos.kcal).toBe(393);
    expect(campos.p).toBe(73.3);
    expect(campos.c).toBe(9);
    expect(campos.g).toBe(6.7);
    expect(campos.fib).toBe(2.3);
    expect(campos.na).toBe(153);
  });
});

describe("honestidade — nunca inventa", () => {
  it("texto que não é rótulo não vira alimento", () => {
    const { campos, avisos } = lerRotulo("Compre 2 leve 3! Promoção imperdível.");
    expect(campos.kcal).toBeUndefined();
    expect(campos.p).toBeUndefined();
    expect(avisos.join(" ")).toContain("Não reconheci nenhuma tabela");
  });

  it("tabela incompleta deixa em branco e avisa quais faltaram", () => {
    const { campos, avisos } = lerRotulo(`
      INFORMAÇÃO NUTRICIONAL
      Porção de 100 g
      Valor energético 200 kcal
      Carboidratos 10 g
    `);
    expect(campos.kcal).toBe(200);
    expect(campos.c).toBe(10);
    expect(campos.p).toBeUndefined();
    expect(campos.g).toBeUndefined();
    expect(avisos.join(" ")).toContain("proteínas");
    expect(avisos.join(" ")).toContain("gorduras totais");
  });

  it("avisa quando as calorias não batem com os macros", () => {
    const { avisos } = lerRotulo(`
      INFORMAÇÃO NUTRICIONAL
      Porção de 100 g
      Valor energético 90 kcal
      Carboidratos 40 g
      Proteínas 20 g
      Gorduras totais 15 g
    `);
    expect(avisos.join(" ")).toContain("não batem com os macros");
  });

  it("não reclama quando as calorias batem", () => {
    const { avisos } = lerRotulo(`
      INFORMAÇÃO NUTRICIONAL
      Porção de 100 g
      Valor energético 375 kcal
      Carboidratos 44 g
      Proteínas 20 g
      Gorduras totais 12 g
    `);
    expect(avisos.join(" ")).not.toContain("não batem");
  });

  it("aceita sódio declarado em gramas", () => {
    const { campos } = lerRotulo(`
      Porção de 100 g
      Valor energético 100 kcal
      Sódio 1,2 g
    `);
    expect(campos.na).toBe(1200);
  });
});

describe("medida caseira unitária", () => {
  it("divide a contagem e coloca no singular", () => {
    expect(medidaUnitaria("2 colheres de sopa", 30)).toEqual({ md: "colher de sopa", mp: 15 });
    expect(medidaUnitaria("4 fatias", 100)).toEqual({ md: "fatia", mp: 25 });
    expect(medidaUnitaria("3 unidades", 45)).toEqual({ md: "unidade", mp: 15 });
  });

  it("deixa quieto o que já está no singular", () => {
    expect(medidaUnitaria("copo", 200)).toEqual({ md: "copo", mp: 200 });
    expect(medidaUnitaria("1 dosador", 30)).toEqual({ md: "dosador", mp: 30 });
  });
});
