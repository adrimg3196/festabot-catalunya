import type { Language } from "./types";

const copy = {
  ca: {
    welcome: "🎉 <b>FestaBot Catalunya</b>\n\nTroba festes, concerts i plans culturals sense sortir de Telegram. No deso la teva ubicació exacta.",
    chooseLanguage: "Tria idioma / Elige idioma:",
    askLocation: "📍 Envia'm la ubicació només per calcular els plans a prop. La descartaré després de la consulta. També pots escriure <code>/municipi Terrassa</code>.",
    noResults: "No he trobat cap pla amb aquests filtres. Prova un altre municipi o amplia la cerca.",
    source: "Font oficial: Agenda Cultural de Catalunya",
    resultsTitle: "Plans que et poden encaixar",
    longSchedule: "consulta l'horari concret",
    details: "Detalls",
    remind: "🔔 Recorda-m'ho",
    report: "⚠️ Corregir",
    reminderSaved: "T'avisaré el vespre anterior. Si l'activitat ja ha començat, t'avisaré d'aquí a una hora.",
    reportSaved: "Gràcies! La correcció ha quedat pendent de revisió.",
    deleted: "He eliminat les teves preferències, recordatoris i correccions associades. Una operació que ja estigués en curs podria acabar-se.",
    privacy: "🔐 <b>Privacitat</b>\nDeso el teu identificador de Telegram i idioma. Si demanes un recordatori, també deso temporalment el xat, el títol i l'enllaç de l'activitat; les correccions queden associades al teu identificador. La ubicació es converteix en una zona aproximada abans de consultar la font oficial i no es desa. Les dades operatives caduquen automàticament i pots eliminar-ho tot amb /esborra_dades.",
    missingMunicipality: "Escriu el municipi després de l'ordre. Exemple: <code>/municipi Reus</code>",
    missingSearch: "Escriu un artista o títol després de l'ordre. Exemple: <code>/artista Empremtes</code>",
    invalidLocation: "Aquesta ubicació no és vàlida. Torna-la a compartir des del botó de Telegram.",
    pollQuestion: "Quin pla fem?",
    reminderPrefix: "🔔 <b>Recordatori de festa</b>",
    error: "Ara mateix la font oficial no respon. Torna-ho a provar d'aquí a uns minuts."
  },
  es: {
    welcome: "🎉 <b>FestaBot Catalunya</b>\n\nEncuentra fiestas, conciertos y planes culturales sin salir de Telegram. No guardo tu ubicación exacta.",
    chooseLanguage: "Tria idioma / Elige idioma:",
    askLocation: "📍 Envíame la ubicación solo para calcular planes cercanos. La descartaré después de la consulta. También puedes escribir <code>/municipi Terrassa</code>.",
    noResults: "No he encontrado ningún plan con esos filtros. Prueba otro municipio o amplía la búsqueda.",
    source: "Fuente oficial: Agenda Cultural de Catalunya",
    resultsTitle: "Planes que pueden encajarte",
    longSchedule: "consulta el horario concreto",
    details: "Detalles",
    remind: "🔔 Recuérdamelo",
    report: "⚠️ Corregir",
    reminderSaved: "Te avisaré la tarde anterior. Si la actividad ya ha comenzado, te avisaré dentro de una hora.",
    reportSaved: "¡Gracias! La corrección ha quedado pendiente de revisión.",
    deleted: "He eliminado tus preferencias, recordatorios y correcciones asociadas. Una operación que ya estuviera en curso podría terminar.",
    privacy: "🔐 <b>Privacidad</b>\nGuardo tu identificador de Telegram e idioma. Si pides un recordatorio, también guardo temporalmente el chat, el título y el enlace de la actividad; las correcciones quedan asociadas a tu identificador. La ubicación se convierte en una zona aproximada antes de consultar la fuente oficial y no se guarda. Los datos operativos caducan automáticamente y puedes eliminarlo todo con /borra_datos.",
    missingMunicipality: "Escribe el municipio después de la orden. Ejemplo: <code>/municipi Reus</code>",
    missingSearch: "Escribe un artista o título después de la orden. Ejemplo: <code>/artista Empremtes</code>",
    invalidLocation: "Esa ubicación no es válida. Vuelve a compartirla desde el botón de Telegram.",
    pollQuestion: "¿Qué plan hacemos?",
    reminderPrefix: "🔔 <b>Recordatorio de fiesta</b>",
    error: "Ahora mismo la fuente oficial no responde. Inténtalo de nuevo dentro de unos minutos."
  }
} as const;

export function t(language: Language) {
  return copy[language];
}
