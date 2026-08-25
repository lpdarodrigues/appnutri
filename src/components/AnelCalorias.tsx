import { mil } from "../lib/format";

/**
 * Anel de progresso das calorias do dia.
 * Estado vazio (nada consumido) mostra o trilho sozinho — sem número gritando
 * zero, que é o que acontece na maior parte da manhã.
 */
export function AnelCalorias({ consumido, meta }: { consumido: number; meta: number }) {
  const R = 52, ESP = 10, C = 2 * Math.PI * R;
  const frac = meta > 0 ? Math.min(1, consumido / meta) : 0;
  const excedeu = meta > 0 && consumido > meta;
  const restam = Math.max(0, meta - consumido);

  return (
    <div className="relative shrink-0" style={{ width: 130, height: 130 }}>
      <svg viewBox="0 0 130 130" width="130" height="130" className="-rotate-90" role="img"
        aria-label={`${mil(consumido)} de ${mil(meta)} calorias consumidas`}>
        <defs>
          <linearGradient id="anel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#23BA97" />
            <stop offset="100%" stopColor="#5C9EEA" />
          </linearGradient>
        </defs>
        <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,.11)" strokeWidth={ESP} />
        <circle
          cx="65" cy="65" r={R} fill="none"
          stroke={excedeu ? "#E5943F" : "url(#anel)"}
          strokeWidth={ESP} strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: "stroke-dashoffset .55s cubic-bezier(.3,.8,.4,1)" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="num text-[27px] font-semibold leading-none tracking-tight text-white">
          {mil(consumido)}
        </b>
        <span className="num mt-1 text-[8.5px] tracking-[0.12em] text-white/45">KCAL</span>
        <span className="num mt-1.5 text-[9.5px] text-white/60">
          {excedeu ? `+${mil(consumido - meta)}` : `restam ${mil(restam)}`}
        </span>
      </div>
    </div>
  );
}

/** Barra de um macro, na versão para fundo escuro. */
export function BarraMacro({
  rotulo, atual, meta, cor,
}: { rotulo: string; atual: number; meta: number; cor: string }) {
  const pct = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <i className="num not-italic text-[8.5px] tracking-[0.11em] text-white/45">{rotulo}</i>
        <span className="num text-[10px] text-white/75">
          <b className="font-semibold text-white">{Math.round(atual)}</b>
          <span className="text-white/35">/{Math.round(meta)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: cor, transition: "width .5s cubic-bezier(.3,.8,.4,1)" }}
        />
      </div>
    </div>
  );
}
