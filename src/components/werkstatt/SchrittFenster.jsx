import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, Monitor } from 'lucide-react';
import SchrittEditor from '@/components/schritte/SchrittEditor';
import OffenerSchrittGespraech from '@/components/werkstatt/OffenerSchrittGespraech';
import AufgabensequenzSeite from '@/components/schueler/lesen/AufgabensequenzSeite';
import {
  SCHRITT_TYPEN, SCHRITT_STATUS, getSchrittTyp, istSchrittVollstaendig,
} from '@/lib/schrittTypen';

/**
 * SchrittFenster
 * ──────────────
 * Ebene 3 der Aufgabenwerkstatt: der INHALT eines einzelnen Schritts.
 *
 * Arbeitsteilung: Auf der Hauptseite ändert die Lehrkraft die STRUKTUR der
 * Folge (löschen, umsortieren, ergänzen). Hier drin ändert sie nur noch,
 * was in genau diesem einen Schritt steht. Diese Trennung ist der Grund für
 * das eigene Fenster — beides gleichzeitig auf einer Seite war zu voll.
 *
 * Entwurf statt Durchreichen: Änderungen laufen in einen lokalen Entwurf und
 * werden erst beim Übernehmen zurückgeschrieben. Ohne das hätte „Abbrechen"
 * keine Bedeutung — die Änderungen wären längst durchgesickert.
 *
 * Das Fenster liegt bewusst über dem Hauptdialog (zIndex 10001). Ein Dialog
 * im Dialog erbt sonst die Standardebene und öffnet sich unsichtbar dahinter.
 */
export default function SchrittFenster({
  open,
  schritt,
  nummer,
  aufgabeId,
  aufgabenstellung = '',
  kontext = {},
  isReleased = false,
  onUebernehmen,
  onAbbrechen,
}) {
  const [entwurf, setEntwurf] = useState(schritt);

  // Beim Öffnen (und bei Wechsel des Schritts) frisch vom Original starten.
  useEffect(() => {
    if (open) setEntwurf(schritt);
  }, [open, schritt]);

  if (!entwurf) return null;

  const typInfo = getSchrittTyp(entwurf.typ);
  const istOffen = entwurf.typ === SCHRITT_TYPEN.OFFEN;
  const vollstaendig = istSchrittVollstaendig(entwurf);

  const uebernehmen = () => {
    // Das Übernehmen ist die bewusste Bestätigung der Lehrkraft — erst hier
    // wird aus 'geplant' ein fertiger Schritt.
    onUebernehmen({
      ...entwurf,
      status: vollstaendig ? SCHRITT_STATUS.UEBERNOMMEN : SCHRITT_STATUS.GEBAUT,
    });
  };

  // Vorschau des Entwurfs — der echte Schüler-Renderer, mit einer Folge aus
  // genau diesem Schritt.
  const vorschauAktivitaet = {
    id: `entwurf-${entwurf.id}`,
    field_values: { sequenz_schritte: [entwurf], aufgabentext: aufgabenstellung },
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onAbbrechen(); }}>
      <DialogContent
        className="max-h-[94vh] w-[94vw] max-w-[1300px] overflow-hidden bg-slate-50 p-4 flex flex-col"
      >
        <DialogHeader className="border-b border-slate-200 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            Schritt {nummer}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              typInfo?.classes?.badge || 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              {typInfo?.label || entwurf.typ}
            </span>
            {entwurf.titel && (
              <span className="text-xs font-normal text-slate-500">· {entwurf.titel}</span>
            )}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            {istOffen
              ? 'Beschreiben Sie im Gespräch, was die Aufgabe können soll. Rechts sehen Sie sofort, wie sie bei den Schülern aussieht.'
              : 'Füllen Sie die Felder aus — rechts sehen Sie sofort, wie der Schritt bei den Schülern aussieht.'}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 flex-1 min-h-0">
          {/* Links: bearbeiten */}
          <div className="flex flex-col min-h-0 gap-3">
            <div className={`${istOffen ? 'shrink-0 max-h-[38vh]' : 'flex-1'} min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4`}>
              <SchrittEditor schritt={entwurf} onChange={setEntwurf} />
            </div>

            {istOffen && (
              <OffenerSchrittGespraech
                key={entwurf.id}
                schritt={entwurf}
                aufgabeId={aufgabeId}
                kontext={kontext}
                isReleased={isReleased}
                uebernehmenLabel="Diesen Stand verwenden"
                onUebernehmen={(fragment, snapshotHtml) => setEntwurf((e) => ({
                  ...e,
                  offen: { ...(e.offen || {}), fragment, snapshot_html: snapshotHtml },
                }))}
              />
            )}
          </div>

          {/* Rechts: Schülersicht des Entwurfs */}
          <div className="flex flex-col min-h-0 rounded-xl border-2 border-slate-300 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200 shrink-0">
              <Monitor className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">So sehen es die Schüler:innen</span>
            </div>
            <div className="flex-1 min-h-0 bg-background">
              <AufgabensequenzSeite
                aktivitaet={vorschauAktivitaet}
                busy={false}
                onErledigt={() => {}}
                onBack={() => {}}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 mt-3 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-500">
            {vollstaendig
              ? 'Der Schritt ist vollständig.'
              : 'Es fehlt noch etwas — übernehmen können Sie trotzdem und später weitermachen.'}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={onAbbrechen} className="gap-2">
              <X className="w-4 h-4" /> Abbrechen
            </Button>
            <Button onClick={uebernehmen} disabled={isReleased} className="gap-2">
              <Check className="w-4 h-4" /> Übernehmen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
