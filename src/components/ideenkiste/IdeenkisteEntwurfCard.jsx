import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Pencil, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Eine Aufgaben-Idee in der Ideenkiste: Titel, Beschreibung, Materialien,
 * Status-Badge sowie Bearbeiten/Löschen (mit Zwei-Klick-Bestätigung).
 */
export default function IdeenkisteEntwurfCard({ idee, kannBearbeiten, onEdit, onIntegrieren }) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const istIntegriert = idee.status === 'integriert';

  const handleDelete = async () => {
    try {
      await base44.entities.AufgabenIdee.delete(idee.id);
      toast.success('Aufgaben-Idee gelöscht.');
      queryClient.invalidateQueries({ queryKey: ['aufgaben-ideen', idee.einheit_id] });
    } catch (_err) {
      toast.error('Löschen fehlgeschlagen.');
    }
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium flex-1">{idee.titel}</p>
        {istIntegriert ? (
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Integriert
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-800 border border-amber-200 shrink-0">Offen</Badge>
        )}
      </div>
      {idee.beschreibung && (
        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{idee.beschreibung}</p>
      )}
      {(idee.material_urls || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {idee.material_urls.map((m, idx) => (
            <a key={idx} href={m.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5 hover:bg-primary/10">
              <Paperclip className="w-3 h-3" />
              <span className="max-w-32 truncate">{m.name || 'Datei'}</span>
            </a>
          ))}
        </div>
      )}
      {istIntegriert && idee.integriert_hinweis && (
        <p className="text-[11px] text-emerald-700">{idee.integriert_hinweis}</p>
      )}
      {kannBearbeiten && !istIntegriert && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {confirmDelete ? (
            <>
              <span className="text-[11px] text-destructive font-medium">Wirklich löschen?</span>
              <button onClick={handleDelete} className="text-[11px] font-medium text-destructive hover:underline">Ja</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-muted-foreground hover:underline">Nein</button>
            </>
          ) : (
            <>
              {onIntegrieren && (
                <button
                  onClick={onIntegrieren}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mr-auto"
                  title="KI-Assistent: Idee in die Einheit integrieren"
                >
                  <ArrowRight className="w-3 h-3" />
                  Integrieren
                </button>
              )}
              <button onClick={onEdit} title="Bearbeiten"
                className="p-1 rounded-md border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setConfirmDelete(true)} title="Löschen"
                className="p-1 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}