/**
 * ReleaseConfirmDialog.jsx
 *
 * Bestätigungs-Dialog für „Prüfen & freigeben" eines Lernpfads.
 * Zeigt das Ergebnis der Pre-Flight-Prüfung (alle Items grün) und fragt
 * dann explizit, ob der Pfad freigegeben werden soll.
 *
 * Wird nur geöffnet, wenn keine Blocker (gelb/rot) gefunden wurden – die
 * werden weiterhin vom `ReleaseBlockerModal` abgefangen.
 *
 * Props:
 *   - open, onOpenChange : Dialog-Steuerung.
 *   - lerntypLabel       : z. B. „Minimalist".
 *   - sektorCount        : Anzahl Sektoren im Pfad.
 *   - itemCount          : Anzahl aller Items (System + Aufgaben) im Pfad.
 *   - aufgabenCount      : Anzahl der inhaltlichen Aufgaben (für die Prüfung).
 *   - busy               : true → Buttons disablen + Spinner.
 *   - onConfirm          : Nutzer bestätigt → Lock-Aufruf.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle2, Loader2, Info } from 'lucide-react';

export default function ReleaseConfirmDialog({
  open,
  onOpenChange,
  lerntypLabel,
  sektorCount = 0,
  itemCount = 0,
  aufgabenCount = 0,
  busy = false,
  onConfirm,
}) {
  return (
    <Dialog open={!!open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Lernpfad freigeben
          </DialogTitle>
        </DialogHeader>

        {/* Ergebnis-Karte: erfolgreiche Prüfung */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900">
                Prüfung erfolgreich
              </p>
              <p className="text-xs text-emerald-800/90 mt-0.5">
                Alle Aufgaben in „{lerntypLabel}" sind grün und bereit für die Freigabe.
              </p>
              <ul className="mt-2 text-xs text-emerald-900/80 space-y-0.5">
                <li>• {sektorCount} Sektor{sektorCount === 1 ? '' : 'en'}</li>
                <li>• {itemCount} Element{itemCount === 1 ? '' : 'e'} insgesamt</li>
                <li>
                  • {aufgabenCount} inhaltliche Aufgabe{aufgabenCount === 1 ? '' : 'n'} (alle grün geprüft)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Folgenhinweis – Einordnung in den Gesamt-Workflow.
            Wichtig: Die Pfad-Freigabe ist NICHT die Veröffentlichung an Schüler,
            sondern ein Zwischenschritt. Schüler sehen den Pfad erst, wenn das
            Export-Team die Einheit später ins LMS exportiert. Bis dahin ist
            jede Pfad-Freigabe per „Entsperren" reversibel. */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed space-y-1.5">
            <p>
              Das ist ein <strong>Zwischenschritt zur Einheits-Freigabe</strong> –
              Schüler sehen den Pfad <strong>noch nicht</strong>. Die Komposition
              wird gesperrt, damit alle 4 Dashboards geprüft werden können.
            </p>
            <p>
              <strong>Rückgängig machen ist jederzeit möglich</strong>, solange
              die Einheit noch nicht final exportiert wurde. Erst wenn das
              Export-Team die Einheit ins LMS überträgt, wird der Pfad endgültig.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Jetzt freigeben & sperren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}