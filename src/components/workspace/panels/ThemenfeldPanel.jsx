import React from 'react';
import { Clock, Target } from 'lucide-react';

/**
 * Themenfeld-Panel im Tab 3 (Aktivitäten).
 *
 * Read-only-Ansicht: Titel, Anzahl Lernpakete, Lernpaket-Liste.
 *
 * Bewusst entfernt (Konzept-Entscheidung 2026-05-12):
 *  - "Bearbeiten"-Button samt Edit-Form. Themenfelder werden ausschließlich
 *    in Tab 2 (Struktur-Board) angelegt/umbenannt/gelöscht. Auf dieser Ebene
 *    darf die Lehrkraft hier nichts ändern.
 *  - Anzeige der `beschreibung` — Feld wird in der Praxis nicht gepflegt
 *    und stiftet Verwirrung.
 *  - Anzeige des `bearbeitungsmodus` — Legacy-Feld. Sequenziell/Offen wird
 *    heute ausschließlich über die Dashboards (Tab 7) gesteuert.
 *
 * Die Datenbank-Felder bleiben vorerst erhalten (Backward Compatibility),
 * werden hier aber nicht mehr angezeigt oder bearbeitet.
 */
export default function ThemenfeldPanel({ themenfeld, lernpakete, lernziele = [] }) {
  const paketeFuerThemenfeld = lernpakete.filter(
    (p) => p.themenfeld_id === themenfeld?.id
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{themenfeld?.titel}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {paketeFuerThemenfeld.length} Lernpaket
          {paketeFuerThemenfeld.length !== 1 ? 'e' : ''}
        </p>
      </div>

      {paketeFuerThemenfeld.length > 0 && (
        <div className="space-y-3">
          {paketeFuerThemenfeld.map((paket) => {
            const paketZiele = lernziele.filter((lz) => lz.lernpaket_id === paket.id);
            return (
              <div key={paket.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{paket.titel_des_pakets}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {paket.geschaetzte_dauer_minuten} Min.
                    </p>
                  </div>
                </div>

                {/* Zugeordnete Lernziele des Pakets (read-only Anzeige) */}
                {paketZiele.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t pt-2.5">
                    {paketZiele.map((lz) => (
                      <div key={lz.id} className="flex items-start gap-2">
                        <Target className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground leading-snug">
                          {lz.formulierung_fachsprache}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}