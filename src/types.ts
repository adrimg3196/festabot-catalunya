export type Language = "ca" | "es";

export interface Env {
  DB: D1Database;
  USER_RATE_LIMITER: RateLimit;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  ADMIN_TELEGRAM_ID?: string;
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
}

export interface TelegramInlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  inline_query?: TelegramInlineQuery;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
}

export interface ReplyMarkup {
  inline_keyboard?: InlineKeyboardButton[][];
  keyboard?: Array<Array<{ text: string; request_location?: boolean }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  remove_keyboard?: boolean;
}

export interface SocrataEvent {
  source_row_id?: string;
  source_updated_at?: string;
  codi?: string;
  denominaci?: string;
  data_inici?: string;
  data_fi?: string;
  data_creacio?: string;
  horari?: string;
  gratuita?: string;
  municipi?: string;
  comarca?: string;
  localitat?: string;
  espai?: string;
  adre_a?: string;
  latitud?: string;
  longitud?: string;
  tags_mbits?: string;
  tags_categor_es?: string;
  urlactivitat?: string;
  url?: string;
  enllac1_url?: string;
  linkbotoentrades?: string;
  entrades?: string;
}

export interface EventItem {
  sourceRowId?: string;
  sourceUpdatedAt?: string;
  code: string;
  title: string;
  startsAt: string;
  endsAt: string;
  schedule?: string;
  free?: boolean;
  municipality: string;
  municipalitySlug: string;
  comarca: string;
  venue?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  categories: string[];
  sourceUrl?: string;
  ticketInfo?: string;
}
