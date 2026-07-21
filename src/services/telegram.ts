import type { Env, ReplyMarkup } from "../types";

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
}

export class TelegramApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly errorCode?: number,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "TelegramApiError";
  }
}

function safeMessageText(text: string): string {
  if (text.length <= 4096) return text;
  const plain = text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"");
  return `${plain.slice(0, 4000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}…`;
}

async function telegramCall<T>(env: Env, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000)
  });
  let data: TelegramResponse<T>;
  try {
    data = (await response.json()) as TelegramResponse<T>;
  } catch {
    throw new TelegramApiError(`Telegram ${method} returned an invalid response`, response.status);
  }
  if (!response.ok || !data.ok || data.result === undefined) {
    throw new TelegramApiError(
      `Telegram ${method} failed: ${data.description ?? response.status}`,
      response.status,
      data.error_code,
      data.parameters?.retry_after
    );
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
    text: safeMessageText(text),
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
    cache_time: 60,
    is_personal: true,
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
      { command: "concerts", description: "Música i concerts" },
      { command: "festes", description: "Festes majors" },
      { command: "artista", description: "Cercar artista o títol" },
      { command: "pla", description: "Crear una votació de plans" },
      { command: "privacitat", description: "Privacitat i dades" },
      { command: "esborra_dades", description: "Eliminar les meves dades" },
      { command: "ajuda", description: "Veure totes les opcions" }
    ]
  });
  await telegramCall(env, "setMyCommands", {
    language_code: "es",
    commands: [
      { command: "hoy", description: "Qué hay hoy" },
      { command: "finde", description: "Planes del fin de semana" },
      { command: "cerca", description: "Planes cerca de mí" },
      { command: "municipio", description: "Buscar por municipio" },
      { command: "conciertos", description: "Conciertos" },
      { command: "fiestas", description: "Fiestas mayores" },
      { command: "artista", description: "Buscar artista o título" },
      { command: "plan", description: "Crear una votación de planes" },
      { command: "privacidad", description: "Privacidad y datos" },
      { command: "borra_datos", description: "Eliminar mis datos" },
      { command: "ayuda", description: "Ver todas las opciones" }
    ]
  });
  await telegramCall(env, "setWebhook", {
    url: webhookUrl,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query", "inline_query"],
    drop_pending_updates: true
  });
}
