import type { Familia } from "./types";

/**
 * Consulta ao Open Food Facts — base aberta e colaborativa, com os produtos
 * industrializados que a TACO não tem.
 *
 * IMPORTANTE: os números daqui foram digitados por voluntários, não medidos em
 * laboratório. O mesmo achocolatado aparece cadastrado com 66, 86, 116, 355 e
 * 380 kcal. Por isso nada daqui é salvo sozinho: o app mostra os candidatos,
 * marca os que não fecham a conta, e o usuário confere contra a embalagem antes
 * de salvar. A etiqueta ABERTA fica visível para sempre lembrar a procedência.
 *
 * Dados sob licença ODbL, © Open Food Facts.
 */

const TIMEOUT = 12000;

export interface Produto {
  codigo: string;
  nome: string;
  marca: string;
  kcal: number;
  p: number;
  c: number;
  g: number;
  fib: number;
  na: number;
  un: "g" | "ml";
  md?: string | null;
  mp?: number | null;
  gr: Familia | null;
  /** preenchido quando as calorias não fecham com os macros */
  aviso?: string;
}

const n0 = (v: unknown) => {
  const x = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) ? x : 0;
};

/** Categoria do Open Food Facts → família funcional do app. */
const CATEGORIAS: [RegExp, Familia][] = [
  [/pasta|noodle|spaghetti|macaroni/, "carbo"],
  [/bread|toast|pao/, "pao"],
  [/breakfast-cereal|oat|granola|flour|cereal/, "cereal"],
  [/legume|bean|lentil|chickpea|pea/, "legum"],
  [/beef|pork|meat|sausage|ham/, "carne"],
  [/chicken|poultry|turkey/, "ave"],
  [/fish|seafood|tuna|sardine|salmon/, "peixe"],
  [/egg/, "ovo"],
  [/protein-powder|whey|sport/, "prot"],
  [/cheese/, "queijo"],
  [/yogurt|yoghurt|milk|dairy/, "leite"],
  [/fruit/, "fruta"],
  [/vegetable|salad/, "horta"],
  [/olive-oil|vegetable-oil|nut|seed|butter/, "gord"],
  [/chocolate|candy|sweet|dessert|biscuit|cookie|sugar/, "doce"],
];

function familia(tags: string[] | undefined): Familia | null {
  const t = (tags ?? []).join(" ").toLowerCase();
  for (const [re, fam] of CATEGORIAS) if (re.test(t)) return fam;
  return null;
}

/**
 * Sólido ou líquido.
 *
 * Não dá para procurar a palavra "beverage" solta nas categorias: a base marca
 * quase todo vegetal como "en:plant-based-foods-and-beverages", e isso fazia
 * macarrão seco virar mililitro. Vale o que está escrito na porção, e só as
 * categorias de bebida de verdade.
 */
function unidade(bruto: Record<string, unknown>): "g" | "ml" {
  const medida = `${bruto.serving_size ?? ""} ${bruto.quantity ?? ""}`;
  if (/\d\s*(ml|l)\b/i.test(medida)) return "ml";
  if (/\d\s*g\b/i.test(medida)) return "g";

  const tags = ((bruto.categories_tags as string[]) ?? []).map(t => t.toLowerCase());
  const BEBIDA = /:(beverages|drinks|sodas|juices|waters|milks|coffees|teas|beers|wines)$/;
  return tags.some(t => BEBIDA.test(t) && !t.includes("plant-based-foods")) ? "ml" : "g";
}

function medidaCaseira(serving?: string): { md: string | null; mp: number | null } {
  if (!serving) return { md: null, mp: null };
  const m = serving.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)/i);
  const mp = m ? parseFloat(m[1].replace(",", ".")) : null;
  const nome = serving.match(/\(([^)]+)\)/)?.[1] ?? serving.replace(/[\d.,]+\s*(g|ml)/i, "").trim();
  return { md: nome && nome.length <= 28 ? nome : null, mp };
}

/** Converte um registro cru do Open Food Facts. Null quando é inaproveitável. */
export function mapear(bruto: Record<string, unknown>): Produto | null {
  const nut = (bruto.nutriments ?? {}) as Record<string, unknown>;
  const nome = String(bruto.product_name ?? "").trim();
  const kcal = n0(nut["energy-kcal_100g"]);
  if (!nome || !kcal) return null;

  const p = n0(nut.proteins_100g);
  const c = n0(nut.carbohydrates_100g);
  const g = n0(nut.fat_100g);

  // Descarta o que é fisicamente impossível — erro de digitação grosseiro.
  if (kcal > 900 || p + c + g > 105 || p < 0 || c < 0 || g < 0) return null;

  const marcaCrua = bruto.brands;
  const marca = Array.isArray(marcaCrua) ? marcaCrua.join(", ") : String(marcaCrua ?? "").trim();

  const sodio = nut.sodium_100g !== undefined
    ? n0(nut.sodium_100g) * 1000
    : n0(nut.salt_100g) * 400;   // sal → sódio

  const { md, mp } = medidaCaseira(bruto.serving_size as string | undefined);
  const un = unidade(bruto);

  const prod: Produto = {
    codigo: String(bruto.code ?? bruto._id ?? ""),
    nome, marca,
    kcal: Math.round(kcal),
    p: Math.round(p * 10) / 10,
    c: Math.round(c * 10) / 10,
    g: Math.round(g * 10) / 10,
    fib: Math.round(n0(nut.fiber_100g) * 10) / 10,
    na: Math.round(sodio),
    un, md, mp,
    gr: familia(bruto.categories_tags as string[] | undefined),
  };

  // Álcool e polióis rendem calorias que não aparecem em P/C/G, então a conta
  // não fechar nem sempre é erro — por isso avisa, não descarta.
  const estimado = prod.p * 4 + prod.c * 4 + prod.g * 9;
  if (prod.kcal > 15 && Math.abs(estimado - prod.kcal) > Math.max(45, prod.kcal * 0.3))
    prod.aviso = `As calorias (${prod.kcal}) não batem com os macros, que dariam cerca de ${Math.round(estimado)}. Confira na embalagem.`;

  return prod;
}

/**
 * Busca com repetição.
 *
 * Os servidores do Open Food Facts devolvem 503 com frequência — em teste, a
 * busca por marca só respondeu na terceira tentativa. Não é erro nosso nem falta
 * de internet, é sobrecarga do lado deles, e insistir resolve.
 *
 * Sem cabeçalho User-Agent: no navegador ele é proibido, e defini-lo transforma
 * a chamada em preflight, que a API não atende.
 */
async function pegar(url: string, tentativas = 5): Promise<Record<string, unknown>> {
  let ultimo = "";
  for (let i = 0; i < tentativas; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (r.status === 503 || r.status === 429) {
        ultimo = "A base de produtos está sobrecarregada. Tente de novo em alguns segundos.";
      } else if (!r.ok) {
        throw new Error(`A base respondeu com erro ${r.status}.`);
      } else {
        return await r.json();
      }
    } catch (e) {
      // A página de erro 503 deles não traz cabeçalho CORS, então o navegador
      // rejeita a chamada sem revelar o status: sobrecarga e queda de internet
      // chegam aqui iguais. Por isso a mensagem cita as duas possibilidades.
      ultimo = (e as Error).name === "AbortError"
        ? "A busca demorou demais. Tente de novo."
        : "A base de produtos não respondeu — ela vive sobrecarregada. Tente de novo, ou verifique sua internet.";
    } finally {
      clearTimeout(t);
    }
    if (i < tentativas - 1) await new Promise(r => setTimeout(r, 700 * (i + 1)));
  }
  throw new Error(ultimo || "Não consegui falar com a base de produtos.");
}

/** "Nestlé" -> "nestle"; é assim que a base indexa as marcas. */
export const marcaSlug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const CAMPOS = "code,product_name,brands,serving_size,nutriments,categories_tags";

/**
 * Busca por marca, entre os produtos vendidos no Brasil.
 *
 * A API pública não expõe busca por texto livre com CORS — só filtro por tag.
 * Como marca é justamente o que se procura num industrializado ("a massa da
 * Barilla"), buscamos por marca: a consulta inteira primeiro, depois cada
 * palavra isolada, para "espaguete barilla" cair em "barilla".
 */
export async function buscarPorMarca(termo: string, limite = 20): Promise<Produto[]> {
  const inteiro = marcaSlug(termo);
  if (!inteiro) return [];

  // Em nome de produto brasileiro a marca costuma vir por último ("Macarrão
  // com ovos espaguete BARILLA"), então tentamos de trás para frente.
  const palavras = termo.trim().split(/\s+/).map(marcaSlug)
    .filter(p => p.length >= 3).reverse();

  const candidatos = [inteiro, ...palavras.filter(p => p !== inteiro)];
  let erro: Error | null = null;

  for (const tag of candidatos) {
    try {
      const d = await pegar(
        `https://world.openfoodfacts.org/api/v2/search?countries_tags=brazil` +
        `&brands_tags=${encodeURIComponent(tag)}&fields=${CAMPOS}&page_size=${limite}`);
      const ps = ((d.products ?? []) as Record<string, unknown>[])
        .map(mapear).filter((x): x is Produto => x !== null);
      if (ps.length) return ps;
    } catch (e) {
      // Uma marca que falhou não pode derrubar a busca inteira: seguimos para
      // a próxima e só reclamamos se nenhuma tiver dado certo.
      erro = e as Error;
    }
  }
  if (erro) throw erro;
  return [];
}

/** Busca pelo código de barras (EAN). */
export async function buscarPorCodigo(codigo: string): Promise<Produto | null> {
  const ean = codigo.replace(/\D/g, "");
  if (ean.length < 8) throw new Error("Código de barras inválido.");
  const d = await pegar(`https://world.openfoodfacts.org/api/v2/product/${ean}?fields=${CAMPOS}`);
  if (d.status !== 1 || !d.product) return null;
  return mapear({ ...(d.product as Record<string, unknown>), code: ean });
}
