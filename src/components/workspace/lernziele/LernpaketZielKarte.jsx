/**
 * LernpaketZielKarte
 * ──────────────────
 * Zeigt EIN Lernpaket mit seinen Lernzielen als bearbeitbare Karte im
 * Lernziele-Tab (Schritt A des Lernziele-Heimatort-Konzepts).
 *
 * Wiederverwendet die bewährte `LernzielRow` (inkl. KI-Prüfung) aus dem
 * Strukturboard-Dialog. Speichern läuft pro Paket über den `onSave`-Callback,
 * der die eigentliche Persistenz im übergeordneten Tab kapselt.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Save, Loader2, PenLine, Lock, X } from 'lucide-react';
import LernzielRow from '@/components/workspace/LernzielRow';
import { useLernpaketLock } from '@/hooks/useLocks';

let _tmpCounter = 0;
const tmpId = () => `tmp_${Date.now()}_${_tmpCounter++}`;

export default function LernpaketZielKarte({
  paket,
  themenfeldTitel,
  ziele,
  kontext,
  kannBearbeiten,
  onSave,
}) {
  // Lokaler, bearbeitbarer Entwurf der Lernziele dieses Pakets.
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);

  // Bearbeitungsmodus per Lernpaket-Lock — exakt wie in Tab 4/5/6.
  // canEdit = ich halte den Lock; isLockedByOther = jemand anderes bearbeitet.
  const {
    canEdit,
    isLockedByOther,
    lockedByEmail,
    lockErrorMessage,
    acquireLock,
    releaseLock,
  } = useLernpaketLock(paket.id);

  // Freigegebenes Lernpaket → alle Inhalte gesperrt, kein Bearbeiten.
  const lernpaketReleased = paket.content_status === 'approved' && !!paket.released_at;

  // Effektive Bearbeitbarkeit: nur wenn Rolle erlaubt UND Lock gehalten wird.
  const editierbar = kannBearbeiten && canEdit;

  // Server-Ziele in den Entwurf spiegeln (nur wenn nicht gerade bearbeitet).
  useEffect(() => {
    if (dirty) return;
    setDraft(
      (ziele || []).map((z) => ({
        id: z.id,
        _persisted: true,
        formulierung_fachsprache: z.formulierung_fachsprache || '',
        schueler_uebersetzung: z.schueler_uebersetzung || '',
        kategorie: z.kategorie || '',
        // Verknüpfungs-Info durchreichen (für Badge + Lösch-Warnung).
        verknuepfte_aufgaben_count: z.verknuepfte_aufgaben_count || 0,
        verknuepfte_aufgaben_titel: z.verknuepfte_aufgaben_titel || [],
      }))
    );
  }, [ziele, dirty]);

  const updateZiel = useCallback((id, field, value) => {
    setDirty(true);
    setDraft((prev) => prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)));
  }, []);

  const addZiel = useCallback(() => {
    setDirty(true);
    setDraft((prev) => [
      ...prev,
      { id: tmpId(), _persisted: false, formulierung_fachsprache: '', schueler_uebersetzung: '', kategorie: '' },
    ]);
  }, []);

  const removeZiel = useCallback((id) => {
    setDirty(true);
    setDraft((prev) => prev.filter((z) => z.id !== id));
  }, []);

  // Bearbeiten starten: Lock erwerben (öffnet den Edit-Modus).
  const handleEnterEdit = async () => {
    if (isAcquiringLock || canEdit || isLockedByOther) return;
    setIsAcquiringLock(true);
    try {
      const ok = await acquireLock();
      if (!ok) {
        toast.error(
          lockErrorMessage ||
            (lockedByEmail
              ? `🔒 Dieses Lernpaket wird aktuell von ${lockedByEmail} bearbeitet.`
              : 'Lock konnte nicht erworben werden.')
        );
      }
    } finally {
      setIsAcquiringLock(false);
    }
  };

  // Abbrechen: Entwurf zurücksetzen + Lock freigeben.
  const handleCancelEdit = async () => {
    setDirty(false);
    setDraft(
      (ziele || []).map((z) => ({
        id: z.id,
        _persisted: true,
        formulierung_fachsprache: z.formulierung_fachsprache || '',
        schueler_uebersetzung: z.schueler_uebersetzung || '',
        kategorie: z.kategorie || '',
        verknuepfte_aufgaben_count: z.verknuepfte_aufgaben_count || 0,
        verknuepfte_aufgaben_titel: z.verknuepfte_aufgaben_titel || [],
      }))
    );
    try {
      await releaseLock();
    } catch {
      /* Lock-Freigabe ist best-effort */
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(paket.id, draft, ziele);
      setDirty(false);
      // Nach erfolgreichem Speichern Lock freigeben (Edit-Modus beenden).
      try {
        await releaseLock();
      } catch {
        /* best-effort */
      }
    } finally {
      setSaving(false);
    }
  };

  // Sicherheitsnetz: Lock freigeben, wenn die Karte unmountet (z.B. Wechsel
  // des Lernpakets in der Sidebar), während ich noch im Edit-Modus bin.
  useEffect(() => {
    return () => {
      if (canEdit) {
        releaseLock().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  return (
    <div className="space-y-3">
      {/* Status-Banner: gesperrt durch anderen / eigener Bearbeitungsmodus */}
      {isLockedByOther && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>
            🔒 Wird gerade von <strong>{lockedByEmail}</strong> bearbeitet. Sobald die Bearbeitung beendet ist, wird das Lernpaket automatisch wieder freigegeben.
          </span>
        </div>
      )}
      {canEdit && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-orange-300 bg-orange-50 text-orange-900 text-xs">
          <PenLine className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Bearbeitungsmodus aktiv.</strong> Andere können dieses Lernpaket solange nicht ändern.
          </span>
        </div>
      )}

      {/* Aktions-Leiste: Bearbeiten / (im Edit-Modus) Speichern + Abbrechen */}
      {kannBearbeiten && (
        <div className="flex items-center justify-end gap-2">
          {!canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleEnterEdit}
              disabled={isAcquiringLock || isLockedByOther || lernpaketReleased}
              title={lernpaketReleased ? '🔒 Lernpaket ist freigegeben – Inhalte können nicht mehr bearbeitet werden.' : isLockedByOther ? `🔒 Wird gerade von ${lockedByEmail} bearbeitet` : ''}
              className="gap-1.5 h-7 text-xs bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:text-green-900"
            >
              {isAcquiringLock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
              {isAcquiringLock ? 'Öffne…' : 'Bearbeiten'}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={saving}
                className="gap-1.5 h-7 text-xs text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" /> Abbrechen
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5 h-7 text-xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Speichern
              </Button>
            </>
          )}
        </div>
      )}

      {draft.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2">
          Noch keine Lernziele für dieses Lernpaket.
        </p>
      )}
      <div className="space-y-1.5">
        {draft.map((lz, idx) => (
          <LernzielRow
            key={lz.id}
            lz={lz}
            idx={idx}
            onUpdate={editierbar ? updateZiel : () => {}}
            onRemove={editierbar ? removeZiel : () => {}}
            readOnly={!editierbar}
            kontext={{ ...kontext, lernpaket_titel: paket.titel_des_pakets }}
          />
        ))}

        {editierbar && (
          <div className="flex items-center pt-1">
            <Button type="button" size="sm" variant="outline" onClick={addZiel} className="gap-1.5 h-7 text-xs">
              <Plus className="w-3.5 h-3.5" /> Lernziel hinzufügen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}