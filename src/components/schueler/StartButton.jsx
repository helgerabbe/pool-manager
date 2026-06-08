import { Play } from 'lucide-react';

/**
 * Das dominante Element des Cockpits: der Einstieg in die Poolzeit.
 * Großzügig, einladend, unübersehbar. (Logik folgt später.)
 */
export default function StartButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="group w-full h-full rounded-2xl bg-primary text-primary-foreground px-6 py-5 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-4"
    >
      <span className="flex items-center justify-center w-11 h-11 rounded-full bg-white/15 group-hover:bg-white/25 transition-colors shrink-0">
        <Play className="w-5 h-5 fill-current" />
      </span>
      <span className="text-xl font-bold tracking-tight">Poolzeit beginnen</span>
    </button>
  );
}