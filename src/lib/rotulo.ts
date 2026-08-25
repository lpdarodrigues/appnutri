/**
 * Leitura de tabela nutricional brasileira (padrão ANVISA) a partir de texto.
 *
 * O texto vem do reconhecimento do próprio celular (Texto ao Vivo, no iPhone),
 * então chega bagunçado: quebras de linha em lugares estranhos, colunas
 * embaralhadas, vírgula decimal.
 *
 * REGRA DE OURO: nunca inventar valor. Campo que não deu para ler com confiança
 * volta indefinido e o usuário preenche à mão. É melhor deixar em branco do que
 * entregar um número errado com cara de certo.
 */

export interface CamposRotulo {
  kcal?: number;
  p?: number;
  c?: number;
  g?: number;
  fib?: number;
  na?: number;
  /** peso da porção declarada, em g ou ml */
  mp?: number;
  /** nome da medida caseira declarada, ex.: "2 colheres de sopa" */
  md?: string;
  un: "g" | "ml";
}

export interface Leitura {
  campos: CamposRotulo;
  /** como os valores foram obtidos — mostrado ao usuário */
  base: "100g" | "porcao" | "desconhecida";
  /** o que não deu para ler, em português, para o usuário conferir */
  avisos: string[];
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const num = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));

interface Valor { n: number; un: string }

/** Extrai os números de um trecho, descartando %VD e quilojoules. */
function valores(trecho: string): Valor[] {
  const out: Valor[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(kcal|kj|mg|g|ml|%)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trecho))) {
    const un = (m[2] || "").toLowerCase();
    if (un === "%" || un === "kj") continue;      // %VD e kJ não interessam
    const n = num(m[1]);
    if (!Number.isFinite(n)) continue;
    out.push({ n, un });
  }
  return out;
}

/**
 * Junta a linha do nutriente com as seguintes quando os números caíram
 * em linhas separadas — acontece muito quando a tabela é lida em coluna.
 */
function trechoDo(linhas: string[], i: number): string {
  let t = linhas[i];
  for (let k = 1; k <= 2 && i + k < linhas.length; k++) {
    if (valores(t).length >= 2) break;
    // para se a próxima linha já é outro nutriente
    if (/carboidrato|proteina|gordura|lipidio|fibra|sodio|valor energetico|energia/.test(linhas[i + k])) break;
    t += " " + linhas[i + k];
  }
  return t;
}

/** Plurais das medidas caseiras que aparecem em rótulo brasileiro. */
const SINGULAR: Record<string, string> = {
  colheres: "colher", fatias: "fatia", copos: "copo", unidades: "unidade",
  dosadores: "dosador", xicaras: "xícara", conchas: "concha",
  potes: "pote", latas: "lata", biscoitos: "biscoito", pacotes: "pacote",
};

/**
 * "2 colheres de sopa" pesando 30 g vira "colher de sopa" pesando 15 g.
 * O app precisa da medida UNITÁRIA para escrever "1 ½ colheres de sopa".
 */
export function medidaUnitaria(md: string, mp: number): { md: string; mp: number } {
  const m = md.match(/^(\d+)\s+(.+)$/);
  if (!m) return { md, mp };
  const n = parseInt(m[1], 10);
  if (!n || n < 1) return { md, mp };
  const palavras = m[2].split(" ");
  palavras[0] = SINGULAR[norm(palavras[0])] ?? palavras[0];
  return { md: palavras.join(" "), mp: Math.round((mp / n) * 10) / 10 };
}

function acharLinha(linhas: string[], teste: (l: string) => boolean): number {
  return linhas.findIndex(teste);
}

export function lerRotulo(texto: string): Leitura {
  const avisos: string[] = [];
  const linhas = norm(texto)
    .split(/[\n\r]+/)
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const inteiro = linhas.join(" ");

  const un: "g" | "ml" = /\bml\b|\blitro|\bbebida|\bsuco\b/.test(inteiro) && !/\bpor(cao)? de \d+\s*g\b/.test(inteiro) ? "ml" : "g";


  // --- porção declarada -------------------------------------------------
  // `porcao` é o peso declarado da porção — usado só na conta de converter a
  // tabela para 100 g. `mp` é o peso de UMA medida caseira, usado na interface.
  // São números diferentes: "2 colheres de sopa (30 g)" tem porção 30 e mp 15.
  let porcao: number | undefined;
  let md: string | undefined;
  const mPorc = inteiro.match(/por(?:c|ç)ao\s*(?:de)?\s*(\d+(?:[.,]\d+)?)\s*(g|ml)/);
  if (mPorc) porcao = num(mPorc[1]);
  const mMed = inteiro.match(/\(([^)]*(?:colher|fatia|copo|unidade|dosador|xicara|concha|pote|lata)[^)]*)\)/);
  if (mMed) md = mMed[1].trim();

  // --- localiza cada nutriente -----------------------------------------
  const iEnergia = acharLinha(linhas, l => /valor energetico|energia|calorias/.test(l));
  const iCarb = acharLinha(linhas, l => /carboidrato/.test(l));
  const iProt = acharLinha(linhas, l => /proteina/.test(l));
  const iGord = (() => {
    const tot = acharLinha(linhas, l => /gorduras? totais|lipidios totais/.test(l));
    if (tot >= 0) return tot;
    return acharLinha(linhas, l =>
      /gordura|lipidio/.test(l) && !/saturad|trans|monoinsat|poliinsat/.test(l));
  })();
  const iFibra = acharLinha(linhas, l => /fibra/.test(l));
  const iSodio = acharLinha(linhas, l => /sodio/.test(l));

  const brutos: Record<string, Valor[]> = {};
  const pega = (chave: string, i: number) => { if (i >= 0) brutos[chave] = valores(trechoDo(linhas, i)); };
  pega("kcal", iEnergia); pega("c", iCarb); pega("p", iProt);
  pega("g", iGord); pega("fib", iFibra); pega("na", iSodio);

  // --- descobre o arranjo das colunas ----------------------------------
  // O rótulo novo traz duas colunas (100 g e porção). Descobrimos qual é qual
  // testando a proporção: valor_100 = valor_porcao * 100 / porcao.
  let base: Leitura["base"] = "desconhecida";
  let coluna = 0;

  const temCem = /\b100\s*(g|ml)\b/.test(inteiro);
  const candidatos = Object.values(brutos).filter(v => v.length >= 2);

  if (porcao && porcao !== 100 && candidatos.length) {
    const fator = 100 / porcao;
    let placarPrimeiro = 0, placarSegundo = 0;
    for (const v of candidatos) {
      const [a, b] = v;
      if (Math.abs(a.n - b.n * fator) <= Math.max(1, b.n * fator * 0.06)) placarPrimeiro++;
      if (Math.abs(b.n - a.n * fator) <= Math.max(1, a.n * fator * 0.06)) placarSegundo++;
    }
    if (placarPrimeiro > placarSegundo) { base = "100g"; coluna = 0; }
    else if (placarSegundo > placarPrimeiro) { base = "100g"; coluna = 1; }
  }

  if (base === "desconhecida") {
    if (temCem && candidatos.length) { base = "100g"; coluna = 0; }
    else if (porcao) { base = "porcao"; coluna = 0; }
    else if (temCem) { base = "100g"; coluna = 0; }
  }

  // --- monta os campos, já por 100 g ------------------------------------
  const fator = base === "porcao" && porcao ? 100 / porcao : 1;

  let mp = porcao;
  if (md && mp) ({ md, mp } = medidaUnitaria(md, mp));

  const campos: CamposRotulo = { un, mp, md };

  const setar = (chave: keyof CamposRotulo, vs: Valor[] | undefined, mg = false) => {
    if (!vs || !vs.length) return;
    const v = vs[Math.min(coluna, vs.length - 1)];
    let n = v.n * fator;
    // sódio às vezes vem em g em vez de mg
    if (mg && v.un === "g") n *= 1000;
    (campos as unknown as Record<string, number>)[chave] = Math.round(n * 10) / 10;
  };

  setar("kcal", brutos.kcal);
  setar("c", brutos.c);
  setar("p", brutos.p);
  setar("g", brutos.g);
  setar("fib", brutos.fib);
  setar("na", brutos.na, true);

  if (campos.kcal !== undefined) campos.kcal = Math.round(campos.kcal);
  if (campos.na !== undefined) campos.na = Math.round(campos.na);

  // --- avisos honestos --------------------------------------------------
  const falta: [unknown, string][] = [
    [campos.kcal, "valor energético"], [campos.c, "carboidratos"],
    [campos.p, "proteínas"], [campos.g, "gorduras totais"],
  ];
  const naoLidos = falta.filter(([v]) => v === undefined).map(([, nome]) => nome);
  if (naoLidos.length) avisos.push(`Não consegui ler: ${naoLidos.join(", ")}. Preencha à mão.`);

  if (base === "porcao" && porcao)
    avisos.push(`A tabela estava por porção de ${String(porcao).replace(".", ",")} ${un}. Converti para 100 ${un}.`);
  if (base === "desconhecida" && Object.keys(brutos).length)
    avisos.push("Não identifiquei se a tabela é por 100 g ou por porção. Confira os valores com atenção.");
  if (!Object.keys(brutos).length)
    avisos.push("Não reconheci nenhuma tabela nutricional nesse texto.");

  // Coerência: as calorias batem com os macros? (4/4/9)
  const { kcal, p, c, g } = campos;
  if (kcal !== undefined && p !== undefined && c !== undefined && g !== undefined) {
    const estimado = p * 4 + c * 4 + g * 9;
    if (estimado > 0 && Math.abs(estimado - kcal) > Math.max(35, kcal * 0.28))
      avisos.push(`As calorias (${kcal}) não batem com os macros lidos (dariam cerca de ${Math.round(estimado)}). Confira antes de salvar.`);
  }

  return { campos, base, avisos };
}
