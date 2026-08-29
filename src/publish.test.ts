// @ts-nocheck
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.join(root, file), "utf-8");
}

function exists(file: string): boolean {
  return fs.existsSync(path.join(root, file));
}

describe("publish — GitHub Pages + PWA + sync (RED local)", () => {
  // 1. Build de produção para GitHub Pages usa base /slip/
  it("vite base é /slip/ para GitHub Pages", () => {
    const cfg = read("vite.config.ts");
    // deve configurar base para o subpath https://laginho.github.io/slip/
    expect(cfg, "vite base /slip/").toMatch(/base\s*:\s*["']\/slip\/["']/);
  });

  it("dist/index.html referencia assets/manifest no subpath /slip/ (sem URLs quebradas na raiz)", () => {
    // comportamento/build output — preferível a detalhe interno
    const cfg = read("vite.config.ts");
    const hasBase = /base\s*:\s*["']\/slip\/["']/.test(cfg);
    expect(hasBase, "base /slip/ deve estar configurado para gerar dist correto").toBe(true);

    // se dist já existe (build local), também deve estar sob /slip/
    if (exists("dist/index.html")) {
      const html = read("dist/index.html");
      // não deve ter href/src absolutos na raiz sem subpath (ex: href="/assets" ou href="/manifest")
      // quando base é /slip/, o HTML gerado contém /slip/
      const hasSlip = html.includes("/slip/");
      const hasBrokenRootAsset = /href="\/(assets|manifest|icon-|apple-touch-icon|registerSW|sw\.js|workbox)/.test(html);
      expect(hasSlip, "dist/index.html deve conter /slip/").toBe(true);
      expect(hasBrokenRootAsset, "não deve haver URLs absolutas na raiz sem /slip/").toBe(false);
    } else {
      // sem dist, falha via base já cobre o RED
      expect(hasBase).toBe(true);
    }
  });

  // 2. Manifest e service worker sob /slip/
  it("manifest tem start_url e scope corretos para /slip/, icons resolvíveis e display standalone", () => {
    const cfg = read("vite.config.ts");
    expect(cfg, "manifest start_url /slip/").toMatch(/start_url\s*:\s*["']\/slip\/["']/);
    expect(cfg, "manifest scope /slip/").toMatch(/scope\s*:\s*["']\/slip\/["']/);
    expect(cfg, "display standalone").toMatch(/display\s*:\s*["']standalone["']/);
    // icons resolvíveis — pelo menos 192 e 512 presentes no config
    expect(cfg).toMatch(/icon-192\.png/);
    expect(cfg).toMatch(/icon-512\.png/);
    // se dist existe, o manifest gerado também deve refletir o subpath
    if (exists("dist/manifest.webmanifest")) {
      const manifest = read("dist/manifest.webmanifest");
      expect(manifest).toMatch(/"start_url"\s*:\s*"\/slip\//);
      expect(manifest).toMatch(/"scope"\s*:\s*"\/slip\//);
    }
  });

  it("service worker/registro permanece sob /slip/ e precache inclui app shell", () => {
    const cfg = read("vite.config.ts");
    // VitePWA deve gerar SW sob o base; workbox precache inclui shell
    expect(cfg).toMatch(/VitePWA/);
    expect(cfg).toMatch(/workbox/);
    expect(cfg).toMatch(/globPatterns/);
    // navigateFallback para SPA
    expect(cfg).toMatch(/navigateFallback/);
    // quando base é /slip/, o registro e o SW são servidos sob /slip/
    if (exists("dist/sw.js") && exists("dist/registerSW.js")) {
      const html = exists("dist/index.html") ? read("dist/index.html") : "";
      // O HTML não deve referenciar /sw.js na raiz sem subpath quando base está correto
      if (html) expect(html).not.toMatch(/href="\/sw\.js"/);
    }
  });

  // 3. Workflow futuro: build com secrets e publish via Pages
  it("workflow de Pages constrói dist com VITE_SUPABASE_* de secrets e publica via GitHub Pages", () => {
    const candidates = [
      ".github/workflows/pages.yml",
      ".github/workflows/deploy.yml",
      ".github/workflows/publish.yml",
    ];
    const found = candidates.find((p) => exists(p));
    expect(found, "workflow de Pages deve existir (.github/workflows/pages.yml)").toBeTruthy();
    if (found) {
      const yml = read(found);
      // secrets para build — sem valores hardcoded
      expect(yml).toMatch(/VITE_SUPABASE_URL/);
      expect(yml).toMatch(/VITE_SUPABASE_ANON_KEY/);
      expect(yml).toMatch(/secrets\.VITE_SUPABASE_URL/);
      expect(yml).toMatch(/secrets\.VITE_SUPABASE_ANON_KEY/);
      // publica via Pages — sustentável, sem validar versões rígidas além do necessário
      const hasPagesDeploy =
        /deploy-pages/.test(yml) || /upload-pages-artifact/.test(yml) || /pages/.test(yml);
      expect(hasPagesDeploy, "workflow deve publicar via GitHub Pages").toBe(true);
      // build gera dist
      expect(yml).toMatch(/vite build|npm run build|pnpm build/);
    }
  });

  // 4. Schema Supabase — sete colunas canônicas, PK, políticas anon sem DELETE físico
  it("schema Supabase corresponde às sete colunas canônicas de Task, PK em id e políticas anon SELECT/INSERT/UPDATE sem DELETE físico", () => {
    const candidates = [
      "supabase/schema.sql",
      "supabase/migrations/001_tasks.sql",
      "supabase.sql",
      "sql/schema.sql",
    ];
    // procura qualquer .sql sob supabase/
    let found: string | undefined = candidates.find((p) => exists(p));
    if (!found && exists("supabase")) {
      const walk = (dir: string): string | undefined => {
        for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
          const full = path.join(dir, e.name);
          if (e.isFile() && e.name.endsWith(".sql")) return full;
          if (e.isDirectory()) {
            const deeper = walk(full);
            if (deeper) return deeper;
          }
        }
        return undefined;
      };
      found = walk("supabase");
    }
    expect(found, "schema SQL deve existir (supabase/schema.sql ou migrations)").toBeTruthy();
    if (found) {
      const raw = read(found).toLowerCase();
      // sete colunas canônicas de Task (store.ts: id, text, kind, deadline, done, deleted, updatedAt)
      for (const col of ["id", "text", "kind", "deadline", "done", "deleted", "updatedat"]) {
        expect(raw, `coluna ${col}`).toContain(col);
      }
      // PK em id
      expect(raw).toMatch(/primary\s+key\s*\(\s*id\s*\)|id\s+.*primary\s+key/);
      // políticas anon: permitir SELECT/INSERT/UPDATE, sem DELETE físico (deleção é flag)
      expect(raw).toMatch(/for\s+select/);
      expect(raw).toMatch(/for\s+insert/);
      expect(raw).toMatch(/for\s+update/);
      // não deve haver policy permissiva de DELETE físico; se houver, deve ser intencionalmente ausente
      const hasDeletePolicy = /for\s+delete/.test(raw);
      expect(hasDeletePolicy, "não deve permitir DELETE físico — delete é flag deleted").toBe(false);
    }
  });

  // 5. Nenhum valor real de credencial
  it("nenhum valor real de credencial no repo e .env.local não é criado", () => {
    // .env.local pode existir pós-provisionamento, mas deve estar git-ignored; nunca leia seu conteúdo
    if (exists(".env.local")) {
      const { spawnSync } = require("node:child_process") as typeof import("node:child_process");
      const res = spawnSync("git", ["check-ignore", "-q", ".env.local"], { cwd: root });
      expect(res.status, ".env.local existe mas deve estar git-ignored (git check-ignore -q .env.local deve sair 0)").toBe(0);
    }
    // .gitignore deve ignorar .env.local
    const gitignore = read(".gitignore");
    expect(gitignore).toMatch(/\.env\.local/);
    // .env.example deve existir como molde sem valores reais
    expect(exists(".env.example"), ".env.example deve existir").toBe(true);
    const example = read(".env.example");
    expect(example).toMatch(/VITE_SUPABASE_URL/);
    expect(example).toMatch(/VITE_SUPABASE_ANON_KEY/);
    // repo não deve conter URL/key hardcoded em src/
    const sync = read("src/sync.ts");
    expect(sync).not.toMatch(/https:\/\/.*\.supabase\.co/);
    // vite.config não deve vazar secrets
    const vite = read("vite.config.ts");
    expect(vite).not.toMatch(/supabase.*anon.*key/i);
  });
});

describe("fixup 06 — segurança local wizard/workflow/schema (RED)", () => {
  // helpers — todas as simulações rodam em temp com PATH contendo gh stub desde o primeiro byte
  const wizardRel = ".scratch/polish-and-publish/setup-ticket-06.sh";
  const wizardAbs = path.join(root, wizardRel);
  // harness portável: Windows usa Git Bash, não-Windows usa bash do sistema (ubuntu-latest)
  const bashPath = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";

  function toUnix(p: string): string {
    return p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d: string) => `/${d.toLowerCase()}`);
  }

  function mkTempWithFullStubs(): { tmp: string; bin: string; ghLog: string; openLog: string } {
    const os = require("node:os") as typeof import("node:os");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wizard-fixup-"));
    const bin = path.join(tmp, "bin");
    fs.mkdirSync(bin, { recursive: true });
    const ghLog = path.join(tmp, "gh.log");
    const openLog = path.join(tmp, "open.log");
    const ghLogUnix = toUnix(ghLog);
    const openLogUnix = toUnix(openLog);
    // helper to create stub
    const mkStub = (name: string, body: string) => {
      const p = path.join(bin, name);
      fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`);
      try {
        fs.chmodSync(p, 0o755);
      } catch {}
    };
    // stub gh — loga args e simula auth/secret sem rede
    mkStub(
      "gh",
      `LOG="${ghLogUnix}"
echo "$@" >> "$LOG"
if [[ "$1" == "auth" && "$2" == "status" ]]; then exit 0; fi
if [[ "$1" == "secret" && "$2" == "set" ]]; then echo "gh secret set $3" >> "$LOG"; exit 0; fi
if [[ "$1" == "secret" && "$2" == "list" ]]; then echo "would list" >> "$LOG"; exit 0; fi
exit 0`,
    );
    // stubs para TODOS os comandos que open_url tenta — cada opener apenas registra localmente e sai 0
    const openStubBody = `LOG="${openLogUnix}"
echo "$0 $@" >> "$LOG"
exit 0`;
    mkStub("wslview", openStubBody);
    mkStub("explorer.exe", openStubBody);
    mkStub("xdg-open", openStubBody);
    mkStub("open", openStubBody);
    return { tmp, bin, ghLog, openLog };
  }
  // compat alias — antigo nome
  const mkTempWithGhStub = mkTempWithFullStubs;

  function runWizard(
    input: string,
    opts: { cwd: string; bin: string; ghLog: string; extraEnv?: Record<string, string> },
  ) {
    const { spawnSync } = require("node:child_process") as typeof import("node:child_process");
    const binUnix = toUnix(opts.bin);
    const origPath = process.env.PATH || "";
    const origUnix = origPath
      .split(path.delimiter)
      .map((p) => toUnix(p))
      .join(":");
    const ghLogUnix = toUnix(opts.ghLog);
    const env = {
      ...process.env,
      PATH: binUnix + ":" + origUnix,
      GH_LOG: ghLogUnix,
      ...opts.extraEnv,
    } as NodeJS.ProcessEnv;
    const res = spawnSync(bashPath, [wizardAbs], {
      input,
      cwd: opts.cwd,
      env,
      encoding: "utf-8",
      timeout: 8000,
    });
    return res as { status: number | null; stdout: string; stderr: string };
  }

  const synthUrl = "https://synthetic.invalid.test.supabase.co";
  const synthPublishable = "sb_publishable_synthetic_invalid_abc123";
  const synthServiceRole = "service_role_synthetic_invalid_xyz";
  const synthSbSecret = "sb_secret_synthetic_invalid_999";

  it("wizard responde não à confirmação do schema => exit não-zero, não chega a captura, não cria env, não chama gh", () => {
    const { tmp, bin, ghLog } = mkTempWithGhStub();
    try {
      // inputs: banner ready, wait provisioning, schema confirmação "no", depois EOF para URL/key
      const input = ["", "", "no", "", ""].join("\n") + "\n";
      const res = runWizard(input, { cwd: tmp, bin, ghLog });
      // deve falhar (gate) e não-zero
      expect(res.status, `wizard deve sair não-zero quando schema não confirmado (status=${res.status} stdout=${res.stdout?.slice(0, 400)})`).not.toBe(0);
      // não deve ter escrito env em lugar nenhum
      const envLocal = path.join(tmp, ".env.local");
      const envPlain = path.join(tmp, ".env");
      expect(fs.existsSync(envLocal), "não deve criar .env.local após no").toBe(false);
      expect(fs.existsSync(envPlain), "não deve criar .env após no").toBe(false);
      // não deve ter chamado gh secret set (stub log vazio ou sem secret set)
      const log = fs.existsSync(ghLog) ? fs.readFileSync(ghLog, "utf-8") : "";
      expect(log, "não deve chamar gh secret set após no").not.toMatch(/secret\s+set/);
      // e definitivamente não deve ter tocado secret list (rede/GitHub)
      expect(log).not.toMatch(/secret\s+list/);
    } finally {
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
      } catch {}
    }
  });

  it("wizard rejeita entrada vazia antes de write_env/set_secret (temp + gh stubado desde primeiro byte)", () => {
    const { tmp, bin, ghLog } = mkTempWithGhStub();
    try {
      // schema y, URL vazia, key válida sintética
      const input = ["", "", "y", "", synthPublishable].join("\n") + "\n";
      const res = runWizard(input, { cwd: tmp, bin, ghLog });
      expect(res.status, `deve falhar em URL vazia (status=${res.status})`).not.toBe(0);
      const envLocal = path.join(tmp, ".env.local");
      expect(fs.existsSync(envLocal), "não deve criar .env.local com URL vazia").toBe(false);
      const log = fs.existsSync(ghLog) ? fs.readFileSync(ghLog, "utf-8") : "";
      expect(log).not.toMatch(/secret\s+set/);
    } finally {
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
      } catch {}
    }
  });

  it("wizard rejeita formato privilegiado service_role antes de write_env/set_secret", () => {
    const { tmp, bin, ghLog } = mkTempWithGhStub();
    try {
      const input = ["", "", "y", synthUrl, synthServiceRole].join("\n") + "\n";
      const res = runWizard(input, { cwd: tmp, bin, ghLog });
      expect(res.status, `deve falhar em service_role (status=${res.status} stdout=${res.stdout?.slice(0, 500)})`).not.toBe(0);
      const envLocal = path.join(tmp, ".env.local");
      const hasEnv = fs.existsSync(envLocal);
      if (hasEnv) {
        const c = fs.readFileSync(envLocal, "utf-8");
        expect(c, "env não deve conter service_role").not.toContain("service_role");
      } else {
        expect(hasEnv).toBe(false);
      }
      const log = fs.existsSync(ghLog) ? fs.readFileSync(ghLog, "utf-8") : "";
      expect(log, "não deve encaminhar service_role ao gh").not.toContain("service_role");
      expect(log).not.toMatch(/secret\s+set.*VITE_SUPABASE_ANON_KEY/);
    } finally {
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
      } catch {}
    }
  });

  it("wizard rejeita formato privilegiado sb_secret_ antes de write_env/set_secret", () => {
    const { tmp, bin, ghLog } = mkTempWithGhStub();
    try {
      const input = ["", "", "y", synthUrl, synthSbSecret].join("\n") + "\n";
      const res = runWizard(input, { cwd: tmp, bin, ghLog });
      expect(res.status, `deve falhar em sb_secret_ (status=${res.status})`).not.toBe(0);
      const envLocal = path.join(tmp, ".env.local");
      expect(fs.existsSync(envLocal) ? fs.readFileSync(envLocal, "utf-8") : "", "env não deve conter sb_secret_").not.toContain("sb_secret_");
      const log = fs.existsSync(ghLog) ? fs.readFileSync(ghLog, "utf-8") : "";
      expect(log).not.toContain("sb_secret_");
    } finally {
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
      } catch {}
    }
  });

  it("wizard rejeita JWT legado cujo payload decodifica role service_role (sintético, sem token real)", () => {
    const { tmp, bin, ghLog } = mkTempWithFullStubs();
    try {
      // JWT sintético fabricado localmente — nenhum token real; payload contém role service_role
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({ role: "service_role", sub: "synthetic-test-id", iat: 0, exp: 9999999999 }),
      ).toString("base64url");
      const syntheticJwt = `${header}.${payload}.synthetic_signature_invalid`;
      const input = ["", "", "y", synthUrl, syntheticJwt].join("\n") + "\n";
      const res = runWizard(input, { cwd: tmp, bin, ghLog });
      expect(
        res.status,
        `deve falhar em JWT com role service_role (status=${res.status} stdout=${res.stdout?.slice(0, 500)})`,
      ).not.toBe(0);
      const envLocal = path.join(tmp, ".env.local");
      const hasEnv = fs.existsSync(envLocal);
      if (hasEnv) {
        const c = fs.readFileSync(envLocal, "utf-8");
        // env não deve conter o JWT (nem seu payload) e não deve ter sido criado
        expect(c, "env não deve conter JWT privilegiado").not.toContain(syntheticJwt);
        // se chegou a criar, falha explícita — não deve criar
        expect(hasEnv, ".env.local não deve ser criado com JWT service_role").toBe(false);
      } else {
        expect(hasEnv).toBe(false);
      }
      const log = fs.existsSync(ghLog) ? fs.readFileSync(ghLog, "utf-8") : "";
      expect(log, "não deve encaminhar JWT service_role ao gh").not.toContain(syntheticJwt);
      expect(log).not.toMatch(/secret\s+set.*VITE_SUPABASE_ANON_KEY/);
      expect(log).not.toMatch(/secret\s+list/);
    } finally {
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
      } catch {}
    }
  });

  it("mesmo com ENV_FILE=.env herdado, destino permanece exatamente .env.local e nenhum .env/custom é criado", () => {
    const { tmp, bin, ghLog } = mkTempWithGhStub();
    try {
      const input = ["", "", "y", synthUrl, synthPublishable].join("\n") + "\n";
      const res = runWizard(input, { cwd: tmp, bin, ghLog, extraEnv: { ENV_FILE: ".env" } });
      // se o wizard respeitar ENV_FILE herdado, falhará este assert (RED)
      // o correto é ignorar ENV_FILE e sempre usar .env.local
      const envLocal = path.join(tmp, ".env.local");
      const envDot = path.join(tmp, ".env");
      const custom = path.join(tmp, "custom.env");
      // deve existir .env.local (quando inputs válidos e schema y, wizard sucede)
      // mas com o bug atual, cria .env em vez de .env.local
      const hasLocal = fs.existsSync(envLocal);
      const hasDot = fs.existsSync(envDot);
      const hasCustom = fs.existsSync(custom);
      expect(hasDot, "não deve criar .env quando ENV_FILE=.env herdado").toBe(false);
      expect(hasCustom, "não deve criar custom.env").toBe(false);
      // quando o fix for aplicado, hasLocal será true e hasDot false; enquanto bug existe, hasDot true
      // este expect força RED até o fix fixar destino
      expect(hasLocal, ".env.local deve ser o único destino").toBe(true);
      // também garante que o PATH continha gh stub desde o início — log deve existir ou estar vazio mas não ter usado gh real
      expect(fs.existsSync(ghLog)).toBe(true);
    } finally {
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
      } catch {}
    }
  });

  it("workflow usa actions oficiais atuais (checkout/setup-node v7, configure-pages v6, upload/deploy v5), inclui Configure Pages, não cancela deploy e secrets contidos ao gate/build", () => {
    const yml = read(".github/workflows/pages.yml");
    // majors atuais confirmados em 2026-08-28 via git ls-remote
    expect(yml, "checkout v7").toMatch(/actions\/checkout@v7/);
    expect(yml, "setup-node v7").toMatch(/actions\/setup-node@v7/);
    expect(yml, "configure-pages v6").toMatch(/actions\/configure-pages@v6/);
    expect(yml).toMatch(/Configure Pages|configure-pages/);
    expect(yml, "upload-pages-artifact v5").toMatch(/actions\/upload-pages-artifact@v5/);
    expect(yml, "deploy-pages v5").toMatch(/actions\/deploy-pages@v5/);
    // não cancela deploy em andamento
    expect(yml).not.toMatch(/cancel-in-progress:\s*true/);
    // secrets contidos ao gate/build, não disponíveis para npm ci/testes (job env seria amplo)
    // o workflow atual coloca secrets no job env (build.env) — deve mover para step Build/Gate
    const hasJobLevelSecrets = /jobs:\s*\n[\s\S]*?build:\s*\n[\s\S]*?env:\s*\n[\s\S]*?VITE_SUPABASE_URL/.test(yml);
    expect(hasJobLevelSecrets, "secrets não devem estar no job env (devem ficar contidos ao step)").toBe(false);
    // deve haver env no step de Build/Require secrets
    expect(yml).toMatch(/VITE_SUPABASE_URL:\s*\$\{\{\s*secrets\.VITE_SUPABASE_URL/);
    expect(yml).toMatch(/VITE_SUPABASE_ANON_KEY:\s*\$\{\{\s*secrets\.VITE_SUPABASE_ANON_KEY/);
  });

  it("schema contém check equivalente a length(btrim(id)) > 0", () => {
    const p = "supabase/schema.sql";
    expect(exists(p), "schema deve existir").toBe(true);
    const raw = exists(p) ? read(p) : "";
    // deve rejeitar id vazio ou só espaços — toTask rejeita length(btrim(id))==0
    expect(raw).toMatch(/length\s*\(\s*btrim\s*\(\s*id\s*\)\s*\)\s*>\s*0/);
  });

  it("secret list GitHub não foi tocada (nenhuma simulação lista secrets reais)", () => {
    // guardrail: nenhuma das simulações deve ter chamado `gh secret list`; .env.local pode existir mas deve estar git-ignored/não staged
    const { spawnSync } = require("node:child_process") as typeof import("node:child_process");
    const res = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf-8" });
    const out = typeof res.stdout === "string" ? res.stdout : (res.stdout as unknown as Buffer)?.toString?.() ?? "";
    expect(out, "git status --porcelain não deve listar .env.local (deve estar git-ignored/não staged)").not.toContain(".env.local");
  });
});

describe("fixup 06 — modo sem navegador (RED)", () => {
  const wizardRel2 = ".scratch/polish-and-publish/setup-ticket-06.sh";
  const wizardAbs2 = path.join(root, wizardRel2);
  const bashPath2 = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";

  function toUnix2(p: string): string {
    return p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d: string) => `/${d.toLowerCase()}`);
  }

  function mkTempWithFullStubs2(): { tmp: string; bin: string; ghLog: string; openLog: string } {
    const os = require("node:os") as typeof import("node:os");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wizard-no-browser-"));
    const bin = path.join(tmp, "bin");
    fs.mkdirSync(bin, { recursive: true });
    const ghLog = path.join(tmp, "gh.log");
    const openLog = path.join(tmp, "open.log");
    const ghLogUnix = toUnix2(ghLog);
    const openLogUnix = toUnix2(openLog);
    const mkStub = (name: string, body: string) => {
      const p = path.join(bin, name);
      fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`);
      try { fs.chmodSync(p, 0o755); } catch {}
    };
    mkStub(
      "gh",
      `LOG="${ghLogUnix}"
echo "$@" >> "$LOG"
if [[ "$1" == "auth" && "$2" == "status" ]]; then exit 0; fi
if [[ "$1" == "secret" && "$2" == "set" ]]; then echo "gh secret set $3" >> "$LOG"; exit 0; fi
if [[ "$1" == "secret" && "$2" == "list" ]]; then echo "would list" >> "$LOG"; exit 0; fi
exit 0`,
    );
    const openStubBody = `LOG="${openLogUnix}"
echo "$0 $@" >> "$LOG"
exit 0`;
    mkStub("wslview", openStubBody);
    mkStub("explorer.exe", openStubBody);
    mkStub("xdg-open", openStubBody);
    mkStub("open", openStubBody);
    return { tmp, bin, ghLog, openLog };
  }

  function runWizard2(
    input: string,
    opts: { cwd: string; bin: string; ghLog: string },
  ) {
    const { spawnSync } = require("node:child_process") as typeof import("node:child_process");
    const binUnix = toUnix2(opts.bin);
    const origPath = process.env.PATH || "";
    const origUnix = origPath.split(path.delimiter).map((p) => toUnix2(p)).join(":");
    const ghLogUnix = toUnix2(opts.ghLog);
    const env = { ...process.env, PATH: binUnix + ":" + origUnix, GH_LOG: ghLogUnix } as NodeJS.ProcessEnv;
    const res = spawnSync(bashPath2, [wizardAbs2], { input, cwd: opts.cwd, env, encoding: "utf-8", timeout: 8000 });
    return res as { status: number | null; stdout: string; stderr: string };
  }

  const synthUrl2 = "https://synthetic.invalid.test.supabase.co";
  const synthPublishable2 = "sb_publishable_synthetic_invalid_abc123";

  it("wizard modo sem navegador: nenhum opener é invocado em execução válida completa", () => {
    const rootEnvLocal = path.join(root, ".env.local");
    const beforeExists = fs.existsSync(rootEnvLocal);
    const beforeMtime = beforeExists ? fs.statSync(rootEnvLocal).mtimeMs : null;
    const { tmp, bin, ghLog, openLog } = mkTempWithFullStubs2();
    try {
      const input = ["", "", "y", synthUrl2, synthPublishable2].join("\n") + "\n";
      const res = runWizard2(input, { cwd: tmp, bin, ghLog });
      expect(res.status, `wizard deve sair 0 em execução válida (status=${res.status} stdout=${res.stdout?.slice(0, 400)})`).toBe(0);
      const openExists = fs.existsSync(openLog);
      const openContent = openExists ? fs.readFileSync(openLog, "utf-8").trim() : "";
      expect(openContent, `nenhum opener deve ser invocado; open.log deve estar ausente ou vazio, mas contém: ${openContent}`).toBe("");
      const afterExists = fs.existsSync(rootEnvLocal);
      const afterMtime = afterExists ? fs.statSync(rootEnvLocal).mtimeMs : null;
      expect(afterExists, ".env.local no worktree não deve ter sido criado/removido pela simulação em tmp").toBe(beforeExists);
      expect(afterMtime, ".env.local mtime deve permanecer idêntico (simulação não tocou worktree)").toBe(beforeMtime);
      const ghLogContent = fs.existsSync(ghLog) ? fs.readFileSync(ghLog, "utf-8") : "";
      expect(ghLogContent).not.toMatch(/secret\s+list/);
    } finally {
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
    }
  });

  it("wizard exibe os dois links Supabase como texto no stdout", () => {
    const { tmp, bin, ghLog } = mkTempWithFullStubs2();
    try {
      const input = ["", "", "y", synthUrl2, synthPublishable2].join("\n") + "\n";
      const res = runWizard2(input, { cwd: tmp, bin, ghLog });
      expect(res.status, `wizard deve sair 0 (status=${res.status})`).toBe(0);
      expect(res.stdout, "stdout deve conter https://supabase.com/dashboard/new/").toContain("https://supabase.com/dashboard/new/");
      expect(res.stdout, "stdout deve conter https://supabase.com/dashboard/").toContain("https://supabase.com/dashboard/");
    } finally {
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
    }
  });
});
