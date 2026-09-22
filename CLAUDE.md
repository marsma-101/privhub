# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PrivHub（私域枢纽）— a LAN document-management server for a single company. One Node
process serves an HTTP API **and** the SPA that consumes it.

Two facts shape everything else:

- **There is no build step.** TypeScript sources run directly via `tsx/esm`; frontend
  plugin files are plain ES modules loaded by the browser. No bundler, no `dist/`,
  no compiled output. Edit a source file and restart the process — that is the whole
  cycle.
- **The repo root is not the app root.** The runnable app is `privhub/`. Run every
  npm/node command from inside `privhub/`.

`references/engine/` is a vendored snapshot of the upstream engine (DSH) this project
was extracted from. It is a separate pnpm workspace with its own `CLAUDE.md` — do not
fold it into PrivHub work.

## Commands

All from `privhub/`:

```bash
npm run dev                    # == node --import tsx/esm src/main.ts --port 3180
./start.bat                    # Windows launcher, dev  (3180)
./start.bat 3181               # Windows launcher, prod (3181); sets PRIVHUB_ROOT
```

There is no lint, typecheck, or `npm test` script. The only quality gates are the
regression suites.

```bash
node tests/run-all.mjs --spawn   # full regression: spawns an isolated instance on 3190
node tests/run-all.mjs           # same, against an already-running server at PRIVHUB_TEST_BASE
```

`run-all.mjs` **hard-refuses ports 3180/3181** — those hold real data. Use 3190 or
higher. It also runs a second batch of static suites that need no server:

```bash
node tests/frontend-templates.mjs   # compiles every Vue template, checks UI invariants
node tests/admin-console.mjs        # mounts the admin shell in a fake DOM
node tests/personal-ui.mjs
node tests/audit-reliability.mjs
node tests/integrity.mjs            # plugin/file contract completeness
node tests/first-run.mjs
node tests/preview-limits.mjs       # self-contained: spawns its own instance on 3196
node --import tsx/esm tests/rag-resilience.mjs   # self-contained: spawns on 3195
```

To run **one** HTTP suite, drive its exported `build()` yourself (a server must be up):

```bash
node -e "Promise.all([import('./tests/smoke.mjs'),import('./tests/lib.mjs')]).then(async([m,l])=>{const r=await m.build().run();process.exit(l.report([{suite:'smoke',results:r}])?0:1)})"
```

Deploy (from repo root, PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-deploy.ps1
powershell -ExecutionPolicy Bypass -File scripts/build-deploy.ps1 -WhatIfOnly
```

## Architecture

### Assembly tiers

`privhub/src/main.ts` is the whole wiring diagram. Plugins are mounted in strict order
because cordis services must exist before their consumers `inject` them:

1. `WebServerService` (own code, registered as `ctx.webServer` under the key the
   original DSH base used, so plugin code did not have to change).
2. **L2 capability services** — `svc-storage` first (everything injects it), then
   `svc-events`, `svc-audit`, `svc-acl`, `svc-watermark`, `svc-search`, `svc-meta`,
   `svc-collab`, `svc-office`, `svc-model`.
3. **L1 hubs** — `core` (owns all shared state), then `admin-acl`, `auth`, `files`,
   `trash`, `admin`, `shell`.
4. **L3 plugins** — auto-discovered from `<PRIVHUB_ROOT>/plugins/*/src/index.ts`,
   sorted by directory name, skipping names starting with `_` (e.g. `_retired-v2`).
   Installing/removing a feature = adding/removing a directory. No edit to `main.ts`.

`PRIVHUB_ROOT` anchors every data path anywhere in the codebase. Unset ⇒ `process.cwd()`.
This is why `start.bat` sets it and why tests spawn with `cwd` inside a scratch root.

Client-only plugins (a `client/` dir with no `src/index.ts`) are never mounted
server-side; they contribute UI only.

### Plugin shape

Server side, every plugin exports the same three things:

```ts
export const name = 'privhub-files'
export const inject = ['privhub', 'audit', 'storage', 'eventBus']
export function apply(ctx: Context): void { ... }
```

`main.ts` adapts that to a cordis object plugin. Only `core`, `svc-storage` and
`svc-model` additionally declare a `Config` schema (schemastery).

Cordis service keys available on `ctx`: `webServer`, `storage`, `eventBus`, `audit`,
`acl`, `watermark`, `search`, `meta`, `collab`, `office`, `model`, `privhub`.

### HTTP layer

Routing is a flat `Map<pathname, handler>` — **exact match only, no path parameters**.
Everything goes through query string or JSON body.

```ts
ctx.privhub.route('/privhub/api/list', async (req, res) => {
  const u = ctx.privhub.requireUser(req, res)   // writes 401 itself, returns null
  if (!u) return
  if (!ctx.privhub.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
  json(res, 200, { ok: true, entries: await ctx.privhub.listFiles(project, subPath) })
}, 'list')   // third arg is the effect label used for disposer bookkeeping
```

Conventions, uniformly applied:

- Response envelope is always `{ ok: true, ... }` or `{ ok: false, error: '<Chinese>' }`.
- `json()` / `readBody()` / `readJsonBody()` come from `privhub-core/src/index.ts`, not
  from a local helper.
- Ordering is `method check → auth → authz → work`. Errors never leak stack traces.
- Plugin code reaches across directories by relative import
  (`../../privhub-core/src/index`) — there is no workspace package resolution.

Body size: 16 MB default (env `PRIVHUB_BODY_MAX_MB`). Two routes are exempt from the
server's pre-check because they enforce their own contracts: `/privhub/api/upload`
(2 GB, streamed straight to disk) and `/privhub/api/agent/v1/write` (200 MB).

Extension points that are easy to miss:

- **ACL guard** — `privhub-admin-acl` monkey-patches `svc.route` at mount time, so every
  route registered *after* it passes through file-level ACL. It does nothing for routes
  not listed in its `GUARD_PATHS` table: **a new file-touching route that is not added
  there silently bypasses ACL.**
- **Events** — declare with `ctx.eventBus.declareEmit/declareListen`. The registry
  (`privhub-svc-events`) documents the live contracts: `audit:logged`, `file:changed`,
  `file:saved`, `meta:changed`.

### Identity, sessions, permissions

Two auth channels, and both are load-bearing. `Authorization: Bearer <token>` for API
calls; fallback to the `privhub_sid` cookie. The cookie exists because the browser
`import()`s plugin JS as subresources and **cannot attach custom headers** — without it
plugin code (and therefore the entire UI) would 401. Static plugin files require a live
session too, except plugins whose manifest declares the `auth` slot.

Permissions live in `ctx.privhub`:
`canAccess` / `visibleProjects` / `indexableProjects`.

The model has two kinds of top-level directory under `data-files/`, and confusing them is
the main source of security bugs:

- **Projects** — the normal case. Admins see all; users see `user.projects`.
- **Personal spaces** — top-level dirs registered in `users[].personalDir`, named after
  the user's display name. Visible only to their owner, **not even to admins**, excluded
  from every index/dedup/vector path, and never auto-deleted. Renaming a user renames the
  directory and hashes the old name into `retiredPersonalDirs` so it can never be reused
  (reuse would hand a stranger the previous owner's version history and comments).

Path safety: `resolveInProject` does string containment; `resolveReal` re-checks via
`realpath` against junctions and symlinks. Use `resolveReal` for read/write handlers.

### Storage and encryption

All user files and system JSON go through `ctx.storage`, which is **AES-256-GCM with a
`PHENC1` header, with transparent plaintext passthrough** so unmigrated files still read.
Use `ctx.storage.readText/writeText/readBuffer/writeBuffer/createReadStream/
createWriteStream` — never bare `fs` for these, or the data will be readable on disk and
`isEncrypted` size math will drift.

Key resolution: env `PRIVHUB_SECRET` (sha256-derived), else `data/secret.key` (32 random
bytes, auto-created). **Losing that file makes existing data unrecoverable.** This is why
`scripts/build-deploy.ps1` refuses to touch a target `data/` unless `-IncludeData` is
passed, and why it is deliberately ASCII-only (Windows PowerShell 5.1 mangles non-BOM
UTF-8 `.ps1` files into parse errors).

Audit records append as independently encrypted blocks, so `auditScan()` returns
block-level integrity stats. If those stats are dropped, corruption becomes invisible —
that failure mode already happened once (a 446 MB damaged store).

### Frontend

`privhub/frontend/index.html` is the entire skeleton: Vue 3 global build, a single
`<script>` that defines the nav state machine and `window.PrivHub`, plus CSS custom
properties for the two themes. Everything else is a plugin.

Boot sequence and why it is shaped this way:

1. Exchange any stored token for a session cookie (`/privhub/api/me`).
2. Fetch `/privhub/api/shell/manifest` — **unconditionally, including when logged out**.
   The login form is itself a plugin, so the endpoint returns a reduced manifest
   (`partial: true`) to anonymous callers. Making it 401 causes a login deadlock that has
   already shipped once.
3. `import(p.entry)` each manifest and the module's exported components into slots.
4. On login, re-fetch for the full manifest.

Client plugin contract is a default export of `{ id, slots: { [slot]: Component } }`
served from `/privhub-plugins/<dir>/index.js`. Multiple plugins may share a slot; components
accumulate in an array. Slots declared by manifests today: `auth`, `project-tabs`,
`user-area`, `app-iconbar`, `welcome`, `tree`, `panel`, `preview`, `trash-view`,
`search-view`, `fav-view`, `settings`, `acl`, `audit`, `tags`, `template`, `kg`, `wiki`,
`rag-view`, `agent-view`, `admin`, `admin-console`, `admin-settings`, `admin-tags`,
`admin-template`, `admin-trash`, `upload`, `upload-queue`, `watermark`, `md-editor`,
`office-editor`.

`index.html` renders a fixed set of slots and hands `slot-comps` to the `admin-console`
plugin, which renders the `admin-*` slots itself. Adding a *new* slot name means editing
`index.html`; reusing an existing one does not.

`window.PrivHub` is the only cross-plugin channel: `api()`, `AUTH`, `THEME`, `nav`, `bus`,
`toast`, `badges`, `fileIcon`, plus `openSettings/openAdmin/openAcl/...` shortcuts.

Because components use string `template:` (runtime compilation), the CSP must keep
`unsafe-eval`. Removing it white-screens every plugin.

## Testing

Suites are hand-rolled (`tests/lib.mjs`): `createSuite(name)` + `ok/eq/includes`, driven
over real HTTP with `node:http`. There is no test framework and no mocking — a suite
spawns or connects to a real server and asserts on real responses and, where relevant,
on files on disk.

Rules that keep the suites honest:

- Never target 3180/3181. `run-all.mjs` enforces this; keep it that way.
- Disk-level assertions only run when `PRIVHUB_TEST_ROOT` is set; `--spawn` passes it
  through. A suite run without it degrades to silent no-op assertions.
- A suite must clean up its own artifacts (conventional prefix, e.g. `_smoke_`).
- Prefer assertions about behaviour over line numbers or implementation details — the
  tests are meant to fail when behaviour regresses, not when code moves.

## Windows notes

This is developed and deployed on Windows. Junctions are used for test roots (linking
`src`/`plugins`/`frontend`/`node_modules` into a scratch directory), and `listFiles`
skips symbolic links to prevent traversal out of the data root. `realpath` checks exist
specifically because junction escapes are reachable.
