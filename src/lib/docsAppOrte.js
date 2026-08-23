/**
 * docsAppOrte.js
 *
 * Whitelist der Orte in der App, auf die der Pool-Manager-Assistent direkt
 * verlinken darf („Hier kannst du dir das anschauen"). Nur diese Pfade sind
 * erlaubt — so kann die KI keine Fantasie-Links erzeugen.
 *
 * Pfade müssen mit den Routen in src/App.jsx übereinstimmen.
 */

export const APP_ORTE = [
  { pfad: '/einheiten', label: 'Einheiten-Übersicht', hinweis: 'Alle Einheiten: gemeinschaftliche Poolzeit-Einheiten, private Einheiten und die Austausch-Bibliothek.' },
  { pfad: '/einheit/create', label: 'Neue Einheit anlegen', hinweis: 'Erstellungs-Assistent für eine neue Einheit.' },
  { pfad: '/einheit/coach', label: 'Einheiten-Coach', hinweis: 'KI-Dialog, der beim Aufbau einer Einheit hilft.' },
  { pfad: '/basismodule', label: 'Basismodule', hinweis: 'Wissensspeicher aus vorangegangenen Jahrgängen.' },
  { pfad: '/export-center', label: 'Export-Center', hinweis: 'Übergabe der Inhalte an Moodle bzw. das MBK-Team.' },
  { pfad: '/lernen', label: 'Schüleransicht', hinweis: 'Der Bereich, den die Schüler sehen.' },
  { pfad: '/benutzerverwaltung', label: 'Benutzerverwaltung', hinweis: 'Rollen und Fachzuständigkeiten (nur Administration).' },
  { pfad: '/admin-settings', label: 'Systemeinstellungen', hinweis: 'Aktivitäten-Katalog, Lookups, Vorlagen (nur Administration).' },
  { pfad: '/docs/uebersicht', label: 'Alle Kapitel der Dokumentation', hinweis: 'Vollständige Dokumentation zum Nachlesen.' },
];

/** Kompakte Liste für den KI-Prompt. */
export function appOrteText() {
  return APP_ORTE.map((o) => `- ${o.pfad} → ${o.label}: ${o.hinweis}`).join('\n');
}

/** Filtert KI-Vorschläge auf gültige Pfade und ergänzt fehlende Labels. */
export function normalisiereOrte(orte) {
  if (!Array.isArray(orte)) return [];
  return orte
    .map((o) => APP_ORTE.find((a) => a.pfad === o?.pfad) && { ...o })
    .filter(Boolean)
    .map((o) => ({
      pfad: o.pfad,
      label: o.label || APP_ORTE.find((a) => a.pfad === o.pfad)?.label || o.pfad,
    }))
    .slice(0, 3);
}