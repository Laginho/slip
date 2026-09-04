# 08: Launcher icon — respeitar a máscara do Android

**What to build:** Redesenhar os ícones do app. O ícone atual é um círculo pronto, e o
Android aplica a máscara do launcher por cima (squircle, quadrado arredondado, etc.) —
resultado: um círculo dentro de outro outline, visivelmente feio (constatado na
validação do ticket 07).

O ícone `maskable` correto é **arte quadrada full-bleed**: o fundo preenche os 512×512
inteiros e o conteúdo importante fica dentro da zona segura (círculo central de ~80% da
largura). O launcher recorta no formato que quiser. O ícone `any` (192/512) pode manter
silhueta própria, mas não deve ser um círculo pré-recortado.

Arquivos: `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`,
`public/apple-touch-icon.png` (escopo ampliado em 2026-09-03 — o iOS também aplica a própria
máscara ao apple-touch-icon, então um círculo pré-recortado tem o mesmo defeito lá).
Sem mudança de código — o `manifest.webmanifest` já referencia os três com os purposes
certos. Validar com o preview de maskable do DevTools (Application → Manifest) ou
maskable.app antes de publicar.

Context: ticket `07-validate-installs.md` (Comments); `.scratch/task-tracker/spec.md`
(Colour — paleta do app, se o ícone derivar dela).

**Blocked by:** nada.

**Status:** complete

- [x] Ícone maskable full-bleed, conteúdo na zona segura de 80%
- [x] Ícones any 192/512 sem pré-recorte circular
- [x] Apple touch icon 180 full-bleed, mesma arte do maskable
- [x] Conferido no preview de maskable (DevTools ou maskable.app)
- [x] Reinstalado no Android e conferido contra o outline do launcher

## Comments

### Execução 2026-09-03 (master, sem ciclo PTMR — ticket só de assets)

- Diagnóstico: os ícones `any` (192/512) já eram quadrados arredondados. Só
  `icon-maskable-512.png` e `apple-touch-icon.png` eram círculos pré-recortados — e o iOS
  também aplica a própria máscara ao apple-touch-icon, então ele entra na mesma correção.
- Como: o `icon-512.png` existente composto sobre um quadrado full-bleed `#e3683e`
  (`CARD.work.medium`), gerando o maskable 512 e o apple-touch-icon 180 (box filter). O check
  branco fica byte-a-byte igual ao do ícone `any`; nenhum código do app mudou.
- Medido: cantos opacos na cor de fundo; o check ocupa x 133–387 / y 157–361, distância
  máxima do centro 157px contra os 205px da zona segura (80%).
- Preview de máscara (círculo, squircle, quadrado arredondado, sem máscara) no Browser pane:
  nenhum outline interno em nenhum formato.
- Pendente humano: reinstalar no Android via Chrome (WebAPK) e conferir contra o outline do
  launcher — o WebAPK só regenera o ícone numa nova instalação ou atualização do manifest.

### Revisão independente 2026-09-03 (Codex)

**Veredito:** implementação dos assets correta; uma correção de escopo documental é
necessária antes da aprovação. O ticket continua `ready-for-human` até a reinstalação no
Android.

#### Finding aberto — escopo do arquivo Apple touch icon

- O PR altera `public/apple-touch-icon.png`, mas a lista exaustiva em `Arquivos:` cita
  apenas `icon-192.png`, `icon-512.png` e `icon-maskable-512.png`.
- Isso conflita com `.scratch/task-tracker/spec.md` (File tree): arquivos fora da lista
  do ticket são um diff rejeitado.
- A correção técnica é coerente — o iOS também aplica sua própria máscara —, portanto a
  recomendação é expandir explicitamente o escopo do ticket para incluir
  `public/apple-touch-icon.png` e sua validação, em vez de reverter o asset.

#### Evidências da revisão

- `public/icon-maskable-512.png`: 512×512, zero pixels transparentes ou semitransparentes;
  os quatro cantos são `#e3683e`.
- O RGB do maskable é idêntico, pixel a pixel, ao `icon-512.png`; apenas o canal alfa foi
  preenchido. O check alcança no máximo 157,17 px do centro, dentro do raio seguro de
  204,8 px (80%).
- `public/apple-touch-icon.png`: 180×180, totalmente opaco, com cantos `#e3683e`.
- Os ícones `any` 192/512 não mudaram e já têm silhueta quadrada arredondada, sem
  pré-recorte circular.
- `npm test`: 9 arquivos e 217 testes passaram.
- `npx tsc --noEmit`: passou.
- `npm run build`: passou; manifest, maskable e Apple touch icon foram emitidos em
  `dist/`, e o link final do Apple touch icon usa `/slip/apple-touch-icon.png`.
- `git diff --check main...feat/08-launcher-icon`: limpo.

#### Gate humano ainda pendente

- Reinstalar o WebAPK pelo Chrome no Android e conferir o ícone contra a máscara real do
  launcher. Até essa confirmação, não marcar o Ticket 08 como `complete`.

### Fechamento 2026-09-04

Reinstalado no Android via Chrome (WebAPK) e conferido contra o outline do launcher pelo
usuário: OK. PR #17. Ticket `complete`.
