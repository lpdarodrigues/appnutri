import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Sheet, Lista, Linha } from "../components/ui";
import { norm, TACO } from "../lib/catalog";
import { GLBL } from "../lib/nutrition-config";
import { r0, r1, procedencia, numBR } from "../lib/format";
import { uid } from "../lib/db";
import { LeitorRotulo } from "../components/LeitorRotulo";
import type { Food, Familia } from "../lib/types";

const CATS = ["Meus rótulos", ...Array.from(new Set(TACO.map(f => f.cat)))];
const FAMILIAS = Object.keys(GLBL) as Familia[];

export function Alimentos() {
  const st = useStore();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("all");
  const [ver, setVer] = useState<Food | null>(null);
  const [novo, setNovo] = useState(false);

  const lista = useMemo(() => {
    let l = st.catalogo;
    if (filtro !== "all") l = l.filter(f => f.cat === filtro);
    const t = norm(q.trim());
    if (t) l = l.filter(f => norm(f.n).includes(t));
    return l.slice(0, 60);
  }, [q, filtro, st.catalogo]);

  return (
    <div className="px-4 pb-4" style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[21px] font-semibold">Alimentos</h2>
        <button onClick={() => setNovo(true)} className="btn btn-sm">+ Cadastrar</button>
      </div>

      <input
        value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar na TACO e nos seus rótulos…"
        className="mt-3 w-full rounded-lg bg-surf px-3.5 py-2.5 text-[14.5px] shadow-sm outline-none placeholder:text-dim"
      />

      <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
        {["all", ...CATS.slice(0, 7)].map(c => (
          <button key={c} onClick={() => setFiltro(c)} className={`pill ${c === filtro ? "pill-on" : ""}`}>
            {c === "all" ? "Todos" : c.split(" ")[0].replace(",", "")}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <Lista>
          {lista.map(f => {
            const pr = procedencia(f);
            return (
              <Linha
                key={f.id} onClick={() => setVer(f)}
                titulo={<>{f.n}<span className={`tag ${pr.cls}`}>{pr.txt}</span></>}
                sub={`P ${r1(f.p)} · C ${r1(f.c)} · G ${r1(f.g)}${f.fib ? ` · fibra ${r1(f.fib)}` : ""}`}
                valor={r0(f.kcal)} unidade={`kcal/100${f.un === "ml" ? "ml" : "g"}`}
              />
            );
          })}
          {!lista.length && <div className="empty">Nada encontrado para “{q}”.</div>}
        </Lista>
      </div>

      <DetalheAlimento f={ver} onFechar={() => setVer(null)} />
      {novo && <FormAlimento onFechar={() => setNovo(false)} onSalvar={f => { st.salvarAlimento(f); setNovo(false); }} />}
    </div>
  );
}

function DetalheAlimento({ f, onFechar }: { f: Food | null; onFechar: () => void }) {
  const st = useStore();
  if (!f) return <Sheet aberto={false} titulo="" onFechar={onFechar}><div /></Sheet>;
  const pr = procedencia(f);
  const linhas: [string, string][] = [
    ["Valor energético", `${r0(f.kcal)} kcal`],
    ["Proteínas", `${r1(f.p)} g`],
    ["Carboidratos", `${r1(f.c)} g`],
    ["Gorduras", `${r1(f.g)} g`],
    ["Fibras", `${r1(f.fib || 0)} g`],
    ["Sódio", `${r0(f.na || 0)} mg`],
  ];
  return (
    <Sheet aberto titulo={f.n} sub={`${f.cat} · por 100 ${f.un || "g"}${f.gr ? ` · ${GLBL[f.gr]}` : ""}`} onFechar={onFechar}>
      <Lista plana>
        {linhas.map(([a, b]) => <Linha key={a} titulo={a} valor={b} />)}
      </Lista>
      <div className="note mx-4 mt-3.5">{pr.fonte}</div>
      {f.src === "user" && (
        <div className="px-4 pt-3">
          <button
            onClick={() => { if (confirm(`Apagar "${f.n}"? Isso não afeta dietas já salvas até você editá-las.`)) { st.apagarAlimento(f.id); onFechar(); } }}
            className="btn btn-gh btn-sm w-full text-warn"
          >Apagar este alimento</button>
        </div>
      )}
    </Sheet>
  );
}

function FormAlimento({ onFechar, onSalvar }: { onFechar: () => void; onSalvar: (f: Food) => void }) {
  const [v, setV] = useState({ n: "", kcal: "", p: "", c: "", g: "", fib: "", na: "", un: "g", md: "", mp: "", gr: "carbo" });
  const [lendo, setLendo] = useState(false);

  const txt = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV(s => ({ ...s, [k]: e.target.value }));
  const num = (s: string) => (s.trim() ? numBR(s) || 0 : 0);

  const salvar = () => {
    const n = v.n.trim();
    const kcal = num(v.kcal);
    if (!n || !kcal) return;
    onSalvar({
      id: "u:" + uid(), n, cat: "Meus rótulos", gr: v.gr as Familia,
      kcal, p: num(v.p), c: num(v.c), g: num(v.g), fib: num(v.fib), na: num(v.na),
      un: v.un as "g" | "ml",
      md: v.md.trim() || null, mp: num(v.mp) || null,
      mdp: v.md.trim() ? v.md.trim() + "s" : null,
      ok: true, src: "user",
    });
  };

  const campo = (k: keyof typeof v, rot: string, tipo = "text", ph = "") => (
    <div className="fld flex-1">
      <label htmlFor={`f-${k}`}>{rot}</label>
      <input id={`f-${k}`} className={tipo === "number" ? "num" : ""} type="text"
        inputMode={tipo === "number" ? "decimal" : undefined}
        value={v[k]} onChange={set(k)} placeholder={ph} />
    </div>
  );

  return (
    <Sheet aberto titulo="Cadastrar alimento" sub="Valores por 100 g ou 100 ml, como no rótulo" onFechar={onFechar}>
      <div className="px-4 pb-2">
        <button onClick={() => setLendo(true)} className="btn btn-gh flex w-full items-center justify-center gap-2">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 7a2 2 0 012-2h1.5l1-1.5h5L17 5h-2a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="10" cy="10.5" r="2.8" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Ler rótulo do produto
        </button>
        <div className="mt-3 flex gap-3">{campo("n", "Nome", "text", "Ex.: requeijão light da marca X")}</div>
        <div className="mt-3 flex gap-3">{campo("kcal", "Kcal", "number")}{campo("p", "Proteína", "number")}</div>
        <div className="mt-3 flex gap-3">{campo("c", "Carboidrato", "number")}{campo("g", "Gordura", "number")}</div>
        <div className="mt-3 flex gap-3">
          {campo("fib", "Fibra", "number")}
          {campo("na", "Sódio (mg)", "number")}
          <div className="fld max-w-[92px]">
            <label htmlFor="f-un">Base</label>
            <select id="f-un" value={v.un} onChange={set("un")}><option value="g">100 g</option><option value="ml">100 ml</option></select>
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          {campo("md", "Medida caseira", "text", "fatia, colher de sopa…")}
          <div className="max-w-[100px] flex-1">{campo("mp", "Peso dela (g)", "number", "25")}</div>
        </div>
        <div className="fld mt-3">
          <label htmlFor="f-gr">Família (define os substitutos)</label>
          <select id="f-gr" value={v.gr} onChange={set("gr")}>
            {FAMILIAS.map(k => <option key={k} value={k}>{GLBL[k]}</option>)}
          </select>
        </div>

        <button onClick={salvar} className="btn mt-5 w-full">Salvar alimento</button>

        <div className="note mt-3">
          <b>Dica:</b> se o rótulo só traz a coluna da porção (ex.: 30 g), use o
          <b> Ler rótulo</b> ali em cima — ele faz a conversão para 100 {v.un} sozinho.
        </div>
      </div>

      {lendo && (
        <LeitorRotulo
          onFechar={() => setLendo(false)}
          onUsar={c => setV(s => ({
            ...s,
            kcal: c.kcal !== undefined ? txt(c.kcal) : s.kcal,
            p: c.p !== undefined ? txt(c.p) : s.p,
            c: c.c !== undefined ? txt(c.c) : s.c,
            g: c.g !== undefined ? txt(c.g) : s.g,
            fib: c.fib !== undefined ? txt(c.fib) : s.fib,
            na: c.na !== undefined ? txt(c.na) : s.na,
            md: c.md ?? s.md,
            mp: c.mp !== undefined ? txt(c.mp) : s.mp,
            un: c.un,
          }))}
        />
      )}
    </Sheet>
  );
}
