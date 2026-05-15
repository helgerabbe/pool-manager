import React, { useState, useRef, useCallback, useEffect, use } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getLernzielStatus, getLernpaketStatus, getEinheitFortschritt } from '@/lib/statusLogic';
import { cn } from '@/lib/utils';
import { useLernpaketLock, useEinheitLock } from '@/hooks/useLocks';
import EinheitLockBanner from '@/components/workspace/EinheitLockBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LernpaketForm from '@/components/lernpakete/LernpaketForm';
import LernzielForm from '@/components/lernziele/LernzielForm';
import AufgabenbausteinForm from '@/components/aufgaben/AufgabenbausteintForm';
import EinheitForm from '@/components/einheiten/EinheitForm';
import Ebene2MappingView from '@/components/aufgaben/Ebene2MappingView';
import ActivityContentForm from '@/components/workspace/ActivityContentForm';
import PhaseActivitiesSidebar from '@/components/workspace/PhaseActivitiesSidebar';
import {
  BookOpen, Layers, Target, Puzzle, Plus, Trash2
} from 'lucide-react';
import SyncWarningBanner from '@/components/sync/SyncWarningBanner';

import {
  StatusBadge,
  AmpelBanner,
  StepEmptyState,
} from './panels/SharedUI';
import EinheitPanel from './panels/EinheitPanel';
import LernzielPanel from './panels/LernzielPanel';
import LernpaketPanel from './panels/LernpaketPanel';

// ── Imports für externe Sub-Panels ────────────────────────────────────────────

import PhaseContent from './panels/PhaseContent';
import AktivitaetEditPanel from './panels/AktivitaetEditPanel';
import ThemenfeldPanel from './panels/ThemenfeldPanel';

// ── Haupt-Export ──────────────────────────────────────────────────────────────

export default function WorkspaceDetailPanel({
  selectedNode, einheit, lernpakete, lernziele, aufgaben,
  userEmail, kannBearbeiten, istAdmin,
  onNavigate, onDeleteLernpaket, onDeleteLernziel,
}) {
  // Makro-Lock prüfen
  const { isUnitLocked, lockedByEmail } = useEinheitLock(einheit?.id);

  // Prüfen ob eine Ebene-2-Aufgabe ausgewählt ist
  const selectedAufgabe = selectedNode?.type === 'aufgabe'
    ? aufgaben.find(a => a.id === selectedNode.id)
    : null;
  const isEbene2Aufgabe = selectedAufgabe?.baustein_typ === 'Ebene-2-Aufgabe';

  const [lernpaketFormOpen, setLernpaketFormOpen] = useState(false);
  const [lernzielFormOpen,  setLernzielFormOpen]  = useState(false);
  const [lernzielPaketId, setLernzielPaketId] = useState(null);
  const [aufgabeFormOpen,   setAufgabeFormOpen]   = useState(false);
  const [editEinheitOpen,   setEditEinheitOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (selectedNode?.type === 'new-lernpaket') setLernpaketFormOpen(true);
    if (selectedNode?.type === 'new-lernziel')  setLernzielFormOpen(true);
    if (selectedNode?.type === 'new-aufgabe')   setAufgabeFormOpen(true);
  }, [selectedNode]);

  const createLernpaket = useMutation({
    mutationFn: (data) => {
      if (!data.titel_des_pakets?.trim() || !data.einheit_id?.trim()) {
        throw new Error('Titel und Einheit sind erforderlich');
      }
      return base44.entities.Lernpakete.create({ ...data, einheit_id: einheit?.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lernpakete'] }),
    onError: (error) => {
      console.error('Fehler beim Erstellen des Pakets:', error);
      toast.error(`Fehler: ${error.message}`);
    },
  });
  
  const createLernziel = useMutation({
    mutationFn: (data) => {
      const paketId = lernzielPaketId || selectedNode?.paketId || selectedNode?.data?.lernpaket_id;
      if (!data.formulierung_fachsprache?.trim()) {
        throw new Error('Formulierung ist erforderlich');
      }
      if (!paketId) {
        throw new Error('Lernpaket-ID fehlt');
      }
      return base44.entities.Lernziele.create({
        ...data,
        lernpaket_id: paketId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      setLernzielFormOpen(false);
      setLernzielPaketId(null);
      toast.success('Lernziel erstellt.');
    },
    onError: (error) => {
      console.error('Fehler beim Erstellen des Lernziels:', error);
      toast.error(`Fehler: ${error.message}`);
    },
  });
  
  const createAufgabe = useMutation({
    mutationFn: (data) => {
      if (!data.baustein_typ?.trim()) {
        throw new Error('Baustein-Typ ist erforderlich');
      }
      const clean = { ...data, lernpaket_id: selectedNode?.paketId, lernziel_id: selectedNode?.lernzielId };
      if (clean.lernziel_id === 'none') delete clean.lernziel_id;
      return base44.entities.Aufgabenbausteine.create(clean);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aufgaben'] }),
    onError: (error) => {
      console.error('Fehler beim Erstellen der Aufgabe:', error);
      toast.error(`Fehler: ${error.message}`);
    },
  });
  const updateEinheit = useMutation({
    mutationFn: (data) => base44.entities.Einheiten.update(einheit?.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['einheiten'] }),
    onError: () => toast.error('Fehler beim Speichern der Einheit.'),
  });

  // Subscribe zu Lernpaket-Änderungen um Lock-Status realtime zu aktualisieren
  useEffect(() => {
    if (!selectedNode || selectedNode.type !== 'lernpaket' || !selectedNode?.id) return;
    const paket = lernpakete.find(p => p.id === selectedNode.id);
    if (!paket?.id) return;
    
    const unsub = base44.entities.Lernpakete.subscribe((event) => {
      if (event.id === paket.id) {
        queryClient.invalidateQueries({ queryKey: ['lernpakete', paket.id] });
        queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      }
    });
    return unsub;
  }, [selectedNode, lernpakete, queryClient]);

  if (!selectedNode) {
    return (
      <div className="space-y-4">
        <EinheitLockBanner isUnitLocked={isUnitLocked} lockedByEmail={lockedByEmail} />
        <StepEmptyState
          icon={BookOpen}
          title="Lernpaket auswählen"
          description="Wähle links ein Lernpaket aus, um Aktivitäten zuzuordnen und Lernziele zu verwalten."
          status="yellow"
        />
      </div>
    );
  }

  const type = selectedNode.type;

  if (type === 'einheit') {
    return null;
  }

  if (type === 'lernpaket') {
    const paket = lernpakete.find(p => p.id === selectedNode.id);
    if (!paket) return null;
    // Blockiere Bearbeitungsmodus wenn Einheit gesperrt ist
    const effectiveKannBearbeiten = kannBearbeiten && !isUnitLocked;
    return (
      <>
        <EinheitLockBanner isUnitLocked={isUnitLocked} lockedByEmail={lockedByEmail} />
        <LernpaketPanel
          paket={paket}
          lernziele={lernziele}
          aufgaben={aufgaben}
          kannBearbeiten={effectiveKannBearbeiten}
          userEmail={userEmail}
          istAdmin={istAdmin}
          onNavigate={onNavigate}
          onNewLernziel={() => {
            setLernzielPaketId(paket.id);
            setLernzielFormOpen(true);
          }}
          onDelete={() => onDeleteLernpaket(paket.id)}
        />
        <LernzielForm
          open={lernzielFormOpen}
          onOpenChange={(open) => {
            setLernzielFormOpen(open);
            if (!open) setLernzielPaketId(null);
          }}
          onSubmit={(data) => createLernziel.mutate(data)}
        />
      </>
    );
  }

  if (type === 'lernziel') {
    return null; // Lernziele werden jetzt nur noch im LernpaketPanel bearbeitet
  }

  if (type === 'themenfeld') {
    const themenfeld = selectedNode.themenfelder?.find(tf => tf.id === selectedNode.themenfeldId);
    if (!themenfeld) return null;
    return (
      <ThemenfeldPanel
        themenfeld={themenfeld}
        lernpakete={lernpakete}
        kannBearbeiten={kannBearbeiten}
        queryClient={queryClient}
      />
    );
  }

  if (type === 'aktivitaet-edit') {
    const paket = lernpakete.find(p => p.id === selectedNode.paketId);
    if (!paket) return null;
    const phaseKeyMap = { input: 'Input', uebung: 'Übung', abschluss: 'Abschluss' };
    const phaseKey = phaseKeyMap[selectedNode.phase] || selectedNode.phase;
    const phaseLabelMap = { 'Input': 'Input (Erarbeitung)', 'Übung': 'Übung', 'Abschluss': 'Abschluss' };
    const phaseLabel = phaseLabelMap[phaseKey] || phaseKey;
    return (
      <AktivitaetEditPanel
        paket={paket}
        phaseKey={phaseKey}
        phaseLabel={phaseLabel}
        kannBearbeiten={kannBearbeiten}
        queryClient={queryClient}
        activityRecordId={selectedNode.id}
      />
    );
  }

  if (type === 'phase') {
    const paket = lernpakete.find(p => p.id === selectedNode.paketId);
    if (!paket) return null;
    
    const phaseKeyMap = { input: 'Input', uebung: 'Übung', abschluss: 'Abschluss' };
    const phaseKey = phaseKeyMap[selectedNode.phase] || selectedNode.phase;
    const phaseLabelMap = { 'Input': 'Input (Erarbeitung)', 'Übung': 'Übung', 'Abschluss': 'Abschluss' };
    const phaseLabel = phaseLabelMap[phaseKey] || phaseKey;
    
    return (
      <>
        <div>
          <h2 className="text-lg font-bold mb-4">{phaseLabel}</h2>
          <PhaseContent
            paket={paket}
            phaseKey={phaseKey}
            phaseLabel={phaseLabel}
            kannBearbeiten={kannBearbeiten}
            userEmail={userEmail}
            queryClient={queryClient}
            inEditMode={false}
            onNavigate={onNavigate}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </div>
      </>
    );
  }

  if (type === 'new-lernpaket') {
    return (
      <>
        <StepEmptyState icon={Layers} title="Neues Lernpaket" description="Das Formular öffnet sich automatisch." status="yellow" />
        <LernpaketForm
          open={lernpaketFormOpen}
          onOpenChange={setLernpaketFormOpen}
          onSubmit={(data) => createLernpaket.mutate(data)}
          nextOrder={lernpakete.length + 1}
        />
      </>
    );
  }

  if (type === 'new-lernziel') {
    return (
      <>
        <StepEmptyState icon={Target} title="Neues Lernziel" description="Das Formular öffnet sich automatisch." status="yellow" />
        <LernzielForm
          open={lernzielFormOpen}
          onOpenChange={setLernzielFormOpen}
          onSubmit={(data) => createLernziel.mutate(data)}
        />
      </>
    );
  }

  if (type === 'aufgabe' && isEbene2Aufgabe) {
    const lernpaketIdFuerAufgabe = selectedAufgabe.lernpaket_id;
    return (
      <Ebene2MappingView
        aufgabe={selectedAufgabe}
        lernpaketId={lernpaketIdFuerAufgabe}
        einheitId={einheit?.id}
        kannBearbeiten={kannBearbeiten}
      />
    );
  }

  if (type === 'new-aufgabe') {
    const lernzielFuerNeu = lernziele.find(lz => lz.id === selectedNode.lernzielId);
    return (
      <>
        <StepEmptyState icon={Puzzle} title="Neuer Aufgabenbaustein" description="Das Formular öffnet sich automatisch." status="yellow" />
        <AufgabenbausteinForm
          open={aufgabeFormOpen}
          onOpenChange={setAufgabeFormOpen}
          onSubmit={(data) => createAufgabe.mutate(data)}
          lernziele={lernzielFuerNeu ? [lernzielFuerNeu] : []}
        />
      </>
    );
  }

  return null;
}