import { useEffect, type ReactNode } from "react";

export function Lista({ children, plana }: { children: ReactNode; plana?: boolean }) {
  return (
    <div className={plana ? "bg-surf overflow-hidden" : "card overflow-hidden"}>
      <div className="divide-y divide-line">{children}</div>
    </div>
  );
}

export function Linha({
  titulo, sub, valor, unidade, onClick, acao, destaque,
}: {
  titulo: ReactNode; sub?: ReactNode; valor?: ReactNode; unidade?: string;
  onClick?: () => void; acao?: ReactNode; destaque?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${onClick ? "active:bg-surf2" : ""} ${destaque ? "bg-surf2" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] leading-snug font-medium">{titulo}</div>
        {sub && <div className="text-[12px] text-dim mt-0.5 leading-snug">{sub}</div>}
      </div>
      {valor !== undefined && (
        <div className="shrink-0 text-right">
          <b className="num text-[15px] font-semibold block leading-none">{valor}</b>
          {unidade && <small className="num text-[8.5px] text-dim tracking-wider uppercase">{unidade}</small>}
        </div>
      )}
      {acao}
    </Tag>
  );
}

export function Stat({ rotulo, valor, sub, cor }: { rotulo: string; valor: ReactNode; sub?: string; cor?: string }) {
  return (
    <div className="card px-3 py-3">
      <div className="eyebrow">{rotulo}</div>
      <b className="num block text-[21px] font-semibold leading-tight mt-1" style={cor ? { color: cor } : undefined}>{valor}</b>
      {sub && <small className="num block text-[8.5px] text-dim tracking-wider uppercase mt-0.5">{sub}</small>}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="card empty">{children}</div>;
}

export function Sheet({ aberto, titulo, sub, onFechar, children }: {
  aberto: boolean; titulo: string; sub?: string; onFechar: () => void; children: ReactNode;
}) {
  useEffect(() => {
    if (!aberto) return;
    const h = (ev: KeyboardEvent) => { if (ev.key === "Escape") onFechar(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [aberto, onFechar]);

  return (
    <>
      <div
        onClick={onFechar}
        aria-hidden
        className={`fixed inset-0 z-40 bg-ink/35 transition-opacity duration-200 ${aberto ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-surf transition-transform duration-200 ease-out ${aberto ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      >
        <div className="sticky top-0 z-10 bg-surf px-5 pb-3 pt-2.5">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="absolute right-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full bg-surf2 text-[17px] leading-none text-dim"
          >×</button>
          <h4 className="pr-9 text-[17px] font-semibold leading-tight">{titulo}</h4>
          {sub && <p className="mt-1 pr-9 text-[12px] leading-snug text-dim">{sub}</p>}
        </div>
        {children}
      </div>
    </>
  );
}
