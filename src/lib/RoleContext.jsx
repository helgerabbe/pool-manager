import React, { createContext, useContext, useState } from 'react';

/**
 * RoleContext — globaler State für das Rollen-Impersonation-Feature.
 *
 * mockedRole: string | null  — simulierte Rolle (null = echter Account)
 * setMockedRole: (role) => void
 *
 * Nur für Administratoren nutzbar. Der Context selbst prüft das nicht —
 * das obliegt dem RoleSwitcher (UI) und dem useRBAC-Hook (Permissions).
 */
const RoleContext = createContext({ mockedRole: null, setMockedRole: () => {} });

export function RoleProvider({ children }) {
  const [mockedRole, setMockedRole] = useState(null);
  return (
    <RoleContext.Provider value={{ mockedRole, setMockedRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useMockedRole() {
  return useContext(RoleContext);
}