import { BookOpen, Dumbbell, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Visueller Abschnitts-Kopf für eine Lernphase in der Lernpaket-Übersicht.
 * Macht die sinnlogischen Bereiche (Erklärung → Übung → Abschluss) klar
 * sichtbar: eigenes Icon, eigene Akzentfarbe und eine kleine Trennlinie.
 */
const PHASE_META = {
  Input: { label: 'Erklärung', icon: BookOpen, color: 'text-sky-600', bg: 'bg-sky-100', line: 'bg-sky-200' },
  'Übung': { label: 'Übung', icon: Dumbbell, color: 'text-amber-600', bg: 'bg-amber-100', line: 'bg-amber-200' },
  Abschluss: { label: 'Abschluss', icon: Flag, color: 'text-violet-600', bg: 'bg-violet-100', line: 'bg-violet-200' },
};

export default function PhasenAbschnitt({ phase, optional = false }) {
  const meta = PHASE_META[phase] || PHASE_META.Input;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3">
      <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', meta.bg, meta.color)}>
        <Icon className="w-4 h-4" />
      </span>
      <span className={cn('text-sm font-bold uppercase tracking-wide shrink-0', meta.color)}>
        {meta.label}
      </span>
      {optional && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
          Freiwillig
        </span>
      )}
      <span className={cn('h-px flex-1 rounded-full', meta.line)} />
    </div>
  );
}