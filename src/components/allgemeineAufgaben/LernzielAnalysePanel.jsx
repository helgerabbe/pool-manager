/**
 * LernzielAnalysePanel.jsx
 *
 * KI-gestützte Lernzielanalyse (Opt-in-Variante).
 *
 * Workflow:
 *   1. Lehrer startet die KI-Analyse. Die KI schaut sich an:
 *      - bestehende Lernziele der Einheit (🔵, mit Themenfeld-Kontext),
 *      - Basis-Lernziele der Basismodule des Faches (🟠),
 *      - schlägt zusätzlich neue, konkret-übbare Lernziele vor (✨),
 *      - und nennt Lücken im Basismodul (🟣, "müsste es geben").
 *   2. Der Lehrer wählt bewusst aus (Anklicken → grün = übernommen).
 *      Nichts ist vorausgewählt.
 *   3. KI-Vorschläge & Lücken-Hinweise sind sprachlich editierbar;
 *      bestehende & Basismodul-Lernziele bleiben unverändert (Originale).
 *   4. "3 weitere Vorschläge" ergänzt zusätzliche KI-Ideen.
 *   5. Eigenes Lernziel manuell ergänzen bleibt möglich.
 *
 * Gespeichert wird in `aufgabe.lernzielanalyse.items` — aber NUR die
 * ausgewählten Einträge (die kuratierte Ergebnis-Liste). Vorschläge, die der
 * Lehrer (noch) nicht angeklickt hat, leben nur im lokalen UI-State.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Plus, Info } from 'lucide-react';
import { toast } from 'sonner';
import LernzielAnalyseItem from '@/components/allgemeineAufgaben/LernzielAnalyseItem';

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `lz-${Date.now()}-${idCounter}`;
}

// Gruppen-Reihenfolge + Überschriften für die Anzeige.
const GRUPPEN = [
  { key: 'aktuelles', label: 'Aus dem aktuellen Themenfeld' },
  { key: 'anderes', label: 'Aus anderen Themenfeldern der Einheit' },
  { key: 'ki', label: 'Neue KI-Vorschläge' },
  { key: 'basismodul', label: 'Vorwissen aus Basismodulen' },
  { key: 'basismodul_luecke', label: 'Hinweis: fehlt noch im Basismodul' },
  { key: 'manuell', label: 'Manuell ergänzt' },
];

function gruppeOf(item) {
  if (item.quelle === 'bestehend') return item.ist_aktuelles_themenfeld ? 'aktuelles' : 'anderes';
  if (item.quelle === 'basismodul') return 'basismodul';
  if (item.quelle === 'basismodul_luecke') return 'basismodul_luecke';
  if (item.quelle === 'manuell') return 'manuell';
  return 'ki';
}

export default function LernzielAnalysePanel({ aufgabe, kannBearbeiten = false }) {
  const queryClient = useQueryClient();
  // Alle in der Liste sichtbaren Einträge (ausgewählte + noch nicht ausgewählte Vorschläge).
  const [items, setItems] = useState([]);
  // Set lokaler IDs der ausgewählten (= übernommenen) Einträge.
  const [selected, setSelected] = useState(new Set());
  const [neuerEintrag, setNeuerEintrag] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [mehrLoading, setMehrLoading] = useState(false);

  // Gespeicherte (ausgewählte) Liste der Aufgabe laden → sind automatisch "selected".
  useEffect(() => {
    const gespeichert = Array.isArray(aufgabe?.lernzielanalyse?.items)
      ? aufgabe.lernzielanalyse.items
      : [];
    // Sicherstellen, dass jeder Eintrag eine lokale id hat.
    const withIds = gespeichert.map((it) => ({ ...it, id: it.id || makeId() }));
    setItems(withIds);
    setSelected(new Set(withIds.map((it) => it.id)));
    setNeuerEintrag('');
  }, [aufgabe?.id]);

  const saveMutation = useMutation({
    mutationFn: (itemsToSave) =>
      updateAllgemeineAufgabe(aufgabe.id, {
        lernzielanalyse: { items: itemsToSave, analysiert_am: new Date().toISOString() },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] }),
    onError: () => toast.error('Fehler beim Speichern der Lernzielanalyse'),
  });

  // Speichert nur die ausgewählten Einträge (kuratierte Ergebnis-Liste).
  const persist = useCallback(
    (nextItems, nextSelected) => {
      const ausgewaehlt = nextItems
        .filter((it) => nextSelected.has(it.id))
        .map(({ id, text, quelle, lernziel_id, basislernziel_id, themenfeld_id, themenfeld_titel, lernpaket_titel, basismodul_titel, ist_aktuelles_themenfeld }) => ({
          id, text, quelle: quelle || 'manuell',
          ...(lernziel_id && { lernziel_id }),
          ...(basislernziel_id && { basislernziel_id }),
          ...(themenfeld_id && { themenfeld_id }),
          ...(themenfeld_titel && { themenfeld_titel }),
          ...(lernpaket_titel && { lernpaket_titel }),
          ...(basismodul_titel && { basismodul_titel }),
          ...(ist_aktuelles_themenfeld != null && { ist_aktuelles_themenfeld }),
        }));
      saveMutation.mutate(ausgewaehlt);
    },
    [saveMutation]
  );

  const handleAnalyze = async () => {
    if (!kannBearbeiten || !aufgabe?.id) return;
    setAnalyzing(true);
    try {
      const res = await base44.functions.invoke('analyzeAufgabeLernziele', { aufgabeId: aufgabe.id });
      if (res?.data?.error) throw new Error(res.data.error);
      const d = res.data || {};

      const neueItems = [];
      (d.bestehende || []).forEach((lz) => neueItems.push({
        id: makeId(), text: lz.text, quelle: 'bestehend',
        lernziel_id: lz.id, themenfeld_id: lz.themenfeld_id,
        themenfeld_titel: lz.themenfeld_titel, lernpaket_titel: lz.lernpaket_titel,
        ist_aktuelles_themenfeld: lz.ist_aktuelles_themenfeld,
      }));
      (d.basismodul || []).forEach((bl) => neueItems.push({
        id: makeId(), text: bl.text, quelle: 'basismodul',
        basislernziel_id: bl.id, basismodul_titel: bl.basismodul_titel,
      }));
      (d.neue_vorschlaege || []).forEach((t) => neueItems.push({ id: makeId(), text: t, quelle: 'ki' }));
      (d.basismodul_luecken || []).forEach((t) => neueItems.push({ id: makeId(), text: t, quelle: 'basismodul_luecke' }));

      // Bereits ausgewählte (gespeicherte) Einträge behalten, Vorschläge ergänzen.
      const behaltene = items.filter((it) => selected.has(it.id));
      const merged = [...behaltene, ...neueItems];
      setItems(merged);
      // Auswahl bleibt wie sie war (nur bisher Gespeichertes ist grün).
      toast.success(`${neueItems.length} Vorschläge erstellt – wähle die passenden aus`);
    } catch (err) {
      toast.error(err?.message || 'KI-Analyse fehlgeschlagen');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMehr = async () => {
    if (!kannBearbeiten || !aufgabe?.id) return;
    setMehrLoading(true);
    try {
      const vorhandene_texte = items.map((it) => it.text);
      const res = await base44.functions.invoke('analyzeAufgabeLernziele', {
        aufgabeId: aufgabe.id, modus: 'mehr', vorhandene_texte,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      const neue = res.data?.neue_vorschlaege || [];
      if (neue.length === 0 || res.data?.keine_weiteren) {
        toast.info('Die KI hat keine weiteren sinnvollen Lernziele gefunden.');
        return;
      }
      const neueItems = neue.map((t) => ({ id: makeId(), text: t, quelle: 'ki' }));
      setItems((prev) => [...prev, ...neueItems]);
      toast.success(`${neueItems.length} weitere Vorschläge ergänzt`);
    } catch (err) {
      toast.error(err?.message || 'KI-Analyse fehlgeschlagen');
    } finally {
      setMehrLoading(false);
    }
  };

  const handleToggle = (id, on) => {
    if (!kannBearbeiten) return;
    const next = new Set(selected);
    if (on) next.add(id); else next.delete(id);
    setSelected(next);
    persist(items, next);
  };

  const handleEdit = (id, text) => {
    if (!kannBearbeiten) return;
    const next = items.map((it) => (it.id === id ? { ...it, text } : it));
    setItems(next);
    if (selected.has(id)) persist(next, selected);
  };

  const handleRemove = (id) => {
    if (!kannBearbeiten) return;
    const next = items.filter((it) => it.id !== id);
    const nextSel = new Set(selected);
    nextSel.delete(id);
    setItems(next);
    setSelected(nextSel);
    persist(next, nextSel);
  };

  const handleAddManual = () => {
    if (!kannBearbeiten) return;
    const text = neuerEintrag.trim();
    if (!text) return;
    const id = makeId();
    const next = [...items, { id, text, quelle: 'manuell' }];
    const nextSel = new Set(selected);
    nextSel.add(id); // manuell ergänzte sind sofort ausgewählt
    setItems(next);
    setSelected(nextSel);
    setNeuerEintrag('');
    persist(next, nextSel);
  };

  // Items nach Gruppe sortieren.
  const gruppiert = useMemo(() => {
    const map = {};
    for (const g of GRUPPEN) map[g.key] = [];
    for (const it of items) {
      const g = gruppeOf(it);
      (map[g] || map.ki).push(it);
    }
    return map;
  }, [items]);

  const hatItems = items.length > 0;
  const anzahlAusgewaehlt = selected.size;

  return (
    <div className="p-4 space-y-3 max-w-3xl">
      {/* Kopf */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold">Lernzielanalyse</h3>
        <p className="text-[11px] text-muted-foreground leading-snug hidden sm:block">
          – KI durchsucht Einheit & Basismodule und schlägt neue Lernziele vor. Klick = grün = übernommen.
        </p>
      </div>

      {/* Aktionen */}
      {kannBearbeiten && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleAnalyze} disabled={analyzing || saveMutation.isPending} className="gap-2">
            {analyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />KI analysiert…</>
            ) : (
              <><Sparkles className="w-4 h-4" />{hatItems ? 'Analyse erneut starten' : 'Lernzielanalyse mit KI starten'}</>
            )}
          </Button>
          {hatItems && (
            <Button variant="outline" onClick={handleMehr} disabled={mehrLoading} className="gap-2">
              {mehrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              3 weitere Vorschläge
            </Button>
          )}
        </div>
      )}

      {/* Gruppierte Liste */}
      {hatItems && (
        <div className="space-y-2.5">
          {GRUPPEN.map((g) => {
            const list = gruppiert[g.key];
            if (!list || list.length === 0) return null;
            return (
              <div key={g.key} className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {g.label} ({list.length})
                </p>
                <div className="space-y-1">
                  {list.map((it) => (
                    <LernzielAnalyseItem
                      key={it.id}
                      item={it}
                      selected={selected.has(it.id)}
                      kannBearbeiten={kannBearbeiten}
                      onToggle={(on) => handleToggle(it.id, on)}
                      onEdit={(text) => handleEdit(it.id, text)}
                      onRemove={() => handleRemove(it.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manuelle Ergänzung */}
      {kannBearbeiten && (
        <div className="flex items-center gap-2">
          <Input
            value={neuerEintrag}
            onChange={(e) => setNeuerEintrag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddManual(); } }}
            placeholder="Eigenes Lernziel ergänzen…"
            className="text-sm"
          />
          <Button type="button" variant="outline" onClick={handleAddManual} disabled={!neuerEintrag.trim()} className="gap-1 shrink-0">
            <Plus className="w-4 h-4" />Hinzufügen
          </Button>
        </div>
      )}

      {/* Zusammenfassung / Leerzustand */}
      {hatItems ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-[11px] text-emerald-900">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>{anzahlAusgewaehlt}</strong> Lernziel{anzahlAusgewaehlt === 1 ? '' : 'e'} übernommen.
          </span>
        </div>
      ) : (
        !analyzing && (
          <div className="text-center py-5 text-[11px] text-muted-foreground border border-dashed border-border rounded-lg">
            Noch keine Lernzielanalyse vorhanden.
            {kannBearbeiten ? ' Starte die Analyse mit der KI oder ergänze Lernziele manuell.' : ''}
          </div>
        )
      )}
    </div>
  );
}