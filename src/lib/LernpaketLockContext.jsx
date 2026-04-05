import React, { createContext, useState, useCallback } from 'react';

/**
 * LernpaketLockContext
 * 
 * Globaler State für hierarchisches Locking: Lernpaket als Single Source of Truth.
 * Aktivitäten erben ihren Lock vom übergeordneten Lernpaket.
 * 
 * State:
 * - currentLockedLernpaketId: ID des gerade gesperrten Lernpakets (null = keine Sperre)
 * - lockedByUser: Email des Users, der das Paket gerade bearbeitet
 */
export const LernpaketLockContext = createContext(null);

export function LernpaketLockProvider({ children }) {
  const [currentLockedLernpaketId, setCurrentLockedLernpaketId] = useState(null);
  const [lockedByUser, setLockedByUser] = useState(null);

  const setLocked = useCallback((paketId, userEmail) => {
    setCurrentLockedLernpaketId(paketId);
    setLockedByUser(userEmail);
  }, []);

  const clearLock = useCallback(() => {
    setCurrentLockedLernpaketId(null);
    setLockedByUser(null);
  }, []);

  const value = {
    currentLockedLernpaketId,
    lockedByUser,
    setLocked,
    clearLock,
    isLocked: (paketId) => currentLockedLernpaketId === paketId,
    isLockedByMe: (paketId, userEmail) => currentLockedLernpaketId === paketId && lockedByUser === userEmail,
    isLockedByOther: (paketId, userEmail) => currentLockedLernpaketId === paketId && lockedByUser !== userEmail,
  };

  return (
    <LernpaketLockContext.Provider value={value}>
      {children}
    </LernpaketLockContext.Provider>
  );
}

export function useLernpaketLockGlobal() {
  const context = React.useContext(LernpaketLockContext);
  if (!context) {
    throw new Error('useLernpaketLockGlobal must be used within LernpaketLockProvider');
  }
  return context;
}