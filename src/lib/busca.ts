import type { Food } from "./types";

/**
 * Busca de alimentos.
 *
 * A TACO é uma tabela acadêmica: escreve "Arroz, integral, cozido", não "arroz
 * integral". Uma busca por texto corrido não acha quase nada — a vírgula atrapalha
 * quase toda consulta de duas palavras. Aqui a consulta vira palavras soltas que
 * precisam TODAS aparecer no nome, em qualquer ordem.
 */

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Palavras de ligação que o usuário digita e a TACO não usa ("peito DE frango"). */
const LIGACAO = new Set([
  "de", "da", "do", "das", "dos", "com", "sem", "e", "em", "a", "o", "as", "os",
  "no", "na", "ao", "para", "tipo",
]);

/**
 * Nomes do dia a dia que não existem na TACO, apontando para o que ela usa.
 * Só entram aqui os que realmente têm correspondente — inventar um sinônimo
 * para algo ausente só faria o usuário achar que encontrou.
 */
const SINONIMOS: Record<string, string> = {
  espaguete: "macarrao", espagueti: "macarrao", spaghetti: "macarrao",
  talharim: "macarrao", penne: "macarrao", fusilli: "macarrao",
  parafuso: "macarrao", macarronada: "macarrao", massa: "macarrao",
  miojo: "macarrao instantaneo", lamen: "macarrao instantaneo",
  bolacha: "biscoito",
  coca: "refrigerante", refri: "refrigerante", guarana: "refrigerante guarana",
  filezinho: "file", peito: "peito",
  batatinha: "batata", feijoada: "feijao",
};

/**
 * Reduz plural e gênero: "moída" e "moído" viram a mesma raiz, "cozidas" e
 * "cozido" também. Grosseiro de propósito — precisão aqui atrapalharia mais
 * do que ajuda.
 */
const raiz = (p: string) => {
  let w = p;
  if (w.length >= 5 && w.endsWith("s")) w = w.slice(0, -1);
  if (w.length >= 5 && /[aoe]$/.test(w)) w = w.slice(0, -1);
  return w;
};

/** Consulta → palavras buscáveis, já com sinônimos aplicados. */
export function palavras(consulta: string): string[] {
  const cru = norm(consulta).replace(/[,;/()]+/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const p of cru) {
    const expandido = SINONIMOS[p] ?? p;
    for (const q of expandido.split(" ")) {
      if (q.length >= 2 && !LIGACAO.has(q)) out.push(q);
    }
  }
  return out;
}

/** Todas as palavras precisam aparecer no nome, em qualquer ordem. */
export function combina(nome: string, ps: string[]): boolean {
  const n = norm(nome);
  return ps.every(p => n.includes(p) || n.includes(raiz(p)));
}

/** Menor é melhor. Prioriza quem começa com o que foi digitado e nomes curtos. */
function pontos(nome: string, ps: string[]): number {
  const n = norm(nome);
  let s = 0;
  const primeiro = ps[0];
  if (primeiro) {
    if (n.startsWith(primeiro)) s -= 40;
    const i = n.indexOf(primeiro);
    s += i >= 0 ? i : 30;
  }
  s += n.length / 12;             // nomes curtos são os genéricos, mais úteis
  s += (n.match(/,/g)?.length ?? 0) * 1.5;
  return s;
}

export function buscar(lista: Food[], consulta: string, limite = 40): Food[] {
  const ps = palavras(consulta);
  if (!ps.length) return lista.slice(0, limite);
  return lista
    .filter(f => combina(f.n, ps))
    .map(f => ({ f, s: pontos(f.n, ps) - (f.src === "user" ? 25 : 0) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, limite)
    .map(o => o.f);
}
