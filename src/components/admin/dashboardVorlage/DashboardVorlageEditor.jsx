/**
 * DashboardVorlageEditor.jsx
 *
 * Admin-Editor für die Standard-Dashboard-Vorlagen (Verwaltung → Dashboards).
 *
 * Funktion:
 *   - Lädt die DB-Vorlagen (getDashboardStandardVorlagen) und mischt sie mit
 *     dem Hardcode-Fallback (buildEffectiveTemplates).
 *   - Pro Lerntyp ein Tab; der Admin baut die Sektor-/Baustein-Struktur per
 *     Drag&Drop zusammen (nur System-Bausteine, keine echten Aufgaben).
 *   - Speichern pro Lerntyp via saveDashboardStandardVorlage.
 *   - „Werks-Standard wiederherstellen" lädt den Hardcode-Fallback in den
 *     Editor (noch nicht gespeichert – Admin muss bewusst speichern).
 *
 * Schlanker, eigenständiger DnD-Handler: Items sind ausschließlich
 * System-Bausteine in einer flachen Liste pro Sektor. Keine Bündel-Children-
 * Hierarchie nötig (Bündel werden hier als einzelne Platzhalter-Container
 * platziert; die Befüllung passiert erst in der echten Einheit).
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Save, RotateCcw, Plus, Check } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LERN_TYPEN } from '@/components/lernpfade/LernpfadeArchitekt';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';
import { buildEffectiveTemplates } from '@/lib/dashboardStandardVorlage';
import { normalizeSektor, normalizeItem, createNewSektor } from '@/lib/lernpfadeUtils';
import { SEKTOR_TYP, getSektorTypLabel } from '@/lib/sektorTypen';
import { getSektorTemplate, SEKTOR_TEMPLATE_KEYS } from '@/lib/sektorTemplates';
import SystemBausteinPool from '@/components/admin/dashboardVorlage/SystemBausteinPool';
import VorlageSektor from '@/components/admin/dashboardVorlage/VorlageSektor';

const SYSTEM_DRAG_PREFIX = 'system-';
const PFAD_ITEM_PREFIX = 'vitem-';

// Sektor-Typen, die der Admin in der Vorlage hinzufügen kann.
const ADD_SEKTOR_OPTIONS = [
  { key: SEKTOR_TYP.ONBOARDING, label: 'Onboarding' },
  { key: SEKTOR_TYP.UEBERBLICK, label: 'Überblick / Lernlandkarte' },
  { key: SEKTOR_TYP.ARBEITSPHASE, label: 'Arbeitsphase (Muster)' },
  { key: SEKTOR_TYP.ZWISCHENTEST, label: 'Zwischentest' },
  { key: SEKTOR_TYP.ABSCHLUSSTEST, label: 'Abschlusstest' },
  { key: SEKTOR_TYP.PROJEKTE, label: 'Projekte' },
  { key: SEKTOR_TYP.FEEDBACK, label: 'Feedback' },
  { key: SEKTOR_TYP.INDIVIDUELL, label: 'Leerer Sektor' },
];

/** Normalisiert ein komplettes Templates-Objekt (alle Lerntypen) für den Editor. */
function normalizeTemplates(templates) {
  const out = {};
  for (const lt of LERN_TYPEN.map((t) => t.key)) {
    out[lt] = (Array.isArray(templates?.[lt]) ? templates[lt] : []).map(normalizeSektor);
  }
  return out;
}

export default function DashboardVorlageEditor() {
  const queryClient = useQueryClient();
  const [activeLernTyp, setActiveLernTyp] = useState('minimalist');
  const [konfig, setKonfig] = useState(null);
  const [dirty, setDirty] = useState({}); // { lerntyp: true } – ungespeicherte Änderungen

  // System-Bausteine (Pool-Quelle).
  const { data: systemBausteine = [], isLoading: loadingBausteine } = useQuery({
    queryKey: ['systemBausteine', 'aktiv'],
    queryFn: async () => {
      const list = await base44.entities.SystemBausteine.list('reihenfolge');
      return (list || []).filter((b) => b.ist_aktiv !== false);
    },
  });
  const systemBausteineById = useMemo(() => {
    const m = new Map();
    (systemBausteine || []).forEach((b) => m.set(b.baustein_id, b));
    return m;
  }, [systemBausteine]);

  // DB-Vorlagen laden + mit Hardcode-Fallback mischen.
  const { data: vorlagenData, isLoading: loadingVorlagen } = useQuery({
    queryKey: ['dashboardStandardVorlagen'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getDashboardStandardVorlagen', {});
      return res?.data?.vorlagen || [];
    },
  });

  // Einmalige Initialisierung des Editor-States, sobald die Vorlagen geladen sind.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    if (loadingVorlagen) return;
    initRef.current = true;
    const effective = buildEffectiveTemplates(vorlagenData || []);
    setKonfig(normalizeTemplates(effective));
  }, [loadingVorlagen, vorlagenData]);

  const markDirty = useCallback((lt) => {
    setDirty((prev) => ({ ...prev, [lt]: true }));
  }, []);

  const sektoren = konfig?.[activeLernTyp] || [];

  // ── Mutationen auf der aktiven Lerntyp-Liste ────────────────────────
  const updateSektoren = useCallback(
    (updater) => {
      setKonfig((prev) => {
        const list = prev?.[activeLernTyp] || [];
        const next = typeof updater === 'function' ? updater(list) : updater;
        return { ...prev, [activeLernTyp]: next };
      });
      markDirty(activeLernTyp);
    },
    [activeLernTyp, markDirty]
  );

  const handlePatchSektor = useCallback((sektorId, patch) => {
    updateSektoren((list) => list.map((s) => (s.sektor_id === sektorId ? { ...s, ...patch } : s)));
  }, [updateSektoren]);

  const handleRemoveSektor = useCallback((sektorId) => {
    updateSektoren((list) => list.filter((s) => s.sektor_id !== sektorId));
  }, [updateSektoren]);

  const handleMoveSektor = useCallback((sektorId, dir) => {
    updateSektoren((list) => {
      const idx = list.findIndex((s) => s.sektor_id === sektorId);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, [updateSektoren]);

  const handleSetBundleModus = useCallback((sektorId, itemIndex, modus) => {
    updateSektoren((list) =>
      list.map((s) => {
        if (s.sektor_id !== sektorId) return s;
        const items = (s.items || []).map((it, idx) => {
          if (idx !== itemIndex) return it;
          const nextConfig = { ...(it.bundle_config || {}), modus };
          if (modus === 'sequenziell') delete nextConfig.erforderliche_anzahl;
          return { ...it, bundle_config: nextConfig };
        });
        return { ...s, items };
      })
    );
  }, [updateSektoren]);

  // Lernpaket-Innen-Modus (nur Lernpaketebündel): Wie werden die Aktivitäten
  // INNERHALB eines einzelnen Lernpakets bearbeitet? (sequenziell | frei)
  const handleSetLernpaketModus = useCallback((sektorId, itemIndex, modus) => {
    updateSektoren((list) =>
      list.map((s) => {
        if (s.sektor_id !== sektorId) return s;
        const items = (s.items || []).map((it, idx) => {
          if (idx !== itemIndex) return it;
          return { ...it, bundle_config: { ...(it.bundle_config || {}), lernpaket_modus: modus } };
        });
        return { ...s, items };
      })
    );
  }, [updateSektoren]);

  const handleRemoveItem = useCallback((sektorId, itemIndex) => {
    updateSektoren((list) =>
      list.map((s) => {
        if (s.sektor_id !== sektorId) return s;
        const items = [...(s.items || [])];
        items.splice(itemIndex, 1);
        return { ...s, items };
      })
    );
  }, [updateSektoren]);

  const handleAddSektor = useCallback((typ) => {
    let sektor;
    if (typ === SEKTOR_TYP.ZWISCHENTEST) {
      const tpl = getSektorTemplate(SEKTOR_TEMPLATE_KEYS.ZWISCHENTEST);
      sektor = createNewSektor({ titel: tpl.titel, items: tpl.items, sektor_typ: SEKTOR_TYP.ZWISCHENTEST });
    } else if (typ === SEKTOR_TYP.ARBEITSPHASE) {
      sektor = createNewSektor({ titel: 'Muster-Arbeitsphase', items: [], sektor_typ: SEKTOR_TYP.ARBEITSPHASE });
    } else {
      sektor = createNewSektor({ titel: getSektorTypLabel(typ), items: [], sektor_typ: typ });
    }
    updateSektoren((list) => [...list, sektor]);
  }, [updateSektoren]);

  // ── Drag & Drop (schlank, nur System-Items, flache Liste) ───────────
  const handleDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (!destination.droppableId.startsWith('vsektor-')) return;
    const toSektorId = destination.droppableId.slice('vsektor-'.length);

    // Aus dem Pool: neuer System-Baustein.
    if (source.droppableId === 'pool-system' && draggableId.startsWith(SYSTEM_DRAG_PREFIX)) {
      const refId = draggableId.slice(SYSTEM_DRAG_PREFIX.length);
      updateSektoren((list) =>
        list.map((s) => {
          if (s.sektor_id !== toSektorId) return s;
          const items = [...(s.items || [])];
          const at = Math.max(0, Math.min(destination.index, items.length));
          items.splice(at, 0, normalizeItem({ type: 'system', ref_id: refId, parent_instance_id: null }));
          return { ...s, items };
        })
      );
      return;
    }

    // Bestehendes Item verschieben (innerhalb / zwischen Sektoren).
    if (!draggableId.startsWith(PFAD_ITEM_PREFIX)) return;
    const instanceId = draggableId.slice(PFAD_ITEM_PREFIX.length);
    const fromSektorId = source.droppableId.slice('vsektor-'.length);

    updateSektoren((list) => {
      const next = list.map((s) => ({ ...s, items: [...(s.items || [])] }));
      const from = next.find((s) => s.sektor_id === fromSektorId);
      const to = next.find((s) => s.sektor_id === toSektorId);
      if (!from || !to) return list;
      const fromIdx = from.items.findIndex((it) => it.instance_id === instanceId);
      if (fromIdx === -1) return list;
      const [moved] = from.items.splice(fromIdx, 1);
      const at = Math.max(0, Math.min(destination.index, to.items.length));
      to.items.splice(at, 0, moved);
      return next;
    });
  }, [updateSektoren]);

  // ── Speichern ───────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (lerntyp) => {
      const list = konfig?.[lerntyp] || [];
      // Nur die exportrelevanten Felder persistieren (kein React-Ballast).
      const cleanSektoren = list.map((s) => ({
        sektor_id: s.sektor_id,
        titel: s.titel,
        modus: s.modus === 'frei' ? 'frei' : 'sequenziell',
        sektor_typ: s.sektor_typ,
        freischalt_bedingung:
          s.freischalt_bedingung?.modus === 'nach_vorgaenger'
            ? { modus: 'nach_vorgaenger', voraussetzung_sektor_id: null }
            : s.freischalt_bedingung?.modus === 'nach_sektor' && s.freischalt_bedingung?.voraussetzung_sektor_id
              ? { modus: 'nach_sektor', voraussetzung_sektor_id: s.freischalt_bedingung.voraussetzung_sektor_id }
              : { modus: 'sofort', voraussetzung_sektor_id: null },
        items: (s.items || []).map((it) => {
          const out = { type: it.type, ref_id: it.ref_id };
          if (it.bundle_config?.modus || it.bundle_config?.lernpaket_modus) {
            out.bundle_config = {};
            if (it.bundle_config.modus) out.bundle_config.modus = it.bundle_config.modus;
            if (it.bundle_config.lernpaket_modus) {
              out.bundle_config.lernpaket_modus = it.bundle_config.lernpaket_modus;
            }
          }
          return out;
        }),
      }));
      const res = await base44.functions.invoke('saveDashboardStandardVorlage', {
        lerntyp,
        sektoren: cleanSektoren,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data;
    },
    onSuccess: (_d, lerntyp) => {
      setDirty((prev) => { const n = { ...prev }; delete n[lerntyp]; return n; });
      queryClient.invalidateQueries({ queryKey: ['dashboardStandardVorlagen'] });
      const label = LERN_TYPEN.find((t) => t.key === lerntyp)?.label || lerntyp;
      toast.success(`Standard-Vorlage „${label}" gespeichert.`);
    },
    onError: (err) => {
      toast.error(err?.message || 'Speichern fehlgeschlagen.');
    },
  });

  const handleRestoreHardcode = useCallback(() => {
    const ok = window.confirm(
      'Werks-Standard für diesen Lerntyp im Editor wiederherstellen? Die Änderungen werden erst beim Speichern übernommen.'
    );
    if (!ok) return;
    const hard = (DASHBOARD_TEMPLATES[activeLernTyp] || []).map(normalizeSektor);
    setKonfig((prev) => ({ ...prev, [activeLernTyp]: hard }));
    markDirty(activeLernTyp);
  }, [activeLernTyp, markDirty]);

  if (loadingVorlagen || !konfig) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isDirty = !!dirty[activeLernTyp];

  return (
    <div className="flex flex-col h-[70vh] min-h-[480px] rounded-xl border border-border overflow-hidden bg-card">
      {/* Lerntyp-Tabs */}
      <div className="shrink-0 flex items-center gap-1.5 p-2 border-b border-border bg-muted/30 overflow-x-auto">
        {LERN_TYPEN.map((t) => {
          const Icon = t.icon;
          const active = activeLernTyp === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveLernTyp(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all shrink-0 ${
                active ? `${t.color.bgSolid} ${t.color.textOn} border-transparent shadow-sm` : `bg-card ${t.color.text} ${t.color.border} hover:${t.color.bg}`
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {dirty[t.key] && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" title="Ungespeichert" />}
            </button>
          );
        })}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Pool */}
          <aside className="w-[280px] shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
            <SystemBausteinPool bausteine={systemBausteine} isLoading={loadingBausteine} />
          </aside>

          {/* Canvas */}
          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Sektor hinzufügen
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Sektor-Typ wählen</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ADD_SEKTOR_OPTIONS.map((o) => (
                    <DropdownMenuItem key={o.key} onClick={() => handleAddSektor(o.key)}>
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleRestoreHardcode}>
                  <RotateCcw className="w-3.5 h-3.5" /> Werks-Standard
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!isDirty || saveMutation.isPending}
                  onClick={() => saveMutation.mutate(activeLernTyp)}
                >
                  {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isDirty ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  {isDirty ? 'Vorlage speichern' : 'Gespeichert'}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-muted/20 min-h-0 space-y-3">
              {sektoren.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-sm text-muted-foreground">
                  Noch keine Sektoren. Füge oben einen Sektor hinzu.
                </div>
              ) : (
                sektoren.map((s, i) => (
                  <VorlageSektor
                    key={s.sektor_id}
                    sektor={s}
                    index={i}
                    total={sektoren.length}
                    systemBausteineById={systemBausteineById}
                    onPatch={handlePatchSektor}
                    onRemoveSektor={handleRemoveSektor}
                    onMoveSektor={handleMoveSektor}
                    onRemoveItem={handleRemoveItem}
                    onSetBundleModus={handleSetBundleModus}
                    onSetLernpaketModus={handleSetLernpaketModus}
                    alleSektoren={sektoren}
                  />
                ))
              )}
            </div>
          </main>
        </div>
      </DragDropContext>
    </div>
  );
}