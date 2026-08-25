/**
 * Leitura de rótulo por foto — PREPARADO, ainda não ligado.
 *
 * O fluxo previsto: o usuário fotografa a tabela nutricional, a imagem vai
 * para a API da Anthropic com visão e volta com os campos preenchidos, que ele
 * confere antes de salvar. Nada é gravado sem revisão — a regra de não inventar
 * valor nutricional continua valendo.
 *
 * A chave vem de variável de ambiente (arquivo .env.local, nunca no código):
 *   VITE_ANTHROPIC_API_KEY=sk-ant-...
 */
export const CHAVE_API = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

export const leituraDisponivel = () => Boolean(CHAVE_API);

export interface CamposRotulo {
  n?: string; kcal?: number; p?: number; c?: number; g?: number;
  fib?: number; na?: number; mp?: number; md?: string;
}

export async function lerRotuloPorFoto(_imagem: File): Promise<CamposRotulo> {
  throw new Error("Leitura de rótulo por foto ainda não implementada.");
}
