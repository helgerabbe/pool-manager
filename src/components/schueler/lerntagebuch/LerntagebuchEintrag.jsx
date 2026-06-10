import { Trash2, MessageSquareQuote, Repeat, Sparkles, PenLine } from 'lucide-react';

const TYP_META = {
  reflexion: { label: 'Rückblick', icon: Sparkles, className: 'bg-blue-100 text-blue-700 border-blue-200' },
  nachricht: { label: 'Fürs nächste Mal', icon: MessageSquareQuote, className: 'bg-amber-100 text-amber-700 border-amber-200' },
  zwischennotiz: { label: 'Zwischennotiz', icon: Repeat, className: 'bg-violet-100 text-violet-700 border-violet-200' },
  frei: { label: 'Notiz', icon: PenLine, className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

/** Eine Eintrags-Karte im Lerntagebuch-Logbuch. */
export default function LerntagebuchEintrag({ eintrag, onLoeschen }) {
  const meta = TYP_META[eintrag.typ] || TYP_META.frei;
  const Icon = meta.icon;
  const uhrzeit = new Date(eintrag.created_date).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
            <Icon className="w-3 h-3" />
            {meta.label}
          </span>
          {eintrag.fach_name && (
            <span className="text-[11px] font-medium text-muted-foreground truncate">{eintrag.fach_name}</span>
          )}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground">{uhrzeit} Uhr</span>
          <button
            onClick={() => onLoeschen(eintrag.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground transition-opacity"
            title="Eintrag löschen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{eintrag.text}</p>
    </div>
  );
}