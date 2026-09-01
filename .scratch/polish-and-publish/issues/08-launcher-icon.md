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

**Status:** ready-for-agent

- [ ] Ícone maskable full-bleed, conteúdo na zona segura de 80%
- [ ] Ícones any 192/512 sem pré-recorte circular
- [ ] Conferido no preview de maskable (DevTools ou maskable.app)
- [ ] Reinstalado no Android e conferido contra o outline do launcher
