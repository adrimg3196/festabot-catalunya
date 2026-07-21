# Zero-cost architecture for a Telegram-only Catalan festa major bot

## Data model

Use a normalized event record:

- `id`: stable slug from municipality, date, title, and source.
- `title`: event/concert title.
- `municipality`, `comarca`, `province`.
- `venue`, `address`, `lat`, `lon` when available.
- `starts_at`, `ends_at`, `timezone` (`Europe/Madrid`).
- `category`: concert, DJ, cercavila, castells, correfoc, food, family, other.
- `artists`: array, when parseable.
- `price`: free, paid, unknown.
- `source_url`, `source_name`, `last_seen_at`.
- `confidence`: official, imported, community, unverified.

## Free data pipeline options

Prefer these, in order:

1. Official municipal open data, RSS, iCalendar, agenda APIs, or downloadable PDFs.
2. Event pages with explicit public agenda information and source attribution.
3. Community submissions reviewed by moderators.
4. Scraping only after checking robots.txt, site terms, rate limits, and attribution needs.

Use GitHub Actions scheduled workflows for periodic import if the account's free quota is sufficient. Store generated JSON/CSV in the repository or GitHub Pages. Keep raw snapshots small and avoid committing large PDFs repeatedly.

## Runtime options

- **Strict zero spend**: run the bot process from a maintainer computer/Raspberry Pi when available; accept downtime.
- **Free tier**: use a serverless/container free tier for webhook or long polling; document quotas and the risk of future pricing changes.
- **Hybrid**: keep bot answers from static indexed JSON and update data through GitHub Actions.

## Telegram interaction patterns

- Use inline keyboards for filters and pagination.
- Use deep links such as `t.me/<bot>?start=municipi_barcelona` for shareable views.
- Use inline mode to share event cards in group chats.
- Use private chat for saved preferences and reminders.
- Use channels for comarca-wide broadcast digests.

## Privacy and safety

- Offer manual municipality/postal-code entry before asking for live location.
- If location is shared, use it only to compute nearby events and discard precise coordinates unless the user opts into saved defaults.
- Store only Telegram user ID, language, followed towns/artists, and reminder settings.
- Make deletion simple: `/esborra_dades`.

## MVP checklist

1. Load a curated list for 5-10 municipalities across different comarques.
2. Support `/avui`, `/capdesetmana`, `/municipi`, `/aprop`, `/recorda`, and `/envia`.
3. Normalize events into JSON and expose source links.
4. Add admin review for community submissions.
5. Publish a comarca digest channel and shareable event cards.
