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
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, FileText, Users, Layers, Package } from 'lucide-react';
import { useSchulStammdaten } from '@/hooks/useSchulStammdaten';
import { useExportPrompts } from '@/hooks/useExportPrompts';
import {
  computeSourceMaxTimestamp,
  isPromptOutOfSync,
  isErstellungspaketBlocked,
  findExistingPrompt,
  LERNTYP_KEYS,
} from '@/lib/exportPromptSync';
import {
  buildNucleusPrompt,
  buildPersonaPrompt,
  buildSektorPrompt,
  buildErstellungspaketForLernpaket,
  buildErstellungspaketForAufgabe,
} from '@/lib/exportPromptTemplates';
import MBKPromptItem from './MBKPromptItem';

const LERNTYP_LABELS = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

export default function MBKPromptGeneratorPanel({ einheitId }) {
  const [editingMode, setEditingMode] = useState(false);

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

  // ── Helper: Prompt-Lookup + Sync-Check ──────────────────────────────────
  const lookupPrompt = (promptType, referenceId = null) =>
    findExistingPrompt(prompts, { einheitId, promptType, referenceId });

  const computeMaxTs = (promptType, referenceId = null) =>
    computeSourceMaxTimestamp({
      promptType,
      referenceId,
      einheit,
      themenfelder,
      lernpakete,
      lernziele,
      aufgabenbausteine,
      allgemeineAufgaben,
    });

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
  const lernpaketItems = lernpakete.map((lp) => {
    const existing = lookupPrompt('erstellungspaket', lp.id);
    const maxTs = computeMaxTs('erstellungspaket', lp.id);
    const blockReason = isErstellungspaketBlocked({
      referenceId: lp.id,
      lernpakete,
      allgemeineAufgaben,
    });
    const zieleDesPakets = lernziele.filter((z) => z.lernpaket_id === lp.id);
    const aufgabenDesPakets = aufgabenbausteine.filter((a) => a.lernpaket_id === lp.id);
    return (
      <MBKPromptItem
        key={`lp-${lp.id}`}
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
            aufgaben: aufgabenDesPakets,
          })
        }
        sourceMaxTimestamp={maxTs}
        onUpsert={upsert}
      />
    );
  });

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

  const erstellungspaketCount = lernpaketItems.length + aufgabenItems.length;

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

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card shrink-0">
          <Switch
            id="mbk-edit-toggle"
            checked={editingMode}
            onCheckedChange={setEditingMode}
          />
          <Label htmlFor="mbk-edit-toggle" className="text-xs cursor-pointer">
            Bearbeitungsmodus
          </Label>
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
                {lernpaketItems.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Lernpakete
                    </p>
                    {lernpaketItems}
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
    </div>
  );
}