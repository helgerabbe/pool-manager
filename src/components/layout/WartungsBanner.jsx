import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { ROLLEN } from '@/lib/rbac';

/**
 * Interner Hook-basierter Banner (mit Hooks sicher)
 */
function WartungsBannerContent() {
  const { realRolle } = useRBAC();
  const { wartungsmodus } = useSystemSettings();

  // Admins sehen keinen Banner (die haben den Toggle in der Settings-Seite)
  if (!wartungsmodus || realRolle === ROLLEN.ADMIN) return null;

  return (
    <div className="bg-orange-500 text-white px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center gap-2.5 text-sm font-medium">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        System wird für Moodle-Export gesperrt — Schreibzugriffe sind vorübergehend deaktiviert.
      </div>
    </div>
  );
}

/**
 * Sichere Wrapper-Komponente ohne Hooks
 */
export default function WartungsBanner() {
  return <WartungsBannerContent />;
}