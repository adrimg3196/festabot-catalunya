import type { Env, ReplyMarkup } from "../types";

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

async function telegramCall<T>(env: Env, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000)
  });
  const data = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !data.ok || data.result === undefined) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? response.status}`);
  }
  return data.result;
}

export async function sendMessage(
  env: Env,
  chatId: number | string,
  text: string,
  replyMarkup?: ReplyMarkup
): Promise<unknown> {
  return telegramCall(env, "sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4096),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

export async function answerCallbackQuery(env: Env, callbackQueryId: string, text?: string): Promise<unknown> {
  return telegramCall(env, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text: text.slice(0, 200) } : {})
  });
}

export async function answerInlineQuery(
  env: Env,
  inlineQueryId: string,
  results: unknown[],
  nextOffset = ""
): Promise<unknown> {
  return telegramCall(env, "answerInlineQuery", {
    inline_query_id: inlineQueryId,
    results: results.slice(0, 20),
    cache_time: 300,
    is_personal: false,
    next_offset: nextOffset
  });
}

export async function sendPoll(
  env: Env,
  chatId: number,
  question: string,
  options: string[]
): Promise<unknown> {
  return telegramCall(env, "sendPoll", {
    chat_id: chatId,
    question: question.slice(0, 300),
    options: options.slice(0, 10).map((text) => ({ text: text.slice(0, 100) })),
    is_anonymous: false,
    allows_multiple_answers: false
  });
}

export async function configureTelegramBot(env: Env, webhookUrl: string): Promise<void> {
  await telegramCall(env, "setMyCommands", {
    commands: [
      { command: "avui", description: "Què hi ha avui" },
      { command: "capdesetmana", description: "Plans del cap de setmana" },
      { command: "aprop", description: "Plans a prop meu" },
      { command: "municipi", description: "Cercar per municipi" },
      { command: "concerts", description: "Concerts i festes" },
      { command: "pla", description: "Crear una votació de plans" },
      { command: "privacitat", description: "Privacitat i dades" },
      { command: "esborra_dades", description: "Eliminar les meves dades" }
    ]
  });
  await telegramCall(env, "setWebhook", {
    url: webhookUrl,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query", "inline_query"],
    drop_pending_updates: true
  });
}
