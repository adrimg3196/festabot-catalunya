---
name: telegram-festes-bot
description: Design and improve zero-cost, Telegram-only products for discovering Catalan festes majors, concerts, nearby events, municipal schedules, youth-friendly recommendations, and community features. Use when Codex is asked to brainstorm, scope, prototype, or refine a Telegram bot that aggregates festa major information without owner-paid infrastructure.
---

# Telegram Festes Bot

## Core principles

- Keep the product Telegram-only: bot commands, inline keyboards, deep links, groups, channels, polls, reminders, and Telegram Web Apps only when they do not require paid hosting.
- Prefer zero-owner-cost architecture. Use free tiers, static files, scheduled local/manual jobs, GitHub Actions, Telegram-native storage patterns, or community-maintained submissions before paid services.
- Design for Catalonia-first usage: Catalan and Spanish language support, comarca/municipi vocabulary, public transport realities, late-night concerts, and festa major culture.
- Be careful with scraping. Recommend official feeds, open data, iCalendar files, municipal agenda pages, RSS, and explicit attribution. If scraping is proposed, include robots.txt/legal/terms checks and caching.
- Make experiences youth-friendly: short flows, emojis where helpful, shareable event cards, location-aware discovery, accessible language, and low-friction reminders.

## Product ideation workflow

1. Clarify the target user journey: discovery, planning tonight, finding concerts nearby, following towns/artists, sharing plans, or contributing missing events.
2. Propose Telegram-native features before external UI:
   - `/avui`, `/capdesetmana`, `/aprop`, `/municipi`, `/artista`, `/recorda`, `/envia`, `/mapa`, `/ajuda`.
   - Inline keyboards for comarca, distance, date, genre, free/paid, family/youth/night filters.
   - Inline mode for sharing event cards into chats.
   - Channels for curated comarca alerts and group discussion.
3. Include at least one retention feature: followed municipalities, artist alerts, “plan de noche”, reminders, or weekly digest.
4. Include at least one data-quality feature: community submissions, duplicate detection, source links, confidence labels, or moderator review.
5. Include privacy notes: ask for live location only when needed, allow manual town entry, avoid retaining exact coordinates unless essential.

## Zero-cost architecture guidance

Use `references/zero-cost-architecture.md` when asked to design implementation details, data flow, deployment, or maintenance.

Default architecture to recommend:

- Telegram Bot API as the only user interface.
- GitHub repository as source-of-truth for normalized event JSON/CSV.
- GitHub Actions on cron/manual dispatch to fetch known public sources and rebuild indexes.
- Free static hosting only if needed for raw data files; avoid a custom web frontend.
- Bot runtime on a free serverless/container tier only if acceptable, or a maintainer-run local process for strict zero spend.
- Manual/admin review queue via Telegram private chat or GitHub issues.

## Feature backlog to suggest

Prioritize ideas that add value without increasing operating cost:

- “Què hi ha avui a prop meu?” based on temporary Telegram location or manual municipality.
- Concert radar by genre, artist, DJ, orchestra, and free-text search.
- Last-train/last-bus hints using public transport links or static notes per area.
- Crowd-sourced corrections: wrong time, changed venue, cancelled event.
- Shareable “plan” card for a town/date with top concerts and schedule highlights.
- Personal reminders 1 hour / 1 day before an event.
- Follow comarques, towns, venues, and artists.
- Rain/heat fallback notices only if weather can be sourced at no cost.
- Duplicate municipality pages merged into a single normalized agenda.
- Accessibility tags: free entry, age restrictions, wheelchair notes, family-friendly, late-night.

## Response format

When answering product strategy requests, structure the answer as:

1. **Idea principal**: concise positioning.
2. **Funcionalidades Telegram**: concrete commands and interaction patterns.
3. **Datos y actualización**: sources, ingestion, review, attribution.
4. **Coste cero**: what runs for free and operational tradeoffs.
5. **MVP**: smallest useful launch scope.
6. **Riesgos**: data quality, legal/terms, privacy, maintenance.
7. **Siguientes pasos**: actionable implementation checklist.
