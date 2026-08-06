// SoQL WHERE fragment that identifies Festa Major events by title.
// Single source of truth shared by the Worker (src/services/agenda.ts) and the
// program-sync script (scripts/sync-programs.mjs) so the two cannot drift
// apart. Plain .js so both the TS Worker bundle and the node sync script can
// import it.
export const FESTA_MAJOR_TITLE_CONDITION =
  "(lower(denominaci) like 'festa major%' OR lower(denominaci) like 'festes majors%' OR lower(denominaci) like 'la festa major%' OR lower(denominaci) like 'fiesta mayor%' OR lower(denominaci) like '% - festa major%' OR lower(denominaci) like '% – festa major%' OR lower(denominaci) like 'les santes%' OR lower(denominaci) like 'festes de la mercè%')";
