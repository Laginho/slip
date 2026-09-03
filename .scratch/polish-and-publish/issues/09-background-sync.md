# 09: Mudanças offline só sobem quando o app reabre no aparelho

**What to build:** Hoje o sync roda apenas com o app aberto. Cenário real da validação
do ticket 07: PC desligado, usuário registra mudanças no celular sem internet e fecha o
app. De volta em casa, o celular recupera rede com o app fechado — nada sobe. O PC liga,
sincroniza, e não vê as mudanças do celular até que o app seja reaberto lá.

Não é bug do merge (o modelo local-first do ADR 0001 aceita sync na abertura); é uma
lacuna de quando o push acontece. Candidatos, do mais barato ao mais completo:

1. **Push no evento `online` e no `visibilitychange`** enquanto o app está aberto —
   algumas linhas em `useSession.ts`, mas não cobre o caso do app fechado.
2. **Background Sync API (one-shot)** no service worker: registrar um sync quando um
   write acontece offline; o SO dispara o evento quando a conectividade volta, mesmo com
   o app fechado (Chromium/Android). Exige que o SW consiga fazer o push — hoje o merge
   vive em `src/sync.ts` no app; o SW precisaria ler o snapshot local e enviar.

Decidir o alcance antes de implementar: se o caso 1 já reduzir a janela o bastante no
uso real, o caso 2 pode não valer o custo (SW com lógica própria de sync é exatamente o
tipo de código "parece certo, está errado" que a spec manda não delegar).

Context: ticket `07-validate-installs.md` (Comments);
`docs/adr/0001-local-first-whole-document-sync.md`; `src/sync.ts`; `src/useSession.ts`.

**Blocked by:** nada.

**Status:** ready-for-agent

- [x] Decidido o alcance (evento online vs Background Sync no SW) — candidato 1, ver Comments
- [ ] Implementado com teste cobrindo o cenário do ticket 07
- [ ] Validado hands-on: mudança offline no celular sobe sem reabrir o app (ou a
      limitação residual fica documentada aqui)

## Comments

### Decisão de alcance 2026-09-03 (master)

**Candidato 1 neste ciclo; candidato 2 fora de escopo.** Sync em `online` e em
`visibilitychange` → `visible`, reaproveitando o `roundTrip()` de `useSession.ts` (o timer do
debounce pendente é absorvido — a lista mais recente é o que sobe). Cobre: app aberto ou em
segundo plano ainda vivo quando a rede volta (as mudanças offline sobem); app voltando ao
primeiro plano (as mudanças do outro aparelho descem — é isto que faz o PC ver o celular sem
reabrir nada).

Não cobre: processo do app morto pelo SO enquanto offline. Background Sync no SW resolveria
esse caso, mas só em Chromium, exige SW customizado (`injectManifest`), uma segunda cópia da
regra de merge (ou um guard de `updatedAt` no Postgres) e não é testável em unidade — exatamente
o código "parece certo, está errado" que a spec manda não delegar. Vira ticket novo só se a
validação hands-on mostrar que a janela residual incomoda no uso real.

Ciclo PTMR: handoff `01-to-plan-09.md` (retorno `02`), base `feat/09-background-sync`.
