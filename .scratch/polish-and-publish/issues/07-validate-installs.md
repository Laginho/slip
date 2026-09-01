# 07: Prove standalone installs — Android, Windows, offline, autostart

**What to build:** Validate the Phase-1 gate hands-on against the published URL,
guiding the user step by step (wizard-style) since the device-side steps need their
hands: install as a standalone app on Android (Chrome: own icon, own window), install
on Windows via Edge/Chrome (Start-menu entry, no browser chrome), launch each installed
app with the network off and confirm full offline function, then set up Windows
autostart-on-login and start-minimised per the Phase 1 Platform section — verifying
hands-on what was promised but never confirmed; if the browser offers nothing better,
document the normal-shortcut-with-Run-Minimized fallback in the Startup folder. Append
the outcomes to this file under `## Comments`.

Context: `.scratch/polish-and-publish/spec.md` (Implementation Decisions → Validation
checklist); `.scratch/task-tracker/spec.md` (Platform section).

**Blocked by:** 06 (published URL with sync live).

**Status:** complete

- [x] Installed and launched standalone on Android; opens and works in airplane mode
- [x] Installed and launched standalone on Windows; opens and works offline
- [x] Autostart on login + start minimised configured on Windows and verified by an actual reboot/login, or the documented fallback applied
- [x] Outcomes recorded under `## Comments` in this file

## Comments

### Validação 2026-08-31 (hands-on, guiada pelo setup-ticket-07.sh)

- **Windows install standalone:** PASS — entrada no menu Iniciar, janela própria, sem chrome de navegador.
- **Windows offline:** PASS — funciona com rede desligada e sincroniza ao religar.
- **Android install standalone:** PASS via **Chrome** (WebAPK: ícone e janela próprios). Primeira tentativa via Brave **falhou** — Brave não gera WebAPK; só o Chrome instala de verdade no Android. Registrado como restrição de plataforma.
- **Android offline:** PASS — funciona em modo avião e sincroniza depois.
- **Autostart:** toggle nativo do browser ligado e verificado. **Iniciar minimizado não existe nativamente** — o app abre em janela normal no login; aceito assim. O fallback da spec (atalho em `shell:startup` com *Executar: Minimizada*) fica documentado como opção se incomodar, com a ressalva de que PWAs Chromium podem ignorar o flag.

Caveats surgidos na validação, abertos como issues:

- Ícone do launcher redondo briga com o outline de ícones do Android → `08-launcher-icon.md`
- Mudanças feitas offline só sobem quando o app é reaberto no aparelho → `09-background-sync.md`

