# FestaBot Catalunya

![Icono de FestaBot Catalunya](assets/festabot-avatar.png)

Bot de Telegram para descubrir fiestas, conciertos y actividades culturales de Catalunya. El producto funciona íntegramente dentro de Telegram y consulta la API pública de la Agenda Cultural de la Generalitat.

En producción: [@FestaCatalunyaBot](https://t.me/FestaCatalunyaBot) · [estado del servicio](https://festabot-catalunya.adrimg3196.workers.dev/health)

## Funciones del MVP

- `/avui [municipi]`: actividades de hoy.
- `/capdesetmana [municipi]`: planes del próximo fin de semana.
- `/aprop`: búsqueda por ubicación temporal, sin almacenarla.
- `/municipi <nom>`: búsqueda para los próximos siete días.
- `/concerts [municipi]`: música y conciertos.
- `/festes [municipi]`: fiestas mayores y fiestas populares.
- `/artista <nom>`: búsqueda por artista o título.
- `/pla <municipi>`: encuesta con tres planes para un grupo.
- Modo inline para compartir actividades en cualquier chat.
- Recordatorios, correcciones comunitarias y borrado de datos.
- Catalán y castellano.

## Arquitectura de coste cero

- Cloudflare Worker: webhook y lógica del bot.
- Cloudflare D1: idioma, recordatorios y correcciones.
- Rate Limiting de Cloudflare: protección por usuario frente a abuso.
- Telegram Bot API: única interfaz de usuario.
- Socrata `rhpv-yr4f`: fuente oficial consultada en tiempo real y cacheada.

No se utiliza ningún modelo de IA ni API de pago en producción.

El despliegue actual usa únicamente cuotas gratuitas. El coste cero depende de los límites y condiciones vigentes de Cloudflare, Telegram y Socrata; si un proveedor los cambia o se supera una cuota, habrá que limitar tráfico o migrar antes de aceptar un servicio de pago.

## Estado de producción

- Worker y cron publicados en Cloudflare.
- D1 alojada con jurisdicción de la Unión Europea y las tres migraciones aplicadas.
- Token del bot, secreto del webhook e identificador de administración almacenados como secretos cifrados de Cloudflare, nunca en Git.
- Webhook activo en `/telegram/webhook`, sin errores ni actualizaciones pendientes al desplegar.
- Perfil, avatar, comandos en catalán y castellano y modo inline habilitados en Telegram.
- Prueba real superada: `/start` muestra el selector de idioma y `/municipi Barcelona` devuelve planes de la fuente oficial.

## Cobertura actual

El catálogo inicial procede de la Agenda Cultural de Catalunya y se limita a ubicaciones de las cuatro provincias catalanas. Es una fuente oficial centralizada, pero no garantiza que todos los ayuntamientos publiquen allí toda su programación. Cada resultado enlaza a su fuente y el bot permite comunicar correcciones; se ampliarán adaptadores municipales sin cambiar la interfaz de Telegram.

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
2. Crear D1 en la UE con `npx wrangler d1 create festabot-catalunya --jurisdiction eu`.
3. Sustituir `database_id` en `wrangler.toml`.
4. Aplicar migraciones con `npm run db:migrate:remote`.
5. Hacer un primer despliegue con `npm run deploy`.
6. Guardar los dos secretos obligatorios con `npx wrangler secret put`:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
7. Opcionalmente, añadir `ADMIN_TELEGRAM_ID` para recibir avisos privados sobre correcciones.
8. Volver a desplegar con `npm run deploy`.
9. Configurar comandos y modo inline en BotFather y registrar el webhook exacto `https://festabot-catalunya.adrimg3196.workers.dev/telegram/webhook` mediante Telegram Bot API.
10. Verificar `/health`, `getWebhookInfo` y que `npm run db:migrate:remote` no tenga migraciones pendientes.

Nunca se debe guardar el token de Telegram en el repositorio.

## Privacidad

La ubicación compartida se usa solo en memoria para calcular distancias, se redondea antes de consultar la fuente oficial y no se persiste. El usuario puede borrar idioma, seguimientos, recordatorios y correcciones con `/esborra_dades`. Las actualizaciones procesadas caducan a los 7 días; recordatorios enviados o fallidos, a los 30 días; y correcciones, a los 90 días.

## Fuente de datos

- [Agenda Cultural de Catalunya](https://agenda.cultura.gencat.cat/)
- [Dataset abierto](https://analisi.transparenciacatalunya.cat/d/rhpv-yr4f)
