import React from 'react';
import PhaseActivitiesDnD from '@/components/workspace/PhaseActivitiesDnD';

export default function PhaseContent({
  paket,
  phaseKey,
  phaseLabel,
  kannBearbeiten,
  userEmail,
  queryClient,
  onNavigate,
  onGoToTaskWorkshop,
  inEditMode,
}) {
  return (
    <PhaseActivitiesDnD
      paket={paket}
      phase={phaseKey}
      phaseLabel={phaseLabel}
      kannBearbeiten={kannBearbeiten}
      inEditMode={inEditMode}
      onGoToTaskWorkshop={onGoToTaskWorkshop}
    />
  );
}