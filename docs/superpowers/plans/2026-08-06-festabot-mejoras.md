# FestaBot Catalunya — Mejoras varias (2+3+4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cablear la configuración auto-reparable del bot, dar uso real a las columnas `home_municipality`/`radius_km`, y hacer que `🔄 Actualitza` refleje el `source_updated_at` real y sea transparente.

**Architecture:** Tres cambios aislados sobre el Worker existente. (2) Endpoint protegido que invoca la función `configureTelegramBot` ya escrita. (3) Persistir/leer preferencias de usuario en D1 y usarlas en `/aprop`. (4) Hacer `getOfficialProgramDocument` consciente de `fresh` y mostrar `extracted_at`. Sin nuevas dependencias, sin IA, sin coste: reutiliza `PROGRAM_SYNC_SECRET` y los patrones de mock (vitest `vi.stubGlobal("fetch")`) ya presentes.

**Tech Stack:** TypeScript, Hono, Cloudflare D1, vitest, wrangler.

## Global Constraints

- Sin nuevas dependencias en package.json. (spec)
- Sin IA ni modelos de pago; arquitectura de coste cero se mantiene. (spec)
- Reutilizar `PROGRAM_SYNC_SECRET` y `secretsMatch` para el endpoint de configuración. (spec)
- Tests en vitest con `vi.stubGlobal("fetch", ...)` y `Response.json(...)`, igual que `test/telegram.test.ts`. (repo)
- Idioma de cara al usuario: ca/es vía `t(language)`. (repo)
- Commits frecuentes, uno por task. (skill)

---

### Task 1: Endpoint `/internal/configure` protegido

**Files:**
- Modify: `src/index.ts` (añadir ruta tras el bloque `/internal/programs/sync`, ~línea 134)
- Test: `test/configure.test.ts` (crear)

**Interfaces:**
- Consumes: `configureTelegramBot(env: Env, webhookUrl: string)` de `../src/services/telegram`; `secretsMatch` ya en `index.ts`; `context.env.PROGRAM_SYNC_SECRET`.
- Produces: respuesta HTTP 200 si secreto OK y Telegram responde ok; 403 si secreto incorrecto; 404 si `PROGRAM_SYNC_SECRET` ausente (igual que el endpoint de sync).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from "vitest";
import app from "../src/index";

const secret = "configure-shared-secret";
const env = {
  PROGRAM_SYNC_SECRET: secret,
  TELEGRAM_BOT_TOKEN: "bot-token",
  TELEGRAM_WEBHOOK_SECRET: "webhook-secret"
} as unknown as Parameters<typeof app.request>[1];

afterEach(() => vi.unstubAllGlobals());

describe("/internal/configure", () => {
  it("rejects wrong secret with 403", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));
    const res = await app.request("/internal/configure", {
      method: "POST",
      headers: { Authorization: `Bearer wrong` }
    }, env);
    expect(res.status).toBe(403);
  });

  it("calls setMyCommands and setWebhook when secret matches", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input).split("/").at(-1) ?? "");
      return Response.json({ ok: true, result: true });
    }));
    const res = await app.request("/internal/configure", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` }
    }, env);
    expect(res.status).toBe(200);
    expect(calls).toContain("setMyCommands");
    expect(calls).toContain("setWebhook");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `cd /Users/adri/festabot-catalunya && npx vitest run test/configure.test.ts`
  Expected: FAIL (404/405 — ruta no existe).

- [ ] **Step 3: Write minimal implementation**
  En `src/index.ts`, importar `configureTelegramBot` y añadir tras el endpoint de sync:

```typescript
app.post("/internal/configure", async (context) => {
  const expectedSecret = context.env.PROGRAM_SYNC_SECRET;
  if (!expectedSecret) return context.json({ ok: false }, 404);
  const authorization = context.req.header("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")
    || !secretsMatch(authorization.slice("Bearer ".length), expectedSecret)) {
    return context.json({ ok: false }, 403);
  }
  const base = new URL(context.req.url);
  const webhookUrl = `${base.protocol}//${base.host}/telegram/webhook`;
  try {
    await configureTelegramBot(context.env, webhookUrl);
  } catch (error) {
    console.error("Bot configuration failed", { error: String(error) });
    return context.json({ ok: false }, 502);
  }
  return context.json({ ok: true });
});
```

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd /Users/adri/festabot-catalunya && npx vitest run test/configure.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
```bash
cd /Users/adri/festabot-catalunya && git add src/index.ts test/configure.test.ts && git commit -m "feat: endpoint /internal/configure cablea configureTelegramBot"
```

---

### Task 2: Script `configure-bot.mjs` y `npm run configure`

**Files:**
- Create: `scripts/configure-bot.mjs`
- Modify: `package.json` (añadir script `"configure"`)

**Interfaces:**
- Consumes: variable de entorno `PROGRAM_SYNC_SECRET`; endpoint `POST /internal/configure` del Task 1.
- Produces: script que POSTea con el Bearer y falla con código != 0 si la respuesta no es ok.

- [ ] **Step 1: Write the script**

```javascript
const SECRET = process.env.PROGRAM_SYNC_SECRET;
const ENDPOINT = process.env.CONFIGURE_ENDPOINT || "https://festabot-catalunya.adrimg3196.workers.dev/internal/configure";

if (!SECRET) {
  console.error("PROGRAM_SYNC_SECRET is required");
  process.exit(1);
}

const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { Authorization: `Bearer ${SECRET}` }
});

if (!response.ok) {
  console.error(`Bot configuration failed: ${response.status}`);
  process.exit(1);
}

console.log("Bot commands and webhook configured");
```

- [ ] **Step 2: Add the npm script**
  En `package.json`, dentro de `"scripts"`, añadir:
```json
"configure": "node scripts/configure-bot.mjs"
```

- [ ] **Step 3: Smoke test (sin red real)**
  Run: `cd /Users/adri/festabot-catalunya && PROGRAM_SYNC_SECRET=x CONFIGURE_ENDPOINT=http://127.0.0.1:9/internal/configure node scripts/configure-bot.mjs; echo "exit=$?"`
  Expected: exit=1 (falla conexión, pero confirma que valida el secreto y sale distinto de 0).

- [ ] **Step 4: Commit**
```bash
cd /Users/adri/festabot-catalunya && git add scripts/configure-bot.mjs package.json && git commit -m "feat: npm run configure dispara /internal/configure"
```

---

### Task 3: Persistir y leer preferencias de usuario (`home_municipality` / `radius_km`)

**Files:**
- Modify: `src/repositories/users.ts` (añadir `setHomeMunicipality` y `getUserPreferences`)
- Test: `test/users.test.ts` (crear)

**Interfaces:**
- Consumes: `env.DB` (D1) con tabla `users` (columnas `home_municipality TEXT`, `radius_km INTEGER`).
- Produces:
  - `setHomeMunicipality(env: Env, telegramId: number, municipality: string): Promise<void>`
  - `getUserPreferences(env: Env, telegramId: number): Promise<{ homeMunicipality?: string; radiusKm: number }>` (radiusKm por defecto 25, clamp 5..100).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { setHomeMunicipality, getUserPreferences } from "../src/repositories/users";
import type { Env } from "../src/types";

const env = { DB: { prepare: () => ({ bind: () => ({ run: async () => {}, first: async () => null }) }) } } as unknown as Env;

describe("user preferences", () => {
  it("returns default radius 25 when unset", async () => {
    const prefs = await getUserPreferences(env, 123);
    expect(prefs.radiusKm).toBe(25);
    expect(prefs.homeMunicipality).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `cd /Users/adri/festabot-catalunya && npx vitest run test/users.test.ts`
  Expected: FAIL (función no definida).

- [ ] **Step 3: Write minimal implementation**
  En `src/repositories/users.ts`, añadir al final:

```typescript
export async function setHomeMunicipality(env: Env, telegramId: number, municipality: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO users (telegram_id, language, home_municipality)
     VALUES (?, 'ca', ?)
     ON CONFLICT(telegram_id) DO UPDATE SET home_municipality = excluded.home_municipality, updated_at = CURRENT_TIMESTAMP`
  ).bind(String(telegramId), municipality.slice(0, 120)).run();
}

export async function getUserPreferences(env: Env, telegramId: number): Promise<{ homeMunicipality?: string; radiusKm: number }> {
  const row = await env.DB.prepare(
    "SELECT home_municipality, radius_km FROM users WHERE telegram_id = ?"
  ).bind(String(telegramId)).first<{ home_municipality?: string; radius_km?: number }>();
  const radiusRaw = Number(row?.radius_km ?? 25);
  const radiusKm = Number.isFinite(radiusRaw) ? Math.min(100, Math.max(5, radiusRaw)) : 25;
  return { homeMunicipality: row?.home_municipality ?? undefined, radiusKm };
}
```

- [ ] **Step 4: Run test to verify it passes**
  Run: `cd /Users/adri/festabot-catalunya && npx vitest run test/users.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
```bash
cd /Users/adri/festabot-catalunya && git add src/repositories/users.ts test/users.test.ts && git commit -m "feat: persistir/leer home_municipality y radius_km"
```

---

### Task 4: Usar preferencias en `/aprop` y guardar municipio al buscar

**Files:**
- Modify: `src/handlers.ts` (imports + `/aprop` + quick `nearby` + guardar home en `handleMessage`)
- Modify: `src/i18n.ts` (añadir `homeSet` y `apropUsingHome` en ca/es)
- Test: `test/aprop.test.ts` (crear)

**Interfaces:**
- Consumes: `setHomeMunicipality`, `getUserPreferences` (Task 3); `municipalitySlug` y `getEvents` ya existentes.
- Produces: en `/aprop`/`quick:nearby` sin ubicación, usar `homeMunicipality` como centro y `radiusKm` como radio (clamp 5..100, fallback 30). Al resolver un municipio suelto o `/municipi <x>`, guardar `home_municipality`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { getUserPreferences } from "../src/repositories/users";
import type { Env } from "../src/types";

const stored: Record<string, { home_municipality?: string; radius_km?: number }> = {
  "7": { home_municipality: "blanes", radius_km: 15 }
};
const env = {
  DB: { prepare: () => ({ bind: () => ({ first: async () => stored["7"] ?? null, run: async () => {} }) }) }
} as unknown as Env;

describe("aprop preferences", () => {
  it("reads persisted home and radius", async () => {
    const prefs = await getUserPreferences(env, 7);
    expect(prefs.homeMunicipality).toBe("blanes");
    expect(prefs.radiusKm).toBe(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `cd /Users/adri/festabot-catalunya && npx vitest run test/aprop.test.ts`
  Expected: FAIL (o pasa trivialmente si reusa Task 3; completar con test de handler tras implementar).

- [ ] **Step 3: Implement i18n**
  En `src/i18n.ts`, añadir en el objeto `ca`:
```typescript
homeSet: "He guardat <code>%MUNICIPI%</code> com a poble per defecte. Ara <code>/aprop</code> et mostrarà plans a prop sense compartir la teva ubicació.",
apropUsingHome: "📍 Plans a prop de %MUNICIPI% (no deso la teva ubicació):"
```
  y en `es`:
```typescript
homeSet: "He guardado <code>%MUNICIPI%</code> como pueblo por defecto. Ahora <code>/aprop</code> te mostrará planes cerca sin compartir tu ubicación.",
apropUsingHome: "📍 Planes cerca de %MUNICIPI% (no guardo tu ubicación):"
```

- [ ] **Step 4: Implement handlers**
  En `src/handlers.ts`:
  - Añadir imports: `import { getUserPreferences, setHomeMunicipality } from "./repositories/users";`
  - En `handleMessage`, tras resolver municipio suelto (bloque `if (text.length <= 80)` ~línea 375), si `programDelivery !== "missing"` o hubo resultados, guardar: `await setHomeMunicipality(env, userId, text)` cuando el texto resuelva a municipio (usar `municipalitySlug(text)` para validar).
  - En el case `municipi`/`municipio` (~línea 281): tras enviar resultados, `await setHomeMunicipality(env, userId, argument)`.
  - Crear helper `async function sendNearby(env, chatId, language, origin?, userId)` que:
    - si `origin` presente → usa lat/lon y `radiusKm` de preferencias (clamp 5..100, fallback 25);
    - si no, lee `getUserPreferences`, y si hay `homeMunicipality`, hace `sendResults` con `municipality: prefs.homeMunicipality` y un mensaje `apropUsingHome` con el nombre; si tampoco hay home, `sendMessage(labels.askLocation, locationKeyboard)` como hoy.
  - Reemplazar los dos puntos que hoy llaman a `sendResults(... latitude/longitude ...)` y el `quick:nearby` para usar `sendNearby`.

- [ ] **Step 5: Run full test suite**
  Run: `cd /Users/adri/festabot-catalunya && npx vitest run`
  Expected: PASS

- [ ] **Step 6: Commit**
```bash
cd /Users/adri/festabot-catalunya && git add src/handlers.ts src/i18n.ts test/aprop.test.ts && git commit -m "feat: /aprop usa home_municipality y radius_km, guarda municipio al buscar"
```

---

### Task 5: `getOfficialProgramDocument` consciente de `fresh`

**Files:**
- Modify: `src/services/program-document.ts` (respetar `fresh`)
- Modify: `src/domain/program.ts` (añadir `extractedAt?` a `ProgramDocumentContent`; mostrarlo en `programPages`)
- Test: `test/program-document.test.ts` (crear)

**Interfaces:**
- Consumes: `getEventByReference(reference, { fresh })` de `../src/services/agenda`.
- Produces:
  - `getOfficialProgramDocument(env, event, { fresh }): Promise<OfficialProgramDocument | null>` donde `OfficialProgramDocument = { sourceUrl, text, extractedAt? }`.
  - Al llamar con `fresh: true`, re-lee el detalle para obtener `source_updated_at` actual y busca en D1 ese valor (no el cacheado en `event`).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from "vitest";
import { getOfficialProgramDocument } from "../src/services/program-document";
import type { Env, EventItem } from "../src/types";

function makeEnv(updatedAts: string[]): Env {
  let call = 0;
  return {
    DB: { prepare: () => ({ bind: () => ({ first: async () => {
      const ua = updatedAts[Math.min(call++, updatedAts.length - 1)];
      return ua ? { source_url: "https://x/programa.pdf", text: "text", extracted_at: "2026-08-06T10:00:00.000Z" } : null;
    } }) }) }
  } as unknown as Env;
}

const event: EventItem = {
  code: "2025071300001", municipalitySlug: "blanes", municipality: "Blanes",
  title: "Festa Major", startsAt: "2026-08-10T00:00:00.000", endsAt: "2026-08-15T23:59:59.999",
  categories: [], sourceUpdatedAt: "2026-07-01T00:00:00.000Z", programDocumentUrls: ["https://x/programa.pdf"]
};

describe("getOfficialProgramDocument fresh", () => {
  it("queries D1 with the freshly read source_updated_at when fresh=true", async () => {
    const seen: string[] = [];
    const env = {
      DB: { prepare: (sql: string) => ({ bind: (_c: string, _u: string, ua: string) => {
        seen.push(ua);
        return { first: async () => ({ source_url: "https://x/programa.pdf", text: "text", extracted_at: "2026-08-06T10:00:00.000Z" }) };
      } }) }
    } as unknown as Env;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, result: [{ ...event, source_updated_at: "2026-08-05T00:00:00.000Z" }] })));
    const doc = await getOfficialProgramDocument(env, event, { fresh: true });
    expect(doc).not.toBeNull();
    expect(seen).toContain("2026-08-05T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `cd /Users/adri/festabot-catalunya && npx vitest run test/program-document.test.ts`
  Expected: FAIL (ignora fresh, usa `event.sourceUpdatedAt`).

- [ ] **Step 3: Implement**
  En `src/services/program-document.ts`:
```typescript
export interface OfficialProgramDocument {
  sourceUrl: string;
  text: string;
  extractedAt?: string;
}

export async function getOfficialProgramDocument(
  env: Env,
  event: EventItem,
  options: { fresh?: boolean } = {}
): Promise<OfficialProgramDocument | null> {
  let sourceUpdatedAt = event.sourceUpdatedAt ?? "";
  if (options.fresh) {
    const refreshed = await getEventByReference(event.code, { fresh: true });
    if (refreshed?.sourceUpdatedAt) sourceUpdatedAt = refreshed.sourceUpdatedAt;
  }
  for (const sourceUrl of event.programDocumentUrls ?? []) {
    const row = await env.DB.prepare(`
      SELECT source_url, text, extracted_at FROM program_documents
      WHERE event_code = ?1 AND source_url = ?2 AND source_updated_at = ?3 LIMIT 1
    `).bind(event.code, sourceUrl, sourceUpdatedAt).first<{ source_url: string; text: string; extracted_at: string }>();
    if (row?.text) return { sourceUrl: row.source_url, text: row.text, extractedAt: row.extracted_at };
  }
  return null;
}
```
  Nota: añadir `import { getEventByReference } from "../services/agenda";`.

- [ ] **Step 4: Show extracted_at in programPages**
  En `src/domain/program.ts`, añadir `extractedAt?` a `ProgramDocumentContent` y en `programPages` incluir en `footer`:
```typescript
const extracted = document?.extractedAt
  ? ` · 📄 ${copy.extracted} ${formatTimestamp(document.extractedAt, language)}`
  : "";
```
  y añadir a `labels` ca/es: `extracted: "Extret el"`. Insertar `${extracted}` antes de `<i>${copy.source}</i>` en footer.

- [ ] **Step 5: Run full test suite**
  Run: `cd /Users/adri/festabot-catalunya && npx vitest run`
  Expected: PASS

- [ ] **Step 6: Commit**
```bash
cd /Users/adri/festabot-catalunya && git add src/services/program-document.ts src/domain/program.ts test/program-document.test.ts && git commit -m "feat: refresco honesto respeta fresh y muestra extracted_at"
```

---

### Task 6: typecheck + suite final + commit general

**Files:**
- None new.

- [ ] **Step 1: Typecheck**
  Run: `cd /Users/adri/festabot-catalunya && npm run typecheck`
  Expected: sin errores de tipos.

- [ ] **Step 2: Full suite**
  Run: `cd /Users/adri/festabot-catalunya && npm test`
  Expected: todos los tests PASS.

- [ ] **Step 3: Commit de cierre (si hubo ajustes menores)**
```bash
cd /Users/adri/festabot-catalunya && git add -A && git commit -m "chore: typecheck y tests verdes tras mejoras 2+3+4" || echo "nothing to commit"
```
