// Übungsformate im Unterricht (2026-10-24): Merkmal je Format aus dem AktivitaetenKatalog (Schlüssel = name).
// sozialform: 'allein' = nur Einzelarbeit sinnvoll | 'tauschbar' = auch zu zweit / in der Gruppe (ein Gerät oder mehrere).
// klasse_tafel: true = lässt sich an der Tafel gemeinsam mit der Klasse bearbeiten (Klassenmodus, z. B. Jg. 5-7 ohne Geräte).
// unterricht: false = gehört in die selbstständige Lernphase, nicht als Unterrichtsfolie.
export const FORMAT_SOZIALFORM = {
  'Lückentext': { sozialform: 'tauschbar', klasse_tafel: true },
  'Bildbeschriftung': { sozialform: 'tauschbar', klasse_tafel: true },
  'Begriffe zuordnen': { sozialform: 'tauschbar', klasse_tafel: true },
  'Zuordnungstraining': { sozialform: 'tauschbar', klasse_tafel: true },
  'Reihenfolge / Sortierung': { sozialform: 'tauschbar', klasse_tafel: true },
  'Offene Aufgabe': { sozialform: 'tauschbar', klasse_tafel: true },
  'Materialaufgabe': { sozialform: 'tauschbar', klasse_tafel: true },
  'Materialaufgabe (Erarbeitung)': { sozialform: 'tauschbar', klasse_tafel: true },
  'Aufgabensequenz': { sozialform: 'tauschbar', klasse_tafel: true },
  'Text lesen': { sozialform: 'tauschbar', klasse_tafel: true },
  'Video / Audio': { sozialform: 'tauschbar', klasse_tafel: true },
  'Slideshow': { sozialform: 'tauschbar', klasse_tafel: true },
  'Externer Inhalt': { sozialform: 'tauschbar', klasse_tafel: true },
  'Link / URL': { sozialform: 'tauschbar', klasse_tafel: true },
  'Multiple Choice': { sozialform: 'allein', klasse_tafel: true },
  'Miniquiz': { sozialform: 'allein', klasse_tafel: true },
  'KI-Quiz': { sozialform: 'allein', klasse_tafel: false },
  'KI-Check': { sozialform: 'allein', klasse_tafel: false },
  'Sprechaufgabe': { sozialform: 'allein', klasse_tafel: false },
  'KI-Tutor Aufgabe (Brian)': { sozialform: 'allein', klasse_tafel: false },
  'Bearbeitung bestätigen': { sozialform: 'allein', klasse_tafel: false },
  'Test': { sozialform: 'allein', klasse_tafel: false, unterricht: false },
  'Kompaktwissen': { sozialform: 'allein', klasse_tafel: false, unterricht: false },
  'Lehrwerk/Quelle': { sozialform: 'tauschbar', klasse_tafel: false, unterricht: false },
  'Aktivitätengalerie': { sozialform: 'tauschbar', klasse_tafel: false, unterricht: false },
};

export const formatMerkmal = (name) => FORMAT_SOZIALFORM[name] || { sozialform: 'allein', klasse_tafel: false };