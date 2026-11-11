import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskLockBar from '@/components/ui/TaskLockBar';
import { getEinheitById } from '@/services/EinheitenService';
import { getAllLernpakete } from '@/services/LernpaketService';
import { getAllLernziele } from '@/services/LernzielService';
import { updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import useProjektAufgabeSperre from '@/hooks/useProjektAufgabeSperre';
import AbgabeDefinitionSection from './AbgabeDefinitionSection';
import LernlandkartePreview from '@/components/lernlandkarte/LernlandkartePreview';
import AITutorPromptPanel from '@/components/allgemeineAufgaben/AITutorPromptPanel';

/**
 * Die drei Projekt-Reiter (Abgabe & Gütekriterien, Lernlandkarte, KI-Tutor
 * Prompt) für die Übersicht einer Projektaufgabe im Projekt-Lernpaket.
 * Gleiche Bausteine und gleiche Sperre wie im Reiter „Projekte".
 */
export default function ProjektReiter({ aufgabe, themenfelder = [], kannBearbeiten }) {
  const queryClient = useQueryClient();
  const einheitId = aufgabe.einheit_id;
  const lock = useProjektAufgabeSperre(aufgabe);
  const darfAendern = kannBearbeiten && lock.isEditMode;

  const { data: einheit } = useQuery({ queryKey: ['einheiten', einheitId], queryFn: () => getEinheitById(einheitId) });
  const { data: allLernpakete = [] } = useQuery({ queryKey: ['lernpakete'], queryFn: () => getAllLernpakete() });
  const { data: allLernziele = [] } = useQuery({ queryKey: ['lernziele'], queryFn: () => getAllLernziele() });
  const lernpakete = allLernpakete.filter((p) => p.einheit_id === einheitId);
  const lernziele = allLernziele.filter((lz) => lernpakete.some((p) => p.id === lz.lernpaket_id));

  const freigegeben = aufgabe.content_status === 'approved';
  const imExport = aufgabe.sync_status === 'pending';

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      {kannBearbeiten && (
        <TaskLockBar
          isEditMode={lock.isEditMode}
          isLocking={lock.isLocking}
          isLockedByOther={lock.isLockedByOther}
          lockedByEmail={lock.lockedByEmail}
          lockedAt={aufgabe.locked_at}
          editDisabled={imExport || freigegeben}
          lockReason={imExport
            ? 'Diese Aufgabe befindet sich im Export – Änderungen sind nicht möglich.'
            : freigegeben ? 'Diese Aufgabe ist freigegeben – nimm erst die Freigabe zurück, bevor du sie bearbeitest.' : null}
          onEdit={lock.enterEditMode}
          onCancel={lock.exitEditMode}
        />
      )}
      <Tabs defaultValue="abgabe">
        <TabsList className="mx-4 mt-3 bg-muted">
          <TabsTrigger value="abgabe" className="text-xs">Abgabe & Gütekriterien</TabsTrigger>
          <TabsTrigger value="lernlandkarte" className="text-xs">Lernlandkarte</TabsTrigger>
          <TabsTrigger value="ki-prompt" className="text-xs">KI-Tutor Prompt</TabsTrigger>
        </TabsList>
        <TabsContent value="abgabe" className="m-0">
          <AbgabeDefinitionSection aufgabe={aufgabe} kannBearbeiten={darfAendern} />
        </TabsContent>
        <TabsContent value="lernlandkarte" className="m-0 h-[640px] overflow-hidden">
          <LernlandkartePreview
            einheit={einheit}
            lernpakete={lernpakete}
            lernziele={lernziele}
            themenfelder={themenfelder}
            aufgabe={aufgabe}
            kannBearbeiten={darfAendern}
            onPriorityChange={async (neu) => {
              try {
                await updateAllgemeineAufgabe(aufgabe.id, { prioritaete_lernziele: neu });
                queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
              } catch (err) {
                toast.error('Fehler beim Speichern der Priorität: ' + err.message);
              }
            }}
          />
        </TabsContent>
        <TabsContent value="ki-prompt" className="m-0">
          <AITutorPromptPanel
            aufgabe={aufgabe}
            einheit={einheit}
            mappedLernziele={lernziele}
            mappedBasisLernziele={[]}
            lernpakete={lernpakete}
            alleLernziele={allLernziele}
            kannBearbeiten={darfAendern}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}