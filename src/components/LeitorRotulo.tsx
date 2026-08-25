import { useMemo, useState } from "react";
import { Sheet } from "./ui";
import { lerRotulo, type CamposRotulo } from "../lib/rotulo";
import { r1 } from "../lib/format";

/**
 * Preenche o cadastro a partir do texto da tabela nutricional.
 *
 * O reconhecimento de texto é o do próprio aparelho (Texto ao Vivo, no iPhone):
 * é melhor que qualquer coisa que caberia no app, não custa nada e funciona
 * offline. Aqui só interpretamos o texto — e o usuário confere antes de salvar.
 */
export function LeitorRotulo({ onFechar, onUsar }: {
  onFechar: () => void;
  onUsar: (c: CamposRotulo) => void;
}) {
  const [texto, setTexto] = useState("");
  const [erroColar, setErroColar] = useState("");

  const leitura = useMemo(() => (texto.trim() ? lerRotulo(texto) : null), [texto]);
  const c = leitura?.campos;
  const achouAlgo = Boolean(c && (c.kcal !== undefined || c.p !== undefined || c.c !== undefined));

  const colar = async () => {
    setErroColar("");
    try {
      const t = await navigator.clipboard.readText();
      if (t.trim()) setTexto(t);
      else setErroColar("A área de transferência está vazia.");
    } catch {
      setErroColar("Não consegui ler a área de transferência. Cole no campo abaixo com o dedo (toque e segure → Colar).");
    }
  };

  const linhas: [string, string | undefined][] = c ? [
    ["Valor energético", c.kcal !== undefined ? `${c.kcal} kcal` : undefined],
    ["Proteínas", c.p !== undefined ? `${r1(c.p)} g` : undefined],
    ["Carboidratos", c.c !== undefined ? `${r1(c.c)} g` : undefined],
    ["Gorduras totais", c.g !== undefined ? `${r1(c.g)} g` : undefined],
    ["Fibra alimentar", c.fib !== undefined ? `${r1(c.fib)} g` : undefined],
    ["Sódio", c.na !== undefined ? `${c.na} mg` : undefined],
    ["Medida caseira", c.md && c.mp ? `${c.md} · ${r1(c.mp)} ${c.un}` : undefined],
  ] : [];

  return (
    <Sheet aberto titulo="Ler rótulo" sub={`Valores por 100 ${c?.un ?? "g"}`} onFechar={onFechar}>
      <div className="px-4 pb-2">
        <div className="note">
          <b>Como fazer:</b><br />
          1. Fotografe a tabela nutricional (ou abra a foto no app Fotos)<br />
          2. Toque e segure sobre o texto da tabela — o iPhone seleciona sozinho<br />
          3. Arraste para pegar a tabela inteira e toque em <b>Copiar</b><br />
          4. Volte aqui e toque em <b>Colar texto copiado</b>
        </div>

        <button onClick={colar} className="btn mt-3 w-full">Colar texto copiado</button>
        {erroColar && <div className="note note-al mt-2.5">{erroColar}</div>}

        <label htmlFor="rot-txt" className="sh block">Ou cole aqui</label>
        <textarea
          id="rot-txt" rows={texto ? 5 : 3} value={texto} onChange={e => setTexto(e.target.value)}
          placeholder="INFORMAÇÃO NUTRICIONAL&#10;Porção de 30 g…"
          className="w-full rounded-xl border border-line bg-surf px-3.5 py-2.5 font-mono text-[12px] leading-relaxed outline-none placeholder:text-dim focus:border-carb"
        />

        {leitura && (
          <>
            <p className="sh">O que eu li</p>
            <div className="card divide-y divide-line overflow-hidden">
              {linhas.map(([rot, val]) => (
                <div key={rot} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[13.5px] text-ink2">{rot}</span>
                  {val
                    ? <b className="num text-[14px] font-semibold">{val}</b>
                    : <span className="num text-[10px] tracking-wider text-dim uppercase">não lido</span>}
                </div>
              ))}
            </div>

            {leitura.avisos.map((a, i) => (
              <div key={i} className={`mt-2.5 ${a.startsWith("A tabela estava") ? "note" : "note note-al"}`}>{a}</div>
            ))}

            <button
              onClick={() => { onUsar(c!); onFechar(); }}
              disabled={!achouAlgo}
              className="btn mt-4 w-full disabled:opacity-35"
            >Usar estes valores</button>

            <div className="note mt-2.5">
              Os campos vão para o formulário para <b>você conferir</b> antes de salvar.
              Nada é gravado direto — o que eu não consegui ler fica em branco em vez
              de ser chutado.
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
