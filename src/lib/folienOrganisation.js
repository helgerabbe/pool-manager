// Organisationsebene (2026-10-21): gilt für die ganze Stunde bzw. den Foliensatz, nicht für ein einzelnes Element.
export const ZUTEILUNG_ARTEN = [['keine', 'Keine'], ['partner', 'Partner'], ['gruppen', 'Gruppen'], ['rollen', 'Rollen'], ['seiten', 'Seiten']];
export const ZUTEILUNG_VERFAHREN = [['fest', 'Fest'], ['zufall', 'Zufällig'], ['rotierend', 'Rotierend']];
export const WECHSEL = [['signal', 'Auf Signal'], ['takt', 'Im Takt']];
export const FREIGABE = [['lehrkraft', 'Lehrkraft'], ['automatisch', 'Automatisch'], ['fertig', 'Wenn alle fertig']];
export const ABLAUF = [['fest', 'Fest hintereinander'], ['frei', 'Frei wählbar']];

export const ORGANISATION_START = {
  zuteilung: 'keine', verfahren: 'zufall', groesse: 4, rollen: '', wechsel: 'signal', takt: 5,
  freigabe: 'lehrkraft', ablauf: 'fest', timer_sync: false, fertig_melden: false, partner_nach_fertig: false,
};