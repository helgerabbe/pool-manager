/**
 * EinheitVorschauModal
 * ────────────────────────────────────────────────────────────────────
 * Gesamt-Vorschau einer (privaten) Einheit aus Schülersicht.
 * Lädt das echte Schüler-Dashboard (/lernen/dashboard) in einem iframe —
 * ohne Poolzeit-Rahmen (kein Onboarding, kein Checkout, kein Lerntagebuch).
 *
 * Angeboten werden nur die für diese Einheit aktiven Lerntypen
 * (aktive_lerntypen); bei genau einem entfällt die Auswahl komplett.
 * Anzeigenamen kommen aus der schulweiten Lerntyp-Konfiguration.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Eye, RotateCcw } from 'lucide-react';
import { getAktiveLerntypKeys } from '@/lib/lerntypen';
import { useLerntypDefinitionen } from '@/hooks/useLerntypDefinitionen';

export default function EinheitVorschauModal({ open, onOpenChange, einheit }) {
  const { lerntypen } = useLerntypDefinitionen();
  const aktiveKeys = getAktiveLerntypKeys(einheit);
  const auswahl = lerntypen.filter((l) => aktiveKeys.includes(l.key));

  const [lerntyp, setLerntyp] = useState(aktiveKeys[0]);
  const [reloadKey, setReloadKey] = useState(0);

  const effektiverLerntyp = aktiveKeys.includes(lerntyp) ? lerntyp : aktiveKeys[0];
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const src = `${base}/lernen/dashboard?id=${einheit?.id}&lerntyp=${effektiverLerntyp}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[96vw] h-[94vh] p-0 gap-0 flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card">
          <Eye className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="min-w-0">
            <DialogTitle className="text-sm truncate">
              Vorschau: {einheit?.titel_der_einheit}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              So sieht die Einheit in diesem Augenblick aus Schülersicht aus.
            </DialogDescription>
          </div>
          <div className="ml-auto flex items-center gap-1.5 pr-8 flex-wrap">
            {auswahl.length > 1 &&
              auswahl.map((lt) => (
                <button
                  key={lt.key}
                  type="button"
                  onClick={() => setLerntyp(lt.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    effektiverLerntyp === lt.key
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {lt.name}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              title="Vorschau neu laden"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Aktualisieren
            </button>
          </div>
        </div>
        {open && einheit?.id && (
          <iframe
            key={`${effektiverLerntyp}-${reloadKey}`}
            src={src}
            title="Einheit-Vorschau (Schülersicht)"
            className="flex-1 w-full border-0 bg-background"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}