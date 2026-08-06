# FestaBot Catalunya — Mejoras varias (track 2+3+4)

Fecha: 2026-08-06

## Contexto

El repo `festabot-catalunya` (Cloudflare Worker + D1 + Socrata, arquitectura de
coste cero) ya es funcional: webhook con idempotencia/lease, rate limit, extracción
de PDF, recordatorios con backoff, correcciones comunitarias, i18n ca/es y tests.
Este spec cubre tres huecos reales detectados leyendo el código, no especulación:

- `configureTelegramBot()` (src/services/telegram.ts:130) está exportado pero nunca
  se invoca desde index.ts → comandos/webhook solo se fijan a mano en BotFather.
- La migración 0001 crea `users.home_municipality` y `users.radius_km`, pero nadie
  las lee ni escribe; `/aprop` usa radio 30 hardcodeado.
- `getOfficialProgramDocument(_options)` ignora `fresh` (el prefijo `_` lo delata):
  `🔄 Actualitza` solo repagina texto ya sincronizado en D1 (hasta 30 min obsoleto) y
  nunca relee `source_updated_at`. La etiqueta "comprovat de nou" es engañosa.

Restricción dura: sin nuevas dependencias, sin IA, sin coste. Reutilizar secretos
(`PROGRAM_SYNC_SECRET`) y patrones ya existentes.

## 2. Configuración del bot auto-reparable

Objetivo: cablear `configureTelegramBot` para que el despliegue sea autónomo.

- Añadir `POST /internal/configure` en src/index.ts, protegido con el mismo patrón
  Bearer `PROGRAM_SYNC_SECRET` que `/internal/programs/sync` (reusar `secretsMatch`).
  Llama a `configureTelegramBot(context.env, <webhookUrl>)`.
- La `webhookUrl` se deriva de `context.env` (o se pasa por body opcional). Usar la
  URL base del request (`context.req.url`) para componer el webhook exacto
  `/telegram/webhook`.
- Añadir script `scripts/configure-bot.mjs` que hace POST al endpoint con el secreto
  desde `PROGRAM_SYNC_SECRET`. Añadir `npm run configure` en package.json, a ejecutar
  tras `npm run deploy`.
- No invocar en cada cold-start (ahorra 4 llamadas a la API de Telegram por aislamiento).
- Tests: endpoint con secreto incorrecto → 403; con secreto correcto → 200 y que se
  llamó `setMyCommands`/`setWebhook` (mock fetch de Telegram).

## 3. Usar columnas muertas `home_municipality` / `radius_km`

Objetivo: dar utilidad real a las columnas ya existentes, mejorando UX de `/aprop`.

- En `repositories/users.ts`: `setHomeMunicipality(env, id, value)` y
  `getUserPreferences(env, id)` que devuelva `{ homeMunicipality?, radiusKm }`.
- En `handleMessage`: al procesar `/municipi <x>` o un texto-suelta que resuelva a
  programa/resultados de municipio, guardar `home_municipality = x`.
- En `/aprop` y en el quick `nearby`: si no hay ubicación compartida, usar
  `home_municipality` como centro; radio por defecto = `radius_km` (min 5, max 100),
  cayendo a 30 si no está fijado. Hoy el radio 30 está hardcodeado en handlers.ts:350.
- i18n: añadir copy ca/es (`homeSet`, `apropUsingHome`) mínimo.
- Tests: `setHomeMunicipality` persiste; `getUserPreferences` devuelve defaults;

## 4. 🔄 Actualitza honesto

Objetivo: que el refresco refleje el `source_updated_at` real y sea transparente.

- `getOfficialProgramDocument(env, event, options)`: respetar `options.fresh`.
  - Si `fresh`: re-leer el detalle del evento vía `getEventByReference(reference,{fresh:true})`
    para obtener el `source_updated_at` actual, y buscar en D1 el documento con ese
    valor (no el cacheado en `event`).
  - Si no `fresh`: comportamiento actual (buscar con `event.sourceUpdatedAt`).
- En `programPages`/pie: mostrar `extracted_at` del documento (nuevo campo en
  `ProgramDocumentContent`) como "extret el <fecha>" para que el usuario vea frescura.
- Matizar la etiqueta: "comprovat de nou" → mantener, pero el pie aclara que la
  re-extracción real del PDF la hace el cron de 30 min de GitHub Actions (Worker no
  extrae PDF; lógica en scripts/sync-programs.mjs). No prometer más de lo que cumple.
- Tests: con `fresh`, la consulta a D1 usa el `source_updated_at` recién leído, no el
  del evento cacheado (mock DB).

## Fuera de alcance

- Follows completo (`/segueix`, digest semanal): se deja para un track posterior.
- Borrar columnas muertas: se descarta a favor de usarlas (decisión del usuario).
- IA / modelos de pago: nunca.

## Verificación

- `npm test` pasa (nuevos tests en 2/3/4).
- `npm run typecheck` limpio.
- Despliegue manual en staging: `npm run deploy && npm run configure` fija comandos
  y webhook; `/health` OK; escribir municipio suelto fija home; `/aprop` sin ubicación
  usa home+radio; `🔄 Actualitza` muestra `extracted_at`.
