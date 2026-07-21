import { formatDateRange, nextSevenDaysWindow, reminderTimeFor, todayWindow, weekendWindow } from "./domain/date";
import { categoryLabel, escapeHtml, haversineKm } from "./domain/events";
import { t } from "./i18n";
import { createCorrection, type CorrectionType } from "./repositories/corrections";
import { createReminder, listDueReminders, markReminderSent } from "./repositories/reminders";
import { deleteUserData, ensureUser, getLanguage, setLanguage } from "./repositories/users";
import { agendaSourceUrl, getEventByReference, getEvents, isEventReference, type AgendaQuery } from "./services/agenda";
import { answerCallbackQuery, answerInlineQuery, sendMessage, sendPoll } from "./services/telegram";
import type { Env, EventItem, Language, TelegramCallbackQuery, TelegramInlineQuery, TelegramMessage, TelegramUpdate } from "./types";

function eventLine(event: EventItem, language: Language, index: number, origin?: { latitude: number; longitude: number }): string {
  const date = formatDateRange(event.startsAt, event.endsAt, language);
  const distance = origin && event.latitude !== undefined && event.longitude !== undefined
    ? ` · ${haversineKm(origin.latitude, origin.longitude, event.latitude, event.longitude).toFixed(1)} km`
    : "";
  const free = event.free ? (language === "ca" ? " · Gratis" : " · Gratis") : "";
  return `<b>${index + 1}. ${escapeHtml(event.title)}</b>\n${escapeHtml(event.municipality || event.comarca)} · ${escapeHtml(date)}${distance}${free}`;
}

function resultKeyboard(events: EventItem[], language: Language) {
  const labels = t(language);
  return {
    inline_keyboard: [
      ...events.slice(0, 8).map((event, index) => [{
        text: `${index + 1} · ${labels.details}`,
        callback_data: `detail:${event.sourceRowId ?? event.code}`
      }]),
      [{ text: language === "ca" ? "Compartir en un grup" : "Compartir en un grupo", switch_inline_query: "" }]
    ]
  };
}

async function sendResults(
  env: Env,
  chatId: number,
  language: Language,
  query: AgendaQuery,
  origin?: { latitude: number; longitude: number }
): Promise<EventItem[]> {
  const labels = t(language);
  const events = (await getEvents(query)).slice(0, 8);
  if (events.length === 0) {
    await sendMessage(env, chatId, `${labels.noResults}\n\n<a href="${agendaSourceUrl}">${labels.source}</a>`);
    return [];
  }
  const body = events.map((event, index) => eventLine(event, language, index, origin)).join("\n\n");
  await sendMessage(
    env,
    chatId,
    `🎊 <b>${labels.resultsTitle}</b>\n\n${body}\n\n<a href="${agendaSourceUrl}">${labels.source}</a>`,
    resultKeyboard(events, language)
  );
  return events;
}

function detailText(event: EventItem, language: Language): string {
  const labels = t(language);
  const lines = [
    `${categoryLabel(event, language) === "Música" ? "🎵" : "🎉"} <b>${escapeHtml(event.title)}</b>`,
    `📅 ${escapeHtml(formatDateRange(event.startsAt, event.endsAt, language))}`,
    `📍 ${escapeHtml([event.venue, event.municipality].filter(Boolean).join(" · "))}`
  ];
  if (event.address) lines.push(`🗺 ${escapeHtml(event.address)}`);
  if (event.schedule) lines.push(`🕒 ${escapeHtml(event.schedule.slice(0, 600))}`);
  if (event.free) lines.push(language === "ca" ? "🎟 Activitat gratuïta" : "🎟 Actividad gratuita");
  if (event.ticketInfo) lines.push(`ℹ️ ${escapeHtml(event.ticketInfo.slice(0, 400))}`);
  lines.push(`\n<i>${labels.source}</i>`);
  return lines.join("\n");
}

function detailKeyboard(event: EventItem, language: Language) {
  const labels = t(language);
  const reference = event.sourceRowId ?? event.code;
  const firstRow = [
    { text: labels.remind, callback_data: `rem:${reference}` },
    { text: labels.report, callback_data: `report:${reference}` }
  ];
  return {
    inline_keyboard: [
      firstRow,
      ...(event.sourceUrl ? [[{ text: language === "ca" ? "Font oficial" : "Fuente oficial", url: event.sourceUrl }]] : [])
    ]
  };
}

async function handleCommand(env: Env, message: TelegramMessage, language: Language, command: string, argument: string): Promise<void> {
  const labels = t(language);
  const userId = message.from?.id;
  if (!userId) return;

  switch (command) {
    case "start":
      await ensureUser(env, userId, language);
      await sendMessage(env, message.chat.id, `${labels.welcome}\n\n${labels.chooseLanguage}`, {
        inline_keyboard: [[
          { text: "Català", callback_data: "lang:ca" },
          { text: "Castellano", callback_data: "lang:es" }
        ]]
      });
      return;
    case "avui":
    case "hoy":
      await sendResults(env, message.chat.id, language, { ...todayWindow(), municipality: argument || undefined, limit: 500 });
      return;
    case "capdesetmana":
    case "finde":
      await sendResults(env, message.chat.id, language, { ...weekendWindow(), municipality: argument || undefined, limit: 700 });
      return;
    case "concerts":
    case "conciertos":
      await sendResults(env, message.chat.id, language, { ...nextSevenDaysWindow(), municipality: argument || undefined, musicOnly: true, limit: 800 });
      return;
    case "municipi":
    case "municipio":
      if (!argument) {
        await sendMessage(env, message.chat.id, labels.missingMunicipality);
        return;
      }
      await sendResults(env, message.chat.id, language, { ...nextSevenDaysWindow(), municipality: argument, query: argument, limit: 500 });
      return;
    case "aprop":
    case "cerca":
      await sendMessage(env, message.chat.id, labels.askLocation, {
        keyboard: [[{ text: language === "ca" ? "📍 Compartir ubicació" : "📍 Compartir ubicación", request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      });
      return;
    case "pla":
    case "plan": {
      if (!argument) {
        await sendMessage(env, message.chat.id, labels.missingMunicipality);
        return;
      }
      const events = (await getEvents({ ...nextSevenDaysWindow(), municipality: argument, musicOnly: true, limit: 300 })).slice(0, 3);
      if (events.length < 2) {
        await sendMessage(env, message.chat.id, labels.noResults);
        return;
      }
      await sendPoll(env, message.chat.id, labels.pollQuestion, events.map((event) => `${event.title} · ${event.municipality}`));
      return;
    }
    case "privacitat":
    case "privacidad":
      await sendMessage(env, message.chat.id, labels.privacy);
      return;
    case "esborra_dades":
    case "borra_datos":
      await deleteUserData(env, userId);
      await sendMessage(env, message.chat.id, labels.deleted);
      return;
    case "help":
    case "ajuda":
    case "ayuda":
      await sendMessage(env, message.chat.id, `${labels.welcome}\n\n/avui · /capdesetmana · /aprop · /municipi · /concerts · /pla · /privacitat`);
      return;
    default:
      await sendMessage(env, message.chat.id, `${labels.welcome}\n\n/avui · /capdesetmana · /aprop · /municipi · /concerts · /pla`);
  }
}

async function handleMessage(env: Env, message: TelegramMessage): Promise<void> {
  const userId = message.from?.id;
  if (!userId) return;
  const language = await getLanguage(env, userId);
  const labels = t(language);

  if (message.location) {
    const origin = message.location;
    await sendResults(env, message.chat.id, language, {
      ...nextSevenDaysWindow(),
      latitude: origin.latitude,
      longitude: origin.longitude,
      radiusKm: 30,
      limit: 1000
    }, origin);
    return;
  }

  const text = message.text?.trim();
  if (!text) return;
  if (text.startsWith("/")) {
    const [rawCommand = "", ...parts] = text.split(/\s+/);
    const command = rawCommand.slice(1).split("@")[0]?.toLowerCase() ?? "";
    await handleCommand(env, message, language, command, parts.join(" ").trim());
    return;
  }

  if (text.length <= 80) {
    await sendResults(env, message.chat.id, language, { ...nextSevenDaysWindow(), municipality: text, query: text, limit: 500 });
    return;
  }
  await sendMessage(env, message.chat.id, labels.missingMunicipality);
}

async function handleCallback(env: Env, callback: TelegramCallbackQuery): Promise<void> {
  const data = callback.data ?? "";
  const chatId = callback.message?.chat.id;
  const userId = callback.from.id;
  const language = await getLanguage(env, userId);
  const labels = t(language);

  if (data === "lang:ca" || data === "lang:es") {
    const selected = data.endsWith("es") ? "es" : "ca";
    await setLanguage(env, userId, selected);
    await answerCallbackQuery(env, callback.id, selected === "ca" ? "Idioma: català" : "Idioma: castellano");
    if (chatId) await sendMessage(env, chatId, t(selected).welcome);
    return;
  }

  const [action, reference, extra] = data.split(":");
  if (!reference || !isEventReference(reference)) {
    await answerCallbackQuery(env, callback.id);
    return;
  }
  const event = await getEventByReference(reference);
  if (!event) {
    await answerCallbackQuery(env, callback.id, labels.noResults);
    return;
  }

  if (action === "detail") {
    await answerCallbackQuery(env, callback.id);
    if (chatId) await sendMessage(env, chatId, detailText(event, language), detailKeyboard(event, language));
    return;
  }
  if (action === "rem") {
    await ensureUser(env, userId, language);
    if (chatId) await createReminder(env, userId, chatId, event, reminderTimeFor(event.startsAt));
    await answerCallbackQuery(env, callback.id, labels.reminderSaved);
    return;
  }
  if (action === "report") {
    await answerCallbackQuery(env, callback.id);
    if (chatId) {
      await sendMessage(env, chatId, language === "ca" ? "Què cal corregir?" : "¿Qué hay que corregir?", {
        inline_keyboard: [[
          { text: language === "ca" ? "Cancel·lat" : "Cancelado", callback_data: `fix:${reference}:cancelled` },
          { text: language === "ca" ? "Hora" : "Hora", callback_data: `fix:${reference}:time` },
          { text: language === "ca" ? "Lloc" : "Lugar", callback_data: `fix:${reference}:place` }
        ]]
      });
    }
    return;
  }
  if (action === "fix" && ["cancelled", "time", "place", "other"].includes(extra ?? "")) {
    await createCorrection(env, userId, event.code, extra as CorrectionType);
    await answerCallbackQuery(env, callback.id, labels.reportSaved);
    if (env.ADMIN_TELEGRAM_ID) {
      await sendMessage(env, env.ADMIN_TELEGRAM_ID, `⚠️ Correcció pendent · ${escapeHtml(event.title)} · ${extra} · usuari ${userId}`);
    }
    return;
  }
  await answerCallbackQuery(env, callback.id);
}

async function handleInlineQuery(env: Env, inlineQuery: TelegramInlineQuery): Promise<void> {
  const language = await getLanguage(env, inlineQuery.from.id);
  const queryText = inlineQuery.query.trim();
  const window = nextSevenDaysWindow();
  const events = (await getEvents({
    ...window,
    municipality: queryText || undefined,
    query: queryText || undefined,
    latitude: inlineQuery.location?.latitude,
    longitude: inlineQuery.location?.longitude,
    radiusKm: inlineQuery.location ? 40 : undefined,
    musicOnly: true,
    limit: queryText ? 500 : 800
  })).slice(0, 12);

  const results = events.map((event) => ({
    type: "article",
    id: `${event.code}:${event.municipalitySlug}`.slice(0, 64),
    title: event.title.slice(0, 128),
    description: `${event.municipality} · ${formatDateRange(event.startsAt, event.endsAt, language)}`.slice(0, 256),
    input_message_content: {
      message_text: detailText(event, language),
      parse_mode: "HTML",
      disable_web_page_preview: true
    },
    reply_markup: detailKeyboard(event, language)
  }));
  await answerInlineQuery(env, inlineQuery.id, results);
}

export async function handleUpdate(env: Env, update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallback(env, update.callback_query);
  } else if (update.inline_query) {
    await handleInlineQuery(env, update.inline_query);
  } else if (update.message) {
    await handleMessage(env, update.message);
  }
}

export async function sendDueReminders(env: Env): Promise<void> {
  const reminders = await listDueReminders(env, new Date().toISOString());
  for (const reminder of reminders) {
    const url = reminder.event_url ? `\n<a href="${escapeHtml(reminder.event_url)}">Obrir la font oficial</a>` : "";
    try {
      await sendMessage(env, reminder.chat_id, `🔔 <b>Recordatori de festa</b>\n\n${escapeHtml(reminder.event_title)}${url}`);
      await markReminderSent(env, reminder.id);
    } catch (error) {
      console.error("Reminder delivery failed", { reminderId: reminder.id, error: String(error) });
    }
  }
}
