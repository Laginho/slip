# 08: Launcher icon — respeitar a máscara do Android

**What to build:** Redesenhar os ícones do app. O ícone atual é um círculo pronto, e o
Android aplica a máscara do launcher por cima (squircle, quadrado arredondado, etc.) —
resultado: um círculo dentro de outro outline, visivelmente feio (constatado na
validação do ticket 07).

O ícone `maskable` correto é **arte quadrada full-bleed**: o fundo preenche os 512×512
inteiros e o conteúdo importante fica dentro da zona segura (círculo central de ~80% da
largura). O launcher recorta no formato que quiser. O ícone `any` (192/512) pode manter
silhueta própria, mas não deve ser um círculo pré-recortado.

Arquivos: `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`.
Sem mudança de código — o `manifest.webmanifest` já referencia os três com os purposes
certos. Validar com o preview de maskable do DevTools (Application → Manifest) ou
maskable.app antes de publicar.

Context: ticket `07-validate-installs.md` (Comments); `.scratch/task-tracker/spec.md`
(Colour — paleta do app, se o ícone derivar dela).

**Blocked by:** nada.

**Status:** ready-for-human

- [x] Ícone maskable full-bleed, conteúdo na zona segura de 80%
- [x] Ícones any 192/512 sem pré-recorte circular
- [x] Conferido no preview de maskable (DevTools ou maskable.app)
- [ ] Reinstalado no Android e conferido contra o outline do launcher

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
