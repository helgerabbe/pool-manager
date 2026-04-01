import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * NavigationTooltip
 * Zeigt ein sofortiges (delay-freies) Tooltip-Label unter dem gewrappten Element.
 * Mit useState sicher (nur Hook-Logik, keine Provider-Abhängigkeiten).
 */
export default function NavigationTooltip({ label, children, position = 'bottom' }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {/* Tooltip */}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-[100] whitespace-nowrap',
            'bg-slate-800 text-white text-xs font-medium px-2 py-1 rounded shadow-lg',
            position === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' : 'bottom-full mb-2 left-1/2 -translate-x-1/2'
          )}
        >
          {label}
          {/* Kleines Dreieck */}
          <span
            className={cn(
              'absolute left-1/2 -translate-x-1/2 border-4 border-transparent',
              position === 'bottom'
                ? 'bottom-full border-b-slate-800'
                : 'top-full border-t-slate-800'
            )}
          />
        </div>
      )}
    </div>
  );
}