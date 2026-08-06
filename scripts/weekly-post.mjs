// Post setmanal de festes al canal de Telegram. Corre com a GitHub Action
// els divendres. Reutilitza l'endpoint públic de l'Agenda Cultural (Socrata).
// Llig TELEGRAM_BOT_TOKEN i TELEGRAM_CHANNEL de l'entorn.
const DATASET = "https://analisi.transparenciacatalunya.cat/resource/rhpv-yr4f.json";
const CATALONIA = "(municipi like 'agenda:ubicacions/barcelona/%' OR municipi like 'agenda:ubicacions/girona/%' OR municipi like 'agenda:ubicacions/lleida/%' OR municipi like 'agenda:ubicacions/tarragona/%')";
const BOT = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
const CHANNEL = process.env.TELEGRAM_CHANNEL;
const START = "https://t.me/FestaCatalunyaBot?start=cat";

function weekendWindow() {
  const now = new Date();
  const day = now.getDay(); // 0 dg, 5 dv
  const fri = new Date(now);
  fri.setDate(now.getDate() + ((5 - day + 7) % 7));
  fri.setHours(0, 0, 0, 0);
  const sun = new Date(fri);
  sun.setDate(fri.getDate() + 2);
  sun.setHours(23, 59, 59, 0);
  return { start: fri.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

function escapeLiteral(v) { return v.replace(/'/g, "''"); }

async function getWeekendFestes() {
  const { start, end } = weekendWindow();
  const where = `data_inici <= '${escapeLiteral(end)}' AND data_fi >= '${escapeLiteral(start)}' AND ${CATALONIA} AND (lower(denominaci) like '%festa major%' OR lower(denominaci) like '%fiesta mayor%' OR tags_categor_es like '%/festes%')`;
  const params = new URLSearchParams({
    "$select": ":id,denominaci,municipi,comarca,localitat,data_inici,data_fi",
    "$where": where,
    "$order": "data_inici ASC",
    "$limit": "12"
  });
  const res = await fetch(`${DATASET}?${params}`);
  if (!res.ok) throw new Error(`Agenda API ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => ({
    title: r.denominaci || "Festa",
    municipality: r.localitat || humanizeSlug(slugTail(r.municipi)),
    comarca: r.comarca ? humanizeSlug(slugTail(r.comarca)) : "",
    start: (r.data_inici || "").slice(0, 10)
  }));
}

function humanizeSlug(value) {
  const smallWords = new Set(["de", "del", "d", "la", "les", "el", "els", "i"]);
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((word, index) => (index > 0 && smallWords.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

function slugTail(value) {
  if (!value) return "";
  const parts = String(value).split("/").filter(Boolean);
  return parts.at(-1) ?? "";
}

function formatMessage(festes) {
  const lines = festes.map((f, i) =>
    `${i + 1}. ${f.title} — ${f.municipality}${f.comarca ? ` (${f.comarca})` : ""} · ${f.start}`
  );
  const body = lines.length
    ? lines.join("\n")
    : "Aquest cap de setmana no hi ha festes majors destacades a l'agenda. Proveu /concerts o /aprop!";
  return `🎊 <b>Festes del cap de setmana a Catalunya</b>\n\n${body}\n\n🔎 Més plans i el programa de cada festa al bot: ${START}`;
}

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("Falta TELEGRAM_BOT_TOKEN");
  }
  const festes = await getWeekendFestes();
  const text = formatMessage(festes);
  if (process.env.DRY_RUN || !CHANNEL) {
    console.log(text);
    if (!CHANNEL) console.error("⚠️  Defineix TELEGRAM_CHANNEL per publicar al canal");
    return;
  }
  const res = await fetch(BOT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHANNEL, text, parse_mode: "HTML", disable_web_page_preview: true })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram API: ${json.description}`);
  console.log(`Publicat al canal: ${festes.length} festes`);
}

main().catch((e) => { console.error(e); process.exit(1); });
