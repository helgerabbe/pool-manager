/**
 * SchemaAenderungAnkuendigenCard.jsx
 *
 * Kündigt dem Moodle-Team die Änderungen der aktuellen Übergabe-Version an —
 * als Ticket im Repository (Labels `ticket` + `engine`).
 *
 * Hintergrund: Als die Lernlandkarte von einer Liste auf einen Baum umgestellt
 * wurde, hat das den Kursbau angehalten, weil er die Änderung erst mit dem
 * Export selbst erfuhr. Deshalb geht die Ankündigung VOR dem ersten Export mit
 * einer neuen Version raus. Dieselbe Liste reist ab airgap-1.22.0 zusätzlich in
 * jedem Payload mit (`meta.aenderungen`).
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Loader2, ExternalLink } from 'lucide-react';
import { AIRGAP_AENDERUNGEN } from '@/lib/airGapAenderungen';

export default function SchemaAenderungAnkuendigenCard() {
  const [laeuft, setLaeuft] = useState(false);
  const [issue, setIssue] = useState(null);
  const [fehler, setFehler] = useState(null);
  const [offen, setOffen] = useState(false);

  const senden = async () => {
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await base44.functions.invoke('announceAirGapSchemaChange', {
        version: AIRGAP_AENDERUNGEN.version,
        vorherige_version: AIRGAP_AENDERUNGEN.vorherige_version,
        stichpunkte: [...AIRGAP_AENDERUNGEN.stichpunkte],
      });
      setIssue(res?.data || null);
    } catch (e) {
      setFehler(e?.response?.data?.error || e?.message || 'Ankündigung fehlgeschlagen.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900/5 text-slate-800 shrink-0">
          <Megaphone className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">
              Änderungen dem Moodle-Team ankündigen
            </h3>
            <Badge variant="outline" className="text-[10px]">{AIRGAP_AENDERUNGEN.version}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Einmal pro Version, bevor der erste Export damit rausgeht: Das Moodle-Team bekommt ein
            Ticket mit den geänderten Feldern und kann seinen Bau vorher anpassen.
          </p>
          <Button variant="link" size="sm" className="px-0 h-auto text-xs" onClick={() => setOffen((v) => !v)}>
            {offen ? 'Änderungen ausblenden' : `Änderungen ansehen (${AIRGAP_AENDERUNGEN.stichpunkte.length})`}
          </Button>
          {offen && (
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1 mt-1">
              {AIRGAP_AENDERUNGEN.stichpunkte.map((s) => <li key={s}>{s}</li>)}
            </ul>
          )}
          {issue && (
            <a
              href={issue.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1 mt-2"
            >
              Ticket #{issue.number} geöffnet <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {fehler && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 break-words">
              {fehler}
            </div>
          )}
        </div>
        <Button variant="outline" className="gap-2 shrink-0" onClick={senden} disabled={laeuft}>
          {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
          Ankündigen
        </Button>
      </div>
    </div>
  );
}