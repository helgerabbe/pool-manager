import React from 'react';
import { Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEM_GATE } from '@/lib/schuelerPfadGating';
import AufgabensequenzSeite from '@/components/schueler/lesen/AufgabensequenzSeite';
import AufgabenstellungBox from '@/components/schueler/lesen/AufgabenstellungBox';
import { schritteAusAufgabe } from '@/lib/schrittTypen';
import { fragmentZuDokument, AUFGABE_ZIELFLAECHE } from '@/lib/aufgabeFragment';

/**
 * Schüleransicht EINER allgemeinen Aufgabe im Lernpfad.
 *
 * Vorher stand hier nur ein Platzhalter („Hier erscheint gleich …") — die
 * fertig gebauten Aufgaben wurden den Schülern also nie gezeigt. Diese Seite
 * rendert den echten Inhalt:
 *
 *   - Aufgaben mit Schrittfolge (Aufgaben-Werkstatt) → AufgabensequenzSeite,
 *     die alle Schritt-Arten kennt (Material, offene Aufgabe, Brian, Katalog …).
 *   - Einzelaufgaben → Aufgabenstellung, Bild, eingebettete HTML-Aufgabe.
 */
export default function AufgabeInhaltSeite({ item, meta, aufgabe, busy, onErledigt, onBack }) {
  const gesperrt = item?.gate === ITEM_GATE.GESPERRT;
  const erledigt = item?.gate === ITEM_GATE.ERLEDIGT;

  if (gesperrt) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground px-6 text-center">
        <Lock className="w-8 h-8" />
        <p className="text-sm max-w-xs">
          Diese Aufgabe ist noch gesperrt. Bearbeite zuerst die vorherigen Schritte.
        </p>
      </div>
    );
  }

  const schritte = schritteAusAufgabe(aufgabe);
  if (schritte.length > 0) {
    return (
      <AufgabensequenzSeite
        aktivitaet={aufgabe}
        busy={busy}
        onErledigt={onErledigt}
        onBack={onBack}
      />
    );
  }

  const html = aufgabe?.html_code ? fragmentZuDokument(aufgabe.html_code) : '';

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      <h1 className="text-lg font-bold tracking-tight mb-3 shrink-0">
        {aufgabe?.titel || meta?.titel || 'Aufgabe'}
      </h1>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-4">
        {aufgabe?.aufgabenstellung && (
          <AufgabenstellungBox>{aufgabe.aufgabenstellung}</AufgabenstellungBox>
        )}

        {aufgabe?.aufgaben_bild_url && (
          <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
            <img src={aufgabe.aufgaben_bild_url} alt="" className="w-full h-auto object-contain" />
          </div>
        )}

        {aufgabe?.aufgabenstellung_datei_url && (
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <a
              href={aufgabe.aufgabenstellung_datei_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline text-sm"
            >
              {aufgabe.aufgabenstellung_datei_name || 'Arbeitsblatt öffnen'}
            </a>
          </div>
        )}

        {html && (
          <div className="rounded-xl overflow-hidden border border-border bg-card">
            <iframe
              srcDoc={html}
              title="Aufgabe"
              className="w-full border-0"
              style={{ height: AUFGABE_ZIELFLAECHE.hoehe }}
              sandbox="allow-scripts allow-forms allow-popups"
            />
          </div>
        )}

        {!aufgabe?.aufgabenstellung && !html && !aufgabe?.aufgaben_bild_url && (
          <p className="text-sm text-muted-foreground italic">
            Für diese Aufgabe ist noch kein Inhalt hinterlegt.
          </p>
        )}
      </div>

      <div className="pt-5 shrink-0">
        {erledigt ? (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="w-5 h-5" /> Bereits erledigt
          </span>
        ) : (
          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Habe ich erledigt
          </Button>
        )}
      </div>
    </div>
  );
}