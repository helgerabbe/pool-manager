import React from 'react';
import PhaseActivitiesSidebar from '@/components/workspace/PhaseActivitiesSidebar';

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
  sidebarOpen,
  setSidebarOpen,
}) {
  return (
    <PhaseActivitiesSidebar
      paket={paket}
      phase={phaseKey}
      phaseLabel={phaseLabel}
      kannBearbeiten={kannBearbeiten}
      userEmail={userEmail}
      inEditMode={inEditMode}
      onSelectActivity={(data) =>
        onNavigate({
          type: 'aktivitaet-edit',
          id: data.activityId,
          phase: data.phaseKey,
          paketId: data.paketId,
          activityRecordId: data.activityId,
        })
      }
      onGoToTaskWorkshop={onGoToTaskWorkshop}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    />
  );
}