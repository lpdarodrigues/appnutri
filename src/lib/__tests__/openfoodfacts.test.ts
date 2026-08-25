import { describe, it, expect } from "vitest";
import { mapear } from "../openfoodfacts";

const cru = (over: Record<string, unknown> = {}) => ({
  code: "7891000100103",
  product_name: "Macarrão Com Ovos Espaguete Barilla",
  brands: "BARILLA",
  serving_size: "80 g",
  categories_tags: ["en:pastas", "en:noodles"],
  nutriments: {
    "energy-kcal_100g": 355, proteins_100g: 12.5, carbohydrates_100g: 73.75,
    fat_100g: 1.375, fiber_100g: 2.125, sodium_100g: 0.005,
  },
  ...over,
});

describe("conversão do produto", () => {
  const p = mapear(cru())!;

  it("traz nome, marca e macros arredondados", () => {
    expect(p.nome).toBe("Macarrão Com Ovos Espaguete Barilla");
    expect(p.marca).toBe("BARILLA");
    expect(p.kcal).toBe(355);
    expect(p.p).toBe(12.5);
    expect(p.c).toBe(73.8);
    expect(p.g).toBe(1.4);
  });

  it("converte sódio de gramas para miligramas", () => {
    expect(p.na).toBe(5);
  });

  it("deduz a família pela categoria, para o motor de substituição", () => {
    expect(p.gr).toBe("carbo");
  });

  it("aproveita a porção declarada como medida caseira", () => {
    expect(p.mp).toBe(80);
  });

  it("não levanta aviso quando as calorias fecham", () => {
    expect(p.aviso).toBeUndefined();
  });
});

describe("descarta o que é impossível", () => {
  it("margarina com 7220 kcal (erro de digitação real da base)", () => {
    expect(mapear(cru({ nutriments: { "energy-kcal_100g": 7220, fat_100g: 80 } }))).toBeNull();
  });

  it("macros somando mais de 100 g", () => {
    expect(mapear(cru({ nutriments: {
      "energy-kcal_100g": 400, proteins_100g: 50, carbohydrates_100g: 50, fat_100g: 30,
    } }))).toBeNull();
  });

  it("valor negativo", () => {
    expect(mapear(cru({ nutriments: { "energy-kcal_100g": 100, proteins_100g: -5 } }))).toBeNull();
  });

  it("sem calorias ou sem nome não serve", () => {
    expect(mapear(cru({ nutriments: {} }))).toBeNull();
    expect(mapear(cru({ product_name: "" }))).toBeNull();
  });
});

describe("avisa em vez de descartar quando a conta não fecha", () => {
  it("Nescau cadastrado com 86 kcal e macros de 380", () => {
    const p = mapear(cru({
      product_name: "Nescau",
      nutriments: {
        "energy-kcal_100g": 86, proteins_100g: 4, carbohydrates_100g: 80, fat_100g: 3,
      },
    }))!;
    expect(p).not.toBeNull();
    expect(p.aviso).toContain("não batem com os macros");
  });

  it("cerveja não é reprovada por engano — o álcool não entra nos macros", () => {
    // 147 kcal com poucos macros é correto; o aviso existe para o usuário decidir
    const p = mapear(cru({
      product_name: "Cerveja",
      nutriments: { "energy-kcal_100g": 147, proteins_100g: 1, carbohydrates_100g: 11, fat_100g: 0 },
    }))!;
    expect(p).not.toBeNull();
    expect(p.kcal).toBe(147);
  });
});

describe("famílias a partir da categoria", () => {
  const fam = (tags: string[]) => mapear(cru({ categories_tags: tags }))!.gr;

  it("mapeia as categorias mais comuns", () => {
    expect(fam(["en:cheeses"])).toBe("queijo");
    expect(fam(["en:yogurts"])).toBe("leite");
    expect(fam(["en:chickens"])).toBe("ave");
    expect(fam(["en:breads"])).toBe("pao");
    expect(fam(["en:chocolates"])).toBe("doce");
    expect(fam(["en:olive-oils"])).toBe("gord");
  });

  it("categoria desconhecida fica sem família — dá para buscar, não para substituir", () => {
    expect(fam(["en:algo-que-nao-existe"])).toBeNull();
    expect(fam([])).toBeNull();
  });
});

describe("sal convertido em sódio", () => {
  it("usa o sal quando não há sódio declarado", () => {
    const p = mapear(cru({ nutriments: {
      "energy-kcal_100g": 300, proteins_100g: 10, carbohydrates_100g: 60, fat_100g: 2, salt_100g: 1.25,
    } }))!;
    expect(p.na).toBe(500);
  });
});

describe("sólido ou líquido", () => {
  const un = (over: Record<string, unknown>) => mapear(cru(over))!.un;

  it("macarrão seco é grama, apesar da categoria genérica da base", () => {
    // "en:plant-based-foods-and-beverages" marca quase todo vegetal e já fez
    // macarrão aparecer como KCAL/100ML na tela
    expect(un({
      serving_size: "80g", quantity: "500g",
      categories_tags: ["en:plant-based-foods-and-beverages", "en:pastas", "en:spaghetti"],
    })).toBe("g");
  });

  it("refrigerante é mililitro", () => {
    expect(un({ serving_size: "350 ml", quantity: "350ml", categories_tags: ["en:sodas"] })).toBe("ml");
  });

  it("usa a categoria quando não há porção declarada", () => {
    expect(un({ serving_size: null, quantity: null, categories_tags: ["en:juices"] })).toBe("ml");
    expect(un({ serving_size: null, quantity: null, categories_tags: ["en:cheeses"] })).toBe("g");
  });

  it("sem nenhuma pista, assume grama", () => {
    expect(un({ serving_size: null, quantity: null, categories_tags: [] })).toBe("g");
  });
});
