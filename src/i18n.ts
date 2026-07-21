import type { Language } from "./types";

const copy = {
  ca: {
    welcome: "🎉 <b>FestaBot Catalunya</b>\n\nTroba festes, concerts i plans culturals sense sortir de Telegram. No deso la teva ubicació exacta.",
    chooseLanguage: "Tria idioma / Elige idioma:",
    askLocation: "📍 Envia'm la ubicació només per calcular els plans a prop. La descartaré després de la consulta. També pots escriure <code>/municipi Terrassa</code>.",
    noResults: "No he trobat cap pla amb aquests filtres. Prova un altre municipi o amplia la cerca.",
    source: "Font oficial: Agenda Cultural de Catalunya",
    resultsTitle: "Plans que et poden encaixar",
    details: "Detalls",
    remind: "🔔 Recorda-m'ho",
    report: "⚠️ Corregir",
    reminderSaved: "T'avisaré el vespre anterior. Si l'activitat ja ha començat, t'avisaré d'aquí a una hora.",
    reportSaved: "Gràcies! La correcció ha quedat pendent de revisió.",
    deleted: "He eliminat les teves preferències, recordatoris i correccions associades.",
    privacy: "🔐 <b>Privacitat</b>\nNomés deso el teu identificador de Telegram, idioma i recordatoris. La ubicació compartida s'utilitza una vegada i no es desa. Pots eliminar-ho tot amb /esborra_dades.",
    missingMunicipality: "Escriu el municipi després de l'ordre. Exemple: <code>/municipi Reus</code>",
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
    details: "Detalles",
    remind: "🔔 Recuérdamelo",
    report: "⚠️ Corregir",
    reminderSaved: "Te avisaré la tarde anterior. Si la actividad ya ha comenzado, te avisaré dentro de una hora.",
    reportSaved: "¡Gracias! La corrección ha quedado pendiente de revisión.",
    deleted: "He eliminado tus preferencias, recordatorios y correcciones asociadas.",
    privacy: "🔐 <b>Privacidad</b>\nSolo guardo tu identificador de Telegram, idioma y recordatorios. La ubicación compartida se usa una vez y no se guarda. Puedes eliminarlo todo con /esborra_dades.",
    missingMunicipality: "Escribe el municipio después de la orden. Ejemplo: <code>/municipi Reus</code>",
    pollQuestion: "¿Qué plan hacemos?",
    reminderPrefix: "🔔 <b>Recordatorio de fiesta</b>",
    error: "Ahora mismo la fuente oficial no responde. Inténtalo de nuevo dentro de unos minutos."
  }
} as const;

export function t(language: Language) {
  return copy[language];
}

