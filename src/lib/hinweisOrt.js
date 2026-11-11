// Wo wird ein Hinweis des Moodle-Teams bearbeitet? Teilt die Liste im Prüfbereich auf.
export const HINWEIS_ORTE = {
  uebergreifend: { label: 'Übergreifend', text: 'Betrifft keine einzelne Aufgabe: Arbeitsplan, Lernpaket, Themenfeld oder die ganze Einheit.' },
  aufgabe: { label: 'An Aufgaben', text: 'Diese Hinweise stehen direkt an der Aufgabe oder am Element und werden dort bearbeitet.' },
  abweichung: { label: 'Im Kurs schon geändert', text: 'Das Moodle-Team hat diese Stellen im Kurs vorläufig selbst geändert. Die Änderung muss hier nachgezogen werden, am besten mit dem Baumeister direkt an der Stelle. Erst danach „Erledigt" wählen.' },
};

export function hinweisOrt(b) {
  if (b.kurs_umgehung === 'korrektur') return 'abweichung';
  if (['aktivitaet', 'allgemeine_aufgabe', 'master_aufgabe'].includes(b.ziel_typ)) return 'aufgabe';
  return 'uebergreifend';
}

export const istArbeitsplan = (b) => /^Lernpfad/.test(b.ziel_titel || '');