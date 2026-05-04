/**
 * MBKPromptGeneratorPanel.jsx
 *
 * Generator-Panel für die Moodle-Builder-KI (MBK), eingebettet in Tab 9
 * ("Moodle-Export"). Zeigt vier Akkordeon-Gruppen:
 *   1. Nukleus (1 Prompt)
 *   2. Persona (1 Prompt)
 *   3. Sektor-Anweisungen (4 Prompts, einer pro Lerntyp)
 *   4. Erstellungspakete (n Prompts: pro Lernpaket + pro AllgemeineAufgabe Ebene 2/3)
 *
 * Die Generierung erfolgt rein deterministisch (keine InvokeLLM-Aufrufe).
 * Die generierten Prompts werden in die ExportPrompts-Entity geschrieben
 * und können von der Lehrkraft kopiert oder im Bearbeitungsmodus manuell
 * angepasst werden.
 */
import React, { useMemo, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Users, Layers, Package, RefreshCw, Loader2, Download } from 'lucide-react';
import { useSchulStammdaten } from '@/hooks/useSchulStammdaten';
import { useExportPrompts } from '@/hooks/useExportPrompts';
import { useMBKBulkGenerate } from '@/hooks/useMBKBulkGenerate';
import { useRBAC } from '@/hooks/useRBAC';
import {
  LERNTYP_KEYS,
  buildSourceTimestampIndex,
  lookupSourceMaxTimestampFromIndex,
} from '@/lib/exportPromptSync';
import {
  buildNucleusPrompt,
  buildPersonaPrompt,
  buildSektorPrompt,
  buildErstellungspaketForLernpaket,
  buildErstellungspaketForAufgabe,
} from '@/lib/exportPromptTemplates';
import MBKPromptItem from './MBKPromptItem';
import MBKBulkPreviewDialog from './MBKBulkPreviewDialog';

const LERNTYP_LABELS = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

export default function MBKPromptGeneratorPanel({ einheitId }) {
  const [editingMode, setEditingMode] = useState(false);
  const { permissions } = useRBAC();

  // Sammelt eine Ref pro Prompt-Item, damit wir beim Ausschalten des
  // Bearbeitungsmodus alle offenen Drafts synchron flushen können.
  const itemRefs = useRef(new Map());
  const registerItemRef = useCallback((key) => (instance) => {
    if (instance) itemRefs.current.set(key, instance);
    else itemRefs.current.delete(key);
  }, []);

  const handleEditingModeChange = useCallback(async (next) => {
    // Nur beim Ausschalten flushen.
    if (!next && editingMode) {
      const flushes = [];
      for (const item of itemRefs.current.values()) {
        if (item?.flush) flushes.push(item.flush().catch(() => false));
      }
      const results = await Promise.all(flushes);
      const savedCount = results.filter(Boolean).length;
      if (savedCount > 0) {
        toast.success(`${savedCount} offene Änderung${savedCount === 1 ? '' : 'en'} gespeichert.`);
      }
    }
    setEditingMode(next);
  }, [editingMode]);

  // ── Daten laden ─────────────────────────────────────────────────────────
  const { data: einheit } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: async () => {
      const list = await base44.entities.Einheiten.filter({ id: einheitId });
      return list?.[0] || null;
    },
    enabled: !!einheitId,
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const paketIds = useMemo(() => lernpakete.map((p) => p.id), [lernpakete]);

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Lernziele.list();
      return all.filter((z) => paketIds.includes(z.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  const { data: aufgabenbausteine = [] } = useQuery({
    queryKey: ['aufgabenbausteine-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Aufgabenbausteine.list();
      return all.filter((a) => paketIds.includes(a.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  // Echte Aufgabeninhalte eines Lernpakets liegen in LernpaketPhaseAktivitaet
  // (gegliedert nach Phase Input → Übung → Abschluss). Diese Records werden
  // im Erstellungspaket zusammen mit dem AktivitaetenKatalog (für die
  // Aktivitäts-Namen + Feldlabel) gerendert.
  const { data: phaseAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });
  const katalogById = useMemo(() => {
    const m = new Map();
    for (const k of aktivitaetenKatalog) m.set(k.id, k);
    return m;
  }, [aktivitaetenKatalog]);

  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  // Nur Ebene 2 + Ebene 3 für Erstellungspakete
  const allgemeineAufgabenEbene23 = useMemo(
    () => allgemeineAufgaben.filter(
      (a) => a.anforderungsebene === '2 - Transfer' || a.anforderungsebene === '3 - Projekt'
    ),
    [allgemeineAufgaben]
  );

  const { land, bundesland, schulform } = useSchulStammdaten();
  const stammdaten = { land, bundesland, schulform };

  const { prompts, isLoading: promptsLoading, upsert } = useExportPrompts(einheitId);

  // Source-Timestamp-Index — einmal pro Render-Schub berechnen, statt bei
  // jedem Item den ganzen Lernziele/Aufgaben-Array zu scannen.
  const tsIndex = useMemo(
    () => buildSourceTimestampIndex({
      einheit, themenfelder, lernpakete, lernziele, aufgabenbausteine, phaseAktivitaeten, allgemeineAufgaben,
    }),
    [einheit, themenfelder, lernpakete, lernziele, aufgabenbausteine, phaseAktivitaeten, allgemeineAufgaben]
  );

  // ── Bulk-Generator + Helper-Funktionen ──────────────────────────────────
  const {
    bulkRunning,
    runBulk,
    previewOpen,
    setPreviewOpen,
    plan,
    planSummary,
    exportMarkdown,
    lookupPrompt,
    isPromptOutOfSync,
    isErstellungspaketBlocked,
  } = useMBKBulkGenerate({
    einheitId,
    einheit,
    stammdaten,
    themenfelder,
    lernpakete,
    lernziele,
    aufgabenbausteine,
    phaseAktivitaeten,
    katalogById,
    allgemeineAufgaben,
    allgemeineAufgabenEbene23,
    prompts,
    upsert,
    tsIndex,
  });

  // Lookup gegen den vorberechneten Index — O(1) pro Item.
  const computeMaxTs = (promptType, referenceId = null) =>
    lookupSourceMaxTimestampFromIndex(tsIndex, promptType, referenceId);

  // ── Sortierung & Gruppierung der Erstellungspakete ──────────────────────
  // Hooks müssen VOR dem Early-Return stehen (rules-of-hooks).
  const themenfelderSorted = useMemo(
    () => [...themenfelder].sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)),
    [themenfelder]
  );
  const lernpaketeSorted = useMemo(
    () => [...lernpakete].sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)),
    [lernpakete]
  );
  const lernpaketGroups = useMemo(() => {
    const groups = themenfelderSorted.map((tf) => ({
      themenfeld: tf,
      pakete: lernpaketeSorted.filter((lp) => lp.themenfeld_id === tf.id),
    }));
    const orphans = lernpaketeSorted.filter(
      (lp) => !lp.themenfeld_id || !themenfelderSorted.some((tf) => tf.id === lp.themenfeld_id)
    );
    if (orphans.length > 0) {
      groups.push({ themenfeld: null, pakete: orphans });
    }
    return groups.filter((g) => g.pakete.length > 0);
  }, [themenfelderSorted, lernpaketeSorted]);

  // RBAC-Gate: Betrachter-Rollen sehen das Panel gar nicht erst — Lese-/
  // Schreibrechte werden serverseitig durch die ExportPrompts-RLS erzwungen,
  // hier vermeiden wir nur den 403-Klick aus der UI.
  if (!permissions.kannExportLesen) {
    return null;
  }

  if (!einheitId || !einheit) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Keine Einheit ausgewählt — der MBK-Generator benötigt eine konkrete Einheit.
      </div>
    );
  }

  // ── Sektion 1: Nukleus ──────────────────────────────────────────────────
  const nucleusPrompt = lookupPrompt('nucleus');
  const nucleusMaxTs = computeMaxTs('nucleus');
  const nucleusItem = (
    <MBKPromptItem
      ref={registerItemRef('nucleus::null')}
      label="Nukleus (Kontext-Anker)"
      promptType="nucleus"
      existingPrompt={nucleusPrompt}
      isOutOfSync={isPromptOutOfSync(nucleusPrompt, nucleusMaxTs)}
      editingMode={editingMode}
      buildContent={() => buildNucleusPrompt({ einheit, stammdaten, themenfelder, lernpakete, lernziele })}
      sourceMaxTimestamp={nucleusMaxTs}
      onUpsert={upsert}
    />
  );

  // ── Sektion 2: Persona ──────────────────────────────────────────────────
  const personaPrompt = lookupPrompt('persona');
  const personaMaxTs = computeMaxTs('persona');
  const personaItem = (
    <MBKPromptItem
      ref={registerItemRef('persona::null')}
      label="Persona & Tonalität"
      promptType="persona"
      existingPrompt={personaPrompt}
      isOutOfSync={isPromptOutOfSync(personaPrompt, personaMaxTs)}
      editingMode={editingMode}
      buildContent={() => buildPersonaPrompt({ einheit })}
      sourceMaxTimestamp={personaMaxTs}
      onUpsert={upsert}
    />
  );

  // ── Sektion 3: Sektor-Anweisungen pro Lerntyp ──────────────────────────
  const sektorItems = LERNTYP_KEYS.map((lerntyp) => {
    const existing = lookupPrompt('sektor_anweisung', lerntyp);
    const maxTs = computeMaxTs('sektor_anweisung', lerntyp);
    return (
      <MBKPromptItem
        key={lerntyp}
        ref={registerItemRef(`sektor_anweisung::${lerntyp}`)}
        label={`Sektoren · ${LERNTYP_LABELS[lerntyp]}`}
        promptType="sektor_anweisung"
        referenceId={lerntyp}
        existingPrompt={existing}
        isOutOfSync={isPromptOutOfSync(existing, maxTs)}
        editingMode={editingMode}
        buildContent={() => buildSektorPrompt({ einheit, lerntyp, themenfelder })}
        sourceMaxTimestamp={maxTs}
        onUpsert={upsert}
      />
    );
  });

  // ── Sektion 4: Erstellungspakete ────────────────────────────────────────
  const renderLernpaketItem = (lp) => {
    const existing = lookupPrompt('erstellungspaket', lp.id);
    const maxTs = computeMaxTs('erstellungspaket', lp.id);
    const blockReason = isErstellungspaketBlocked({
      referenceId: lp.id,
      lernpakete,
      allgemeineAufgaben,
    });
    const zieleDesPakets = lernziele.filter((z) => z.lernpaket_id === lp.id);
    const aufgabenDesPakets = aufgabenbausteine.filter((a) => a.lernpaket_id === lp.id);
    const phasenDesPakets = phaseAktivitaeten.filter((pa) => pa.lernpaket_id === lp.id);
    return (
      <MBKPromptItem
        key={`lp-${lp.id}`}
        ref={registerItemRef(`erstellungspaket::${lp.id}`)}
        label={`📦 Lernpaket: ${lp.titel_des_pakets || '(ohne Titel)'}`}
        promptType="erstellungspaket"
        referenceId={lp.id}
        existingPrompt={existing}
        isOutOfSync={isPromptOutOfSync(existing, maxTs)}
        isBlocked={!!blockReason}
        blockReason={blockReason || ''}
        editingMode={editingMode}
        buildContent={() =>
          buildErstellungspaketForLernpaket({
            lernpaket: lp,
            lernziele: zieleDesPakets,
            phaseAktivitaeten: phasenDesPakets,
            katalogById,
            aufgaben: aufgabenDesPakets,
          })
        }
        sourceMaxTimestamp={maxTs}
        onUpsert={upsert}
      />
    );
  };

  const aufgabenItems = allgemeineAufgabenEbene23.map((aa) => {
    const existing = lookupPrompt('erstellungspaket', aa.id);
    const maxTs = computeMaxTs('erstellungspaket', aa.id);
    const blockReason = isErstellungspaketBlocked({
      referenceId: aa.id,
      lernpakete,
      allgemeineAufgaben,
    });
    const ebeneLabel = aa.anforderungsebene === '3 - Projekt' ? 'Ebene 3' : 'Ebene 2';
    return (
      <MBKPromptItem
        key={`aa-${aa.id}`}
        ref={registerItemRef(`erstellungspaket::${aa.id}`)}
        label={`🎯 ${ebeneLabel}: ${aa.titel || '(ohne Titel)'}`}
        promptType="erstellungspaket"
        referenceId={aa.id}
        existingPrompt={existing}
        isOutOfSync={isPromptOutOfSync(existing, maxTs)}
        isBlocked={!!blockReason}
        blockReason={blockReason || ''}
        editingMode={editingMode}
        buildContent={() => buildErstellungspaketForAufgabe({ aufgabe: aa })}
        sourceMaxTimestamp={maxTs}
        onUpsert={upsert}
      />
    );
  });

  const erstellungspaketCount = lernpakete.length + aufgabenItems.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Moodle-Builder-KI · Prompt-Generator</h2>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Erzeugt deterministische Prompts für die externe Moodle-Builder-KI.
              Kopieren Sie die Prompts der Reihe nach in Ihre KI und folgen Sie der vorgegebenen Reihenfolge:
              Nukleus → Persona → Sektoren → Erstellungspakete.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
            disabled={!editingMode}
            className="gap-1.5"
            title={!editingMode ? 'Bearbeitungsmodus aktivieren, um zu exportieren.' : 'Lädt alle Prompts als nummerierte Markdown-Datei in der korrekten Reihenfolge.'}
          >
            <Download className="w-3.5 h-3.5" />
            Als Markdown
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setPreviewOpen(true)}
            disabled={bulkRunning || !editingMode}
            className="gap-1.5"
            title={!editingMode ? 'Bearbeitungsmodus aktivieren, um zu aktualisieren.' : 'Zeigt eine Vorschau, welche Prompts neu/aktualisiert/übersprungen werden.'}
          >
            {bulkRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Alle aktualisieren…
          </Button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
            <Switch
              id="mbk-edit-toggle"
              checked={editingMode}
              onCheckedChange={handleEditingModeChange}
            />
            <Label htmlFor="mbk-edit-toggle" className="text-xs cursor-pointer">
              Bearbeitungsmodus
            </Label>
          </div>
        </div>
      </div>

      {/* Akkordeon */}
      <Accordion type="multiple" defaultValue={['nucleus', 'persona', 'sektoren', 'erstellungspakete']} className="space-y-2">
        <AccordionItem value="nucleus" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-semibold">1. Nukleus</span>
              <span className="text-xs text-muted-foreground">(Kontext-Anker)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {nucleusItem}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="persona" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-semibold">2. Persona</span>
              <span className="text-xs text-muted-foreground">(Tonalität & Lerntypen)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {personaItem}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sektoren" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="font-semibold">3. Sektor-Anweisungen</span>
              <span className="text-xs text-muted-foreground">(4 Lerntypen)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {sektorItems}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="erstellungspakete" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-semibold">4. Erstellungspakete</span>
              <span className="text-xs text-muted-foreground">
                ({erstellungspaketCount} Element{erstellungspaketCount === 1 ? '' : 'e'})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {erstellungspaketCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Lernpakete oder Ebene-2/3-Aufgaben vorhanden.
              </p>
            ) : (
              <>
                {lernpaketGroups.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Lernpakete (nach Themenfeld)
                    </p>
                    {lernpaketGroups.map((group, idx) => (
                      <div key={group.themenfeld?.id || `orphan-${idx}`} className="space-y-2">
                        <p className="text-xs font-medium text-foreground/70 pl-1">
                          {group.themenfeld
                            ? `Themenfeld: ${group.themenfeld.titel}`
                            : 'Ohne Themenfeld'}
                        </p>
                        <div className="space-y-3 pl-3 border-l-2 border-muted">
                          {group.pakete.map(renderLernpaketItem)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {aufgabenItems.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
                      Allgemeine Aufgaben (Ebene 2/3)
                    </p>
                    {aufgabenItems}
                  </div>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {promptsLoading && (
        <p className="text-xs text-muted-foreground">Prompts werden geladen…</p>
      )}

      <MBKBulkPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        plan={plan}
        summary={planSummary}
        busy={bulkRunning}
        onConfirm={runBulk}
      />
    </div>
  );
}