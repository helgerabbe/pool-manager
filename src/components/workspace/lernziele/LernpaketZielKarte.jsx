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
import { Plus, Save, Loader2 } from 'lucide-react';
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
    <div className="space-y-1.5">
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