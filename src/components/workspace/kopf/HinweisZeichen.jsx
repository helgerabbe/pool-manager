import React from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Zeichen im Menübaum: Zu diesem Element gibt es offene Hinweise zur Überarbeitung. */
export default function HinweisZeichen({ anzahl, gewaehlt = false }) {
  if (!anzahl) return null;
  return (
    <span title={anzahl === 1 ? '1 offener Hinweis zur Überarbeitung' : `${anzahl} offene Hinweise zur Überarbeitung`} className="shrink-0">
      <MessageSquareWarning className={cn('w-3.5 h-3.5', gewaehlt ? 'text-sky-200' : 'text-sky-600')} />
    </span>
  );
}