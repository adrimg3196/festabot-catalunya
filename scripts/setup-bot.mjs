import { configureTelegramBot } from "../src/services/telegram.js";

// One-shot: registers commands, inline mode and the webhook with Telegram.
// Runs locally against the deployed Worker (reads secrets from the environment,
// not from wrangler). Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/setup-bot.mjs
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
  ?? "https://festabot-catalunya.adrimg3196.workers.dev/telegram/webhook";

if (!token || !secret) {
  throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are required");
}

const env = { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret };
await configureTelegramBot(env, webhookUrl);
console.log(`Telegram bot configured. Webhook: ${webhookUrl}`);
