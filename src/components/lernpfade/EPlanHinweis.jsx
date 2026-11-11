import React from 'react';
import { Users } from 'lucide-react';
import PlanErklaerung from '@/components/lernpfade/PlanErklaerung';

/** Hinweis oben im gemeinsamen Plan (plan = 'ehrgeizig' oder 'pragmatiker'). */
export default function EPlanHinweis({ plan = 'ehrgeizig' }) {
  const stil = plan === 'pragmatiker' ? 'border-blue-200 bg-blue-50/70 text-blue-900' : 'border-amber-200 bg-amber-50/70 text-amber-900';
  return (
    <div className={`mb-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${stil}`}>
      <Users className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <PlanErklaerung plan={plan} />
        <p className="mt-1.5">Änderungen hier gelten automatisch für beide Intensitätsstufen.</p>
      </div>
    </div>
  );
}