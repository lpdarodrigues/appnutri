import { useState } from "react";
import { Sheet } from "./ui";
import { Escaner } from "./Escaner";
import { buscarPorMarca, buscarPorCodigo, type Produto } from "../lib/openfoodfacts";
import { r1 } from "../lib/format";

/**
 * Busca produtos industrializados na base aberta.
 *
 * Devolve o produto escolhido para o formulário conferir — nunca salva direto.
 * Os candidatos aparecem lado a lado justamente porque o mesmo produto costuma
 * estar cadastrado várias vezes com valores diferentes: quem decide qual bate
 * com a embalagem na mão é o usuário.
 */
export function BuscaProduto({ onFechar, onUsar }: {
  onFechar: () => void;
  onUsar: (p: Produto) => void;
}) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Produto[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [escaneando, setEscaneando] = useState(false);

  const procurar = async () => {
    if (!q.trim()) return;
    setCarregando(true); setErro(""); setRes(null);
    try { setRes(await buscarPorMarca(q, 20)); }
    catch (e) { setErro((e as Error).message); }
    finally { setCarregando(false); }
  };

  const porCodigo = async (codigo: string) => {
    setEscaneando(false); setCarregando(true); setErro(""); setRes(null);
    try {
      const p = await buscarPorCodigo(codigo);
      if (p) setRes([p]);
      else setErro(`O código ${codigo} não está na base. Cadastre pelo rótulo — leva um minuto e fica salvo para sempre.`);
    } catch (e) { setErro((e as Error).message); }
    finally { setCarregando(false); }
  };

  return (
    <>
      <Sheet aberto titulo="Buscar produto" sub="Base aberta Open Food Facts" onFechar={onFechar}>
        <div className="px-4 pb-2">
          <button onClick={() => setEscaneando(true)} className="btn flex w-full items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M2.5 6V4a1.5 1.5 0 011.5-1.5h2M17.5 6V4A1.5 1.5 0 0016 2.5h-2M2.5 14v2A1.5 1.5 0 004 17.5h2M17.5 14v2a1.5 1.5 0 01-1.5 1.5h-2"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M6 6.5v7M8.6 6.5v7M11.4 6.5v7M14 6.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Escanear código de barras
          </button>

          <label htmlFor="bp-q" className="sh block">Ou busque pela marca</label>
          <div className="flex gap-2">
            <input
              id="bp-q" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && procurar()}
              placeholder="barilla, adria, nestlé…"
              className="flex-1 rounded-lg bg-surf2 px-3.5 py-2.5 text-[14.5px] outline-none placeholder:text-dim"
            />
            <button onClick={procurar} disabled={!q.trim() || carregando} className="btn btn-sm disabled:opacity-40">
              {carregando ? "…" : "Buscar"}
            </button>
          </div>

          {erro && <div className="note note-al mt-3">{erro}</div>}

          {res && res.length === 0 && (
            <div className="note mt-3">
              Nada encontrado para “{q}”. Esta busca é <b>por marca</b> — tente só
              “barilla” em vez do nome do produto. Se a marca não estiver na base,
              cadastre pelo rótulo: fica salvo para sempre no seu app.
            </div>
          )}

          {res && res.length > 0 && (
            <>
              <p className="sh">
                {res.length} resultado{res.length === 1 ? "" : "s"} · toque para usar
              </p>
              <div className="space-y-2">
                {res.map((p, i) => (
                  <button
                    key={`${p.codigo}-${i}`} onClick={() => { onUsar(p); onFechar(); }}
                    className="card w-full px-4 py-3 text-left active:bg-surf2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium leading-snug">{p.nome}</div>
                        {p.marca && <div className="mt-0.5 text-[11px] text-dim">{p.marca}</div>}
                      </div>
                      <div className="shrink-0 text-right">
                        <b className="num text-[16px] font-semibold leading-none">{p.kcal}</b>
                        <div className="num text-[8px] tracking-wider text-dim">KCAL/100{p.un.toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="num mt-2 flex flex-wrap gap-1.5">
                      <span className="chip chip-p">P <b>{r1(p.p)}</b></span>
                      <span className="chip chip-c">C <b>{r1(p.c)}</b></span>
                      <span className="chip chip-g">G <b>{r1(p.g)}</b></span>
                    </div>
                    {p.aviso && <div className="note note-al mt-2 !py-2 !text-[11.5px]">⚠ {p.aviso}</div>}
                  </button>
                ))}
              </div>

              <div className="note mt-3">
                <b>Confira antes de salvar.</b> Esta base é preenchida por voluntários,
                e o mesmo produto costuma estar cadastrado mais de uma vez com valores
                diferentes. Escolha o que bate com a embalagem que você tem na mão.
              </div>
            </>
          )}

          <div className="note mt-3 !text-[11px]">
            Dados © Open Food Facts, sob licença ODbL.
          </div>
        </div>
      </Sheet>

      {escaneando && <Escaner onLer={porCodigo} onFechar={() => setEscaneando(false)} />}
    </>
  );
}
