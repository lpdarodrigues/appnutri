import { describe, it, expect } from "vitest";
import { buscar, palavras, combina } from "../busca";
import { TACO } from "../catalog";

const nomes = (q: string, n = 5) => buscar(TACO, q, n).map(f => f.n);
const acha = (q: string, trecho: string) =>
  buscar(TACO, q, 40).some(f => f.n.toLowerCase().includes(trecho.toLowerCase()));

describe("busca por palavras soltas", () => {
  it("acha apesar das vírgulas da TACO", () => {
    // "Arroz, integral, cozido" não contém o texto "arroz integral"
    expect(acha("arroz integral", "Arroz, integral")).toBe(true);
    expect(acha("batata doce", "Batata, doce")).toBe(true);
    expect(acha("feijão preto", "Feijão, preto")).toBe(true);
    expect(acha("leite desnatado", "desnatado")).toBe(true);
  });

  it("aceita as palavras em qualquer ordem", () => {
    expect(acha("cozido arroz", "Arroz")).toBe(true);
    expect(acha("integral arroz cozido", "Arroz, integral, cozido")).toBe(true);
  });

  it("ignora palavras de ligação", () => {
    expect(palavras("peito de frango")).toEqual(["peito", "frango"]);
    expect(acha("peito de frango", "Frango, peito")).toBe(true);
    expect(acha("filé de merluza", "Merluza, filé")).toBe(true);
  });

  it("tolera plural e gênero", () => {
    expect(acha("carne moída", "moído")).toBe(true);
    expect(acha("batatas cozidas", "Batata")).toBe(true);
    expect(acha("ovo cozido", "Ovo")).toBe(true);
  });

  it("ignora acento", () => {
    expect(acha("feijao", "Feijão")).toBe(true);
    expect(acha("brocolis", "Brócolis")).toBe(true);
  });
});

describe("sinônimos do dia a dia", () => {
  it("espaguete e companhia levam a macarrão", () => {
    for (const q of ["espaguete", "espagueti", "spaghetti", "talharim", "penne", "macarronada"]) {
      expect(acha(q, "Macarrão"), `"${q}" não achou macarrão`).toBe(true);
    }
  });

  it("miojo leva a macarrão instantâneo", () => {
    expect(nomes("miojo", 1)[0]).toContain("instantâneo");
  });

  it("bolacha leva a biscoito", () => {
    expect(acha("bolacha", "Biscoito")).toBe(true);
  });

  it("coca leva a refrigerante", () => {
    expect(acha("coca cola", "Refrigerante, tipo cola")).toBe(true);
  });

  it("não inventa sinônimo para o que não existe na base", () => {
    // tilápia, granola e pasta de amendoim não estão na TACO — melhor não achar
    // nada do que achar outra coisa e o usuário registrar o valor errado
    expect(buscar(TACO, "tilápia", 10)).toHaveLength(0);
    expect(buscar(TACO, "granola", 10)).toHaveLength(0);
  });
});

describe("ordenação", () => {
  it("põe o alimento genérico antes do preparado", () => {
    expect(nomes("arroz", 1)[0].toLowerCase()).toContain("arroz");
  });

  it("quem começa com o termo vem antes", () => {
    const r = nomes("banana", 3);
    expect(r[0].toLowerCase().startsWith("banana")).toBe(true);
  });

  it("respeita o limite pedido", () => {
    expect(buscar(TACO, "a", 7)).toHaveLength(7);
  });
});

describe("casos de borda", () => {
  it("consulta vazia devolve o começo da lista", () => {
    expect(buscar(TACO, "", 5)).toHaveLength(5);
    expect(buscar(TACO, "   ", 5)).toHaveLength(5);
  });

  it("consulta sem resultado devolve lista vazia", () => {
    expect(buscar(TACO, "zzzqqq", 10)).toHaveLength(0);
  });

  it("combina exige TODAS as palavras", () => {
    expect(combina("Arroz, integral, cozido", ["arroz", "integral"])).toBe(true);
    expect(combina("Arroz, integral, cozido", ["arroz", "frito"])).toBe(false);
  });
});
