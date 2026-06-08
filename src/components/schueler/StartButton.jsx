import { Play } from 'lucide-react';

/**
 * Das dominante Element des Cockpits: der Einstieg in die Poolzeit.
 * Großzügig, einladend, unübersehbar. (Logik folgt später.)
 */
export default function StartButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group w-full rounded-2xl bg-primary text-primary-foreground px-8 py-7 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-4"
    >
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/15 group-hover:bg-white/25 transition-colors">
        <Play className="w-6 h-6 fill-current" />
      </span>
      <span className="text-2xl font-bold tracking-tight">Poolzeit beginnen</span>
    </button>
  );
}