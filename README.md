# Nutri — acompanhamento nutricional

PWA pessoal, local-first. Base TACO (NEPA/Unicamp, 4ª ed., 597 alimentos) offline,
motor de substituição por macro-âncora e acompanhamento de peso por média móvel.

Migrado de um protótipo em arquivo único cuja lógica nutricional já estava
validada; ela foi preservada integralmente, não reescrita.

O app abre com uma dieta de exemplo genérica. Dados reais entram por
**Ajustes → Restaurar de um backup**.

## Rodar

```
npm install
npm run dev      # abre em http://localhost:5173
npm test         # 36 testes do motor e dos cálculos de peso
npm run build    # gera dist/
```

## Estrutura

```
src/data/     JSONs extraídos do protótipo — TACO, famílias, medidas, semente
src/lib/      regras de negócio, sem React
  substitutes.ts       motor de substituição  (testado)
  weight.ts            média móvel e ritmo    (testado)
  nutrition-config.ts  âncoras, vizinhança, penalidades
  db.ts                IndexedDB via Dexie + export/import
src/screens/  as 5 telas
```

## Publicar no GitHub Pages

O `base` do Vite tem que apontar para o nome do repositório:

```
APPNUTRI_BASE=/NOME-DO-REPO/ npm run build
```

O deploy roda sozinho pelo GitHub Actions a cada push na branch `main`
(ver `.github/workflows/deploy.yml`).

## Regras que não devem ser quebradas

- **Nunca inventar valor nutricional.** Todo número vem da TACO ou de rótulo
  cadastrado pelo usuário, e a origem fica visível (TACO / RÓTULO / ESTIMADO).
- **Substituição iguala o macro-âncora, nunca as calorias.**
- **Os limiares de 1,2 e 0,55 kg/semana e os textos dos alertas são orientação
  clínica**, não copy. Não alterar sem motivo clínico.
- O mapa de famílias (`src/data/grupos.json`) foi curado à mão — margarina e
  gelatina em pó ficam deliberadamente sem família. Não regenerar por regex.
