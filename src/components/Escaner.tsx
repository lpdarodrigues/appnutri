import { useEffect, useRef, useState } from "react";

/**
 * Leitor de código de barras pela câmera.
 *
 * O Safari não tem o BarcodeDetector nativo, então usamos o ZXing. A câmera
 * traseira é pedida explicitamente — sem isso o iPhone abre a frontal.
 */
export function Escaner({ onLer, onFechar }: { onLer: (codigo: string) => void; onFechar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let parar: (() => void) | undefined;
    let vivo = true;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const leitor = new BrowserMultiFormatReader();
        const controls = await leitor.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video.current!,
          (res) => { if (res && vivo) { vivo = false; onLer(res.getText()); } },
        );
        parar = () => controls.stop();
      } catch (e) {
        const m = (e as Error).name === "NotAllowedError"
          ? "Você precisa permitir o acesso à câmera. No iPhone: Ajustes → Safari → Câmera."
          : "Não consegui abrir a câmera neste aparelho.";
        setErro(m);
      }
    })();

    return () => { vivo = false; parar?.(); };
  }, [onLer]);

  return (
    <>
      <div onClick={onFechar} aria-hidden className="fixed inset-0 z-[70] bg-ink/80" />
      <div role="dialog" aria-modal="true" aria-label="Escanear código de barras"
        className="fixed inset-x-0 top-1/2 z-[71] mx-auto w-[min(360px,calc(100vw-32px))] -translate-y-1/2">
        <div className="card overflow-hidden">
          <div className="relative bg-ink">
            <video ref={video} playsInline muted className="block max-h-[46vh] w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-24 w-[78%] rounded-lg border-2 border-white/70 shadow-[0_0_0_2000px_rgba(0,0,0,.35)]" />
            </div>
          </div>
          <div className="px-4 py-3">
            {erro
              ? <div className="note note-al">{erro}</div>
              : <div className="text-center text-[12.5px] text-ink2">Aponte para o código de barras da embalagem.</div>}
            <button onClick={onFechar} className="btn btn-gh mt-3 w-full">Cancelar</button>
          </div>
        </div>
      </div>
    </>
  );
}
