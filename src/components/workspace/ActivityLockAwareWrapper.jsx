import React, { useEffect, useState } from 'react';
import { useLernpaketLockGlobal } from '@/lib/LernpaketLockContext';
import { Lock } from 'lucide-react';

/**
 * ActivityLockAwareWrapper
 * 
 * Wrapper-Komponente für Aktivitäten, die vom hierarchischen Lock des Parent-Lernpakets erbt.
 * 
 * Props:
 * - lernpaketId: ID des übergeordneten Lernpakets
 * - userEmail: Email des aktuellen Users
 * - canEdit: Globale Berechtigung zum Bearbeiten
 * - children: Komponente, die gerendert werden soll (erhält isEditMode als prop)
 */
export default function ActivityLockAwareWrapper({
  lernpaketId,
  userEmail,
  canEdit,
  children,
}) {
  const globalLock = useLernpaketLockGlobal();

  // Aktivität erbt Lock-Status vom Parent-Lernpaket
  const isParentLocked = globalLock.isLocked(lernpaketId);
  const isLockedByMe = globalLock.isLockedByMe(lernpaketId, userEmail);
  const isLockedByOther = globalLock.isLockedByOther(lernpaketId, userEmail);

  // Editierbar nur wenn:
  // 1. Globale Berechtigung vorhanden
  // 2. Parent-Lernpaket ist durch mich gesperrt
  const isEditMode = canEdit && isLockedByMe;

  if (isLockedByOther) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl border-2 border-amber-300 bg-amber-50 text-sm text-amber-800">
        <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
        <div className="flex-1">
          <p className="font-semibold">Übergeordnetes Lernpaket gesperrt</p>
          <p className="text-xs mt-0.5 text-amber-700">
            Das übergeordnete Lernpaket wird gerade von <strong>{globalLock.lockedByUser}</strong> bearbeitet.
          </p>
          <p className="text-xs mt-2 text-amber-600">
            Diese Aktivität ist im Lesemodus, da das Parent-Paket nicht bearbeitbar ist.
          </p>
        </div>
      </div>
    );
  }

  return children({ isEditMode, isParentLocked });
}