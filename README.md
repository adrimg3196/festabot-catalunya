# FestaBot Catalunya

Bot de Telegram para descubrir fiestas, conciertos y actividades culturales de Catalunya. El producto funciona íntegramente dentro de Telegram y consulta la API pública de la Agenda Cultural de la Generalitat.

## Funciones del MVP

- `/avui [municipi]`: actividades de hoy.
- `/capdesetmana [municipi]`: planes del próximo fin de semana.
- `/aprop`: búsqueda por ubicación temporal, sin almacenarla.
- `/municipi <nom>`: búsqueda para los próximos siete días.
- `/concerts [municipi]`: música, conciertos y fiestas.
- `/pla <municipi>`: encuesta con tres planes para un grupo.
- Modo inline para compartir actividades en cualquier chat.
- Recordatorios, correcciones comunitarias y borrado de datos.
- Catalán y castellano.

## Arquitectura de coste cero

- Cloudflare Worker: webhook y lógica del bot.
- Cloudflare D1: idioma, recordatorios y correcciones.
- Telegram Bot API: única interfaz de usuario.
- Socrata `rhpv-yr4f`: fuente oficial consultada en tiempo real y cacheada.

No se utiliza ningún modelo de IA ni API de pago en producción.

## Desarrollo

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm test
npm run dev
```

## Despliegue

1. Autenticar Wrangler con `npx wrangler login`.
2. Crear D1 con `npx wrangler d1 create festabot-catalunya`.
3. Sustituir `database_id` en `wrangler.toml`.
4. Aplicar migraciones con `npm run db:migrate:remote`.
5. Guardar los tres secretos con `npx wrangler secret put`:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `ADMIN_TELEGRAM_ID` (opcional)
6. Desplegar con `npm run deploy`.
7. Configurar comandos, modo inline y webhook mediante BotFather/Telegram API.

Nunca se debe guardar el token de Telegram en el repositorio.

## Privacidad

La ubicación compartida se usa solo en memoria para calcular distancias y no se persiste. El usuario puede borrar idioma, seguimientos, recordatorios y correcciones con `/esborra_dades`.

## Fuente de datos

- [Agenda Cultural de Catalunya](https://agenda.cultura.gencat.cat/)
- [Dataset abierto](https://analisi.transparenciacatalunya.cat/d/rhpv-yr4f)

