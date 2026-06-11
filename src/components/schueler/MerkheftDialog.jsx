/**
 * MerkheftDialog.jsx
 *
 * Kleines Merkheft / Lerntagebuch pro Einheit: Der Schüler kann sich
 * Notizen hinterlassen (tippen oder aufsprechen) und alle bisherigen
 * Notizen mit Datum ansehen. Wird im Einheit-Dashboard (Burger-Menü)
 * und auf der Fachseite an der Einheit-Kachel geöffnet.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotizen, createNotiz, deleteNotiz } from '@/services/schueler/SchuelerDataService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NotebookPen, Loader2, Trash2, Send } from 'lucide-react';
import SpeechInputButton from '@/components/ui/SpeechInputButton';
import { toast } from 'sonner';

function datumLabel(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MerkheftDialog({ open, onOpenChange, einheitId, einheitTitel, userEmail }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const notizenKey = ['einheitNotizen', userEmail, einheitId];
  const { data: notizen = [], isLoading } = useQuery({
    queryKey: notizenKey,
    queryFn: () =>
      listNotizen({ user_email: userEmail, einheit_id: einheitId }, '-created_date'),
    enabled: open && !!userEmail && !!einheitId,
  });

  const speichern = async () => {
    const clean = text.trim();
    if (!clean) return;
    setSaving(true);
    try {
      await createNotiz({
        user_email: userEmail,
        einheit_id: einheitId,
        text: clean,
      });
      setText('');
      await queryClient.invalidateQueries({ queryKey: notizenKey });
      queryClient.invalidateQueries({ queryKey: ['einheitNotizenAlle'] });
      toast.success('Notiz gespeichert.');
    } finally {
      setSaving(false);
    }
  };

  const loeschen = async (id) => {
    await deleteNotiz(id);
    await queryClient.invalidateQueries({ queryKey: notizenKey });
    queryClient.invalidateQueries({ queryKey: ['einheitNotizenAlle'] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-amber-600" />
            Mein Merkheft
          </DialogTitle>
          {einheitTitel && (
            <p className="text-xs text-muted-foreground">{einheitTitel}</p>
          )}
        </DialogHeader>

        {/* Neue Notiz */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2 shrink-0">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was willst du dir merken? Tippen oder aufsprechen …"
            rows={3}
            className="bg-white"
          />
          <div className="flex items-center justify-between gap-2">
            <SpeechInputButton
              value={text}
              onResult={setText}
              maxSeconds={30}
              label="Aufsprechen"
            />
            <Button size="sm" onClick={speichern} disabled={saving || !text.trim()} className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Speichern
            </Button>
          </div>
        </div>

        {/* Bisherige Notizen */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Notizen werden geladen …</p>
          ) : notizen.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              Noch keine Notizen. Deine erste Notiz wartet auf dich!
            </p>
          ) : (
            notizen.map((n) => (
              <div key={n.id} className="rounded-lg border border-border bg-card px-3 py-2.5 group">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {datumLabel(n.created_date)}
                  </span>
                  <button
                    onClick={() => loeschen(n.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground transition-opacity"
                    title="Notiz löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{n.text}</p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}