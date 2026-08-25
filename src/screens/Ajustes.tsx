import { useRef, useState } from "react";
import { useStore } from "../lib/store";
import { exportar, importar } from "../lib/db";
import { numBR, hoje } from "../lib/format";
import type { Ajustes as TAjustes } from "../lib/types";

export function Ajustes() {
  const st = useStore();
  const [v, setV] = useState(() => ({
    pesoRef: String(st.ajustes.pesoRef).replace(".", ","),
    metaKcal: st.ajustes.metaKcal?.toString() ?? "",
    metaP: st.ajustes.metaP?.toString() ?? "",
    metaC: st.ajustes.metaC?.toString() ?? "",
    metaG: st.ajustes.metaG?.toString() ?? "",
  }));
  const [msg, setMsg] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV(s => ({ ...s, [k]: e.target.value }));
  const opc = (s: string) => (s.trim() ? numBR(s) || null : null);

  const gravar = async () => {
    const a: TAjustes = {
      pesoRef: numBR(v.pesoRef) || 91,
      metaKcal: opc(v.metaKcal), metaP: opc(v.metaP), metaC: opc(v.metaC), metaG: opc(v.metaG),
    };
    await st.salvarAjustes(a);
    setMsg("Ajustes salvos.");
    setTimeout(() => setMsg(""), 2500);
  };

  const baixar = async () => {
    const txt = await exportar();
    const url = URL.createObjectURL(new Blob([txt], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `nutri-backup-${hoje()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const restaurar = async (f: File) => {
    if (!confirm("Restaurar o backup APAGA os dados atuais do app e coloca os do arquivo no lugar. Continuar?")) return;
    try {
      await importar(await f.text());
      await st.recarregar();
      setMsg("Backup restaurado.");
    } catch (err) {
      setMsg(`Não deu para restaurar: ${(err as Error).message}`);
    }
  };

  const campo = (k: keyof typeof v, rot: string, ph: string) => (
    <div className="fld flex-1">
      <label htmlFor={`a-${k}`}>{rot}</label>
      <input id={`a-${k}`} className="num" type="text" inputMode="decimal" value={v[k]} onChange={set(k)} placeholder={ph} />
    </div>
  );

  return (
    <div className="px-4 pb-4" style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}>
      <h2 className="text-[21px] font-semibold">Ajustes</h2>

      <p className="sh">Peso de referência</p>
      <div className="card px-4 py-3.5">
        <div className="flex gap-3">{campo("pesoRef", "Peso (kg)", "91,0")}</div>
        <div className="note mt-3">
          Usado só para calcular <b>g/kg</b> de proteína e gordura nas dietas. Não afeta
          nenhum valor nutricional nem a tela de Peso.
        </div>
      </div>

      <p className="sh">Metas de macro <span className="normal-case tracking-normal">(opcional)</span></p>
      <div className="card px-4 py-3.5">
        <div className="flex gap-3">{campo("metaKcal", "Kcal", "1900")}{campo("metaP", "Proteína (g)", "180")}</div>
        <div className="mt-3 flex gap-3">{campo("metaC", "Carbo (g)", "180")}{campo("metaG", "Gordura (g)", "60")}</div>
        <div className="note mt-3">
          Deixe em branco para o app usar os totais da própria dieta do dia como meta —
          é o comportamento atual.
        </div>
      </div>

      <button onClick={gravar} className="btn mt-4 w-full">Salvar ajustes</button>
      {msg && <div className="note note-gd mt-2.5">{msg}</div>}

      <p className="sh">Backup</p>
      <div className="card px-4 py-3.5">
        <button onClick={baixar} className="btn btn-gh w-full">Baixar backup (.json)</button>
        <button onClick={() => arquivo.current?.click()} className="btn btn-gh mt-2 w-full">Restaurar de um backup</button>
        <input
          ref={arquivo} type="file" accept="application/json,.json" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) restaurar(f); e.target.value = ""; }}
        />
        <div className="note mt-3">
          Seus dados ficam <b>só neste aparelho</b> — não há conta nem nuvem. Se você
          apagar o app ou limpar os dados do navegador, eles se perdem. O backup é a
          única rede de segurança: baixe o arquivo de vez em quando e guarde onde
          preferir.
        </div>
      </div>

      <p className="sh">Sobre</p>
      <div className="card px-4 py-3.5">
        <div className="text-[13px] leading-relaxed text-[#4A5763]">
          Base <b>TACO</b> — Tabela Brasileira de Composição de Alimentos, NEPA/Unicamp,
          4ª edição. 597 alimentos, offline.<br />
          <span className="num text-[11px] text-dim">
            {st.foods.length} rótulo{st.foods.length === 1 ? "" : "s"} seu{st.foods.length === 1 ? "" : "s"} ·{" "}
            {st.diets.length} dieta{st.diets.length === 1 ? "" : "s"} ·{" "}
            {st.weights.length} pesagem{st.weights.length === 1 ? "" : "ns"} ·{" "}
            {Object.keys(st.days).length} dia{Object.keys(st.days).length === 1 ? "" : "s"} registrado{Object.keys(st.days).length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
