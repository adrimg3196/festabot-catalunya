import { Hono } from "hono";
import { handleUpdate, sendDueReminders } from "./handlers";
import { claimUpdate, markUpdateDone, releaseUpdate } from "./repositories/updates";
import type { Env, TelegramUpdate } from "./types";

const app = new Hono<{ Bindings: Env }>();

function isSafeId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isValidUpdate(update: TelegramUpdate): boolean {
  if (!update || typeof update !== "object" || Array.isArray(update)) return false;
  if (!isSafeId(update.update_id) || update.update_id < 0) return false;
  if (update.message) {
    if (!isSafeId(update.message.message_id) || !isSafeId(update.message.chat?.id)) return false;
    if (update.message.from && !isSafeId(update.message.from.id)) return false;
    if (update.message.text !== undefined && (typeof update.message.text !== "string" || update.message.text.length > 8192)) return false;
    if (update.message.location) {
      const { latitude, longitude } = update.message.location;
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
        || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return false;
    }
  }
  if (update.callback_query) {
    if (typeof update.callback_query.id !== "string" || update.callback_query.id.length > 256
      || !isSafeId(update.callback_query.from?.id)
      || (update.callback_query.data !== undefined && (typeof update.callback_query.data !== "string" || update.callback_query.data.length > 64))) return false;
  }
  if (update.inline_query) {
    if (typeof update.inline_query.id !== "string" || update.inline_query.id.length > 256
      || !isSafeId(update.inline_query.from?.id)
      || typeof update.inline_query.query !== "string" || update.inline_query.query.length > 256
      || typeof update.inline_query.offset !== "string" || update.inline_query.offset.length > 64) return false;
  }
  return true;
}

function updateActorId(update: TelegramUpdate): number | undefined {
  return update.callback_query?.from.id ?? update.inline_query?.from.id ?? update.message?.from?.id;
}

app.get("/", (context) => context.json({
  ok: true,
  service: "FestaBot Catalunya",
  dataSource: "Agenda Cultural de Catalunya"
}));

app.get("/health", (context) => context.json({ ok: true }));

app.post("/telegram/webhook", async (context) => {
  const suppliedSecret = context.req.header("X-Telegram-Bot-Api-Secret-Token");
  if (!suppliedSecret || suppliedSecret !== context.env.TELEGRAM_WEBHOOK_SECRET) {
    return context.json({ ok: false }, 403);
  }

  if (!context.req.header("Content-Type")?.toLowerCase().includes("application/json")) {
    return context.json({ ok: false }, 415);
  }

  const contentLength = Number(context.req.header("Content-Length") ?? "0");
  if (contentLength > 256_000) {
    return context.json({ ok: false }, 413);
  }

  let update: TelegramUpdate;
  let updateClaimToken: string | null = null;
  try {
    const body = await context.req.raw.arrayBuffer();
    if (body.byteLength > 256_000) return context.json({ ok: false }, 413);
    update = JSON.parse(new TextDecoder().decode(body)) as TelegramUpdate;
  } catch {
    return context.json({ ok: false }, 400);
  }
  if (!isValidUpdate(update)) {
    return context.json({ ok: false }, 400);
  }

  try {
    const actorId = updateActorId(update);
    if (actorId !== undefined) {
      const rateLimit = await context.env.USER_RATE_LIMITER.limit({ key: String(actorId) });
      if (!rateLimit.success) {
        return context.json({ ok: true, limited: true });
      }
    }

    updateClaimToken = await claimUpdate(context.env, update.update_id);
    if (!updateClaimToken) return context.json({ ok: true, duplicate: true });

    await handleUpdate(context.env, update);
    await markUpdateDone(context.env, update.update_id, updateClaimToken);
    return context.json({ ok: true });
  } catch (error) {
    console.error("Telegram update failed", { updateId: update.update_id, error: String(error) });
    if (updateClaimToken) {
      try {
        await releaseUpdate(context.env, update.update_id, updateClaimToken);
      } catch (releaseError) {
        console.error("Telegram update lease release failed", { updateId: update.update_id, error: String(releaseError) });
      }
    }
    return context.json({ ok: false }, 500);
  }
});

app.onError((error, context) => {
  console.error("Unhandled request error", { error: String(error) });
  return context.json({ ok: false }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    context.waitUntil(sendDueReminders(env));
  }
};
