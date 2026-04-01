/**
 * ReplicatorIntegration.jsx
 *
 * Phase 6.7: Integrations-Hook für Master → Replikator Workflow
 * 
 * Verwaltet Modals, API-Aufrufe und User-Interaktionen
 */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { secureApi } from '@/api/secureApi';
import MasterTaskModal from './MasterTaskModal';
import ReplicaReviewModal from './ReplicaReviewModal';
import { Button } from '@/components/ui/button';
import { Wand2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export function useMasterReplicator({
  lernpaketId,
  lernzielId,
  contextData = {},
}) {
  const [masterModalOpen, setMasterModalOpen] = useState(false);
  const [replicaModalOpen, setReplicaModalOpen] = useState(false);
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [generatedReplicas, setGeneratedReplicas] = useState([]);
  const [replicaError, setReplicaError] = useState(null);

  // Mutation: Replicas generieren
  const generateMutation = useMutation({
    mutationFn: async (masterId) => {
      const result = await secureApi.generateReplicas(masterId, 10);
      return result;
    },
    onSuccess: (data) => {
      setGeneratedReplicas(data.replicas);
      setReplicaError(null);
      toast.success(`${data.replicas.length} Replikate generiert`);
    },
    onError: (error) => {
      setReplicaError(error.message);
      toast.error(`Generierung fehlgeschlagen: ${error.message}`);
    },
  });

  // Handler: Starte Replikation
  const startReplication = (masterId) => {
    setSelectedMasterId(masterId);
    setReplicaModalOpen(true);
    generateMutation.mutate(masterId);
  };

  return {
    masterModalOpen,
    setMasterModalOpen,
    replicaModalOpen,
    setReplicaModalOpen,
    selectedMasterId,
    generatedReplicas,
    replicaError,
    startReplication,
    isGenerating: generateMutation.isPending,
    lernpaketId,
    lernzielId,
    contextData,
  };
}

/**
 * Buttons für Master/Replikator Workflow
 */
export function MasterCreateButton({ onClick }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      <Plus className="w-4 h-4" />
      Masteraufgabe erstellen
    </Button>
  );
}

export function ReplicatorButton({ onClick, disabled }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="gap-2"
    >
      <Wand2 className="w-4 h-4" />
      ✨ Replikate erstellen
    </Button>
  );
}

/**
 * Vollständige Workflow-Komponente (All-in-One)
 */
export function MasterReplicatorWorkflow({
  masterAufgabe,
  lernpaketId,
  lernzielId,
  activityType = 'free_text',
  contextData = {},
  onMasterCreated,
  onReplicaSaved,
}) {
  const {
    masterModalOpen,
    setMasterModalOpen,
    replicaModalOpen,
    setReplicaModalOpen,
    selectedMasterId,
    generatedReplicas,
    replicaError,
    startReplication,
    isGenerating,
  } = useMasterReplicator({
    lernpaketId,
    lernzielId,
    contextData,
  });

  const showMasterButton = !masterAufgabe;
  const showReplicatorButton = masterAufgabe?.is_master;

  return (
    <>
      {showMasterButton && (
        <MasterCreateButton onClick={() => setMasterModalOpen(true)} />
      )}

      {showReplicatorButton && (
        <ReplicatorButton
          onClick={() => startReplication(masterAufgabe.id)}
          disabled={isGenerating}
        />
      )}

      {/* Master-Erstellungs-Modal */}
      <MasterTaskModal
        open={masterModalOpen}
        onOpenChange={setMasterModalOpen}
        lernpaketId={lernpaketId}
        lernzielId={lernzielId}
        activityType={activityType}
        contextData={contextData}
        onSuccess={onMasterCreated}
      />

      {/* Replikate Review Modal */}
      <ReplicaReviewModal
        open={replicaModalOpen}
        onOpenChange={setReplicaModalOpen}
        isLoading={isGenerating}
        replicas={generatedReplicas}
        masterId={selectedMasterId}
        lernpaketId={lernpaketId}
        lernzielId={lernzielId}
        error={replicaError}
        onSaveSuccess={onReplicaSaved}
      />
    </>
  );
}