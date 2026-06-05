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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Loader2, Target, Clock, Layers } from 'lucide-react';
import LernzielRow from '@/components/workspace/LernzielRow';

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(paket.id, draft, ziele);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{paket.titel_des_pakets}</h3>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            {themenfeldTitel && (
              <span className="truncate">{themenfeldTitel}</span>
            )}
            {paket.geschaetzte_dauer_minuten ? (
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" /> {paket.geschaetzte_dauer_minuten} Min.
              </span>
            ) : null}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 gap-1">
          <Target className="w-3 h-3" /> {draft.length}
        </Badge>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2.5">
        {draft.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">
            Noch keine Lernziele für dieses Lernpaket.
          </p>
        )}
        {draft.map((lz, idx) => (
          <LernzielRow
            key={lz.id}
            lz={lz}
            idx={idx}
            onUpdate={kannBearbeiten ? updateZiel : () => {}}
            onRemove={kannBearbeiten ? removeZiel : () => {}}
            kontext={{ ...kontext, lernpaket_titel: paket.titel_des_pakets }}
          />
        ))}

        {kannBearbeiten && (
          <div className="flex items-center justify-between pt-1">
            <Button type="button" size="sm" variant="outline" onClick={addZiel} className="gap-1.5 h-7 text-xs">
              <Plus className="w-3.5 h-3.5" /> Lernziel hinzufügen
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="gap-1.5 h-7 text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {dirty ? 'Speichern' : 'Gespeichert'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}