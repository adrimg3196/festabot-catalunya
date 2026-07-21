import { Hono } from "hono";
import { handleUpdate, sendDueReminders } from "./handlers";
import type { Env, TelegramUpdate } from "./types";

const app = new Hono<{ Bindings: Env }>();

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
  try {
    update = await context.req.json<TelegramUpdate>();
  } catch {
    return context.json({ ok: false }, 400);
  }
  if (!Number.isInteger(update.update_id)) {
    return context.json({ ok: false }, 400);
  }

  try {
    await handleUpdate(context.env, update);
    return context.json({ ok: true });
  } catch (error) {
    console.error("Telegram update failed", { updateId: update.update_id, error: String(error) });
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
