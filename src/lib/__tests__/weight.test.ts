import { describe, it, expect } from "vitest";
import { tendencia, ritmoSemanal, variacao7, variacaoTotal, alerta } from "../weight";
import type { WeightEntry } from "../types";

/** Gerador determinístico, para o teste dar sempre o mesmo resultado. */
function prng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Série realista: queda constante + ruído diário de água/intestino. */
function serie(dias: number, inicio: number, kgPorSemana: number, ruido = 0.5): WeightEntry[] {
  const rnd = prng(42);
  const base = new Date(2026, 0, 1).getTime();
  return Array.from({ length: dias }, (_, i) => {
    const dt = new Date(base + i * 864e5);
    const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const real = inicio + (kgPorSemana / 7) * i;
    return { d, kg: Math.round((real + (rnd() - 0.5) * 2 * ruido) * 10) / 10 };
  });
}

describe("média móvel de 7 dias", () => {
  it("suaviza o ruído diário", () => {
    const w = serie(40, 95, -1.0);
    const t = tendencia(w);
    expect(t).toHaveLength(40);
    const varBruto = Math.max(...w.slice(7).map((p, i) => Math.abs(p.kg - w[i + 6].kg)));
    const varTend = Math.max(...t.slice(7).map((p, i) => Math.abs(p.v - t[i + 6].v)));
    expect(varTend).toBeLessThan(varBruto);
  });

  it("os primeiros dias usam a janela parcial disponível", () => {
    const t = tendencia([{ d: "2026-01-01", kg: 90 }, { d: "2026-01-02", kg: 92 }]);
    expect(t[0].v).toBe(90);
    expect(t[1].v).toBe(91);
  });
});

describe("ritmo semanal", () => {
  it("recupera −1,0 kg/semana de uma série com ruído diário", () => {
    const r = ritmoSemanal(serie(45, 95, -1.0));
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(-1.0, 1);
  });

  it("recupera −0,7 kg/semana", () => {
    const r = ritmoSemanal(serie(45, 88, -0.7));
    expect(r!).toBeGreaterThan(-0.85);
    expect(r!).toBeLessThan(-0.55);
  });

  it("reconhece estagnação", () => {
    expect(Math.abs(ritmoSemanal(serie(45, 91, 0))!)).toBeLessThan(0.2);
  });

  it("reconhece ganho de peso", () => {
    expect(ritmoSemanal(serie(45, 80, 0.4))!).toBeGreaterThan(0.2);
  });

  it("olha só os últimos 28 dias — ignora um platô antigo", () => {
    const antigo = serie(30, 100, 0);
    const recente = serie(30, 100, -1.0).map((p, i) => ({
      d: `2026-02-${String(i + 1).padStart(2, "0")}`, kg: p.kg,
    }));
    expect(ritmoSemanal([...antigo, ...recente])!).toBeLessThan(-0.6);
  });

  it("exige no mínimo 4 registros", () => {
    expect(ritmoSemanal([])).toBeNull();
    expect(ritmoSemanal(serie(3, 90, -1))).toBeNull();
    expect(ritmoSemanal(serie(4, 90, -1))).not.toBeNull();
  });
});

describe("variações", () => {
  it("calcula a variação de 7 dias sobre a tendência", () => {
    expect(variacao7(serie(30, 95, -1.0))!).toBeCloseTo(-1.0, 0);
  });
  it("calcula a variação total", () => {
    const v = variacaoTotal(serie(30, 95, -1.0));
    expect(v!).toBeLessThan(-3);
    expect(v!).toBeGreaterThan(-5);
  });
});

describe("faixas de orientação clínica", () => {
  it("acima de 1,2 kg/sem avisa risco de perda de massa magra", () => {
    const a = alerta(-1.5)!;
    expect(a.nivel).toBe("alerta");
    expect(a.titulo).toBe("Ritmo acima do recomendado.");
    expect(a.texto).toContain("massa magra");
    expect(a.texto).toContain("1.850–1.900 kcal");
  });

  it("entre 0,55 e 1,2 confirma faixa ideal", () => {
    expect(alerta(-0.8)!.nivel).toBe("bom");
    expect(alerta(-0.8)!.titulo).toBe("Faixa ideal.");
    expect(alerta(-0.8)!.texto).toContain("Não mexa em nada");
  });

  it("abaixo de 0,55 orienta checar aderência antes de cortar calorias", () => {
    const a = alerta(-0.3)!;
    expect(a.nivel).toBe("neutro");
    expect(a.texto).toContain("aderência");
  });

  it("estagnado ou subindo aciona alerta", () => {
    expect(alerta(0)!.titulo).toBe("A tendência parou de cair.");
    expect(alerta(0.5)!.nivel).toBe("alerta");
  });

  it("os limiares exatos são 1,2 e 0,55", () => {
    expect(alerta(-1.21)!.nivel).toBe("alerta");
    expect(alerta(-1.19)!.nivel).toBe("bom");
    expect(alerta(-0.56)!.nivel).toBe("bom");
    expect(alerta(-0.54)!.nivel).toBe("neutro");
  });

  it("sem dados não inventa alerta", () => {
    expect(alerta(null)).toBeNull();
  });
});
