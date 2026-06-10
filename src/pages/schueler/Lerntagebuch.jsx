import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import { ArrowLeft, NotebookPen, Loader2, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import SpeechInputButton from '@/components/ui/SpeechInputButton';
import LerntagebuchEintrag from '@/components/schueler/lerntagebuch/LerntagebuchEintrag';
import { toast } from 'sonner';

/**
 * Das Lerntagebuch: fachübergreifendes Logbuch des Schülers.
 * Zeigt alle Einträge (Reflexionen, Nachrichten ans nächste Mal,
 * Zwischennotizen, freie Einträge) chronologisch – neueste zuerst,
 * gruppiert nach Tag. Neue freie Einträge per Tippen oder Spracheingabe.
 */
export default function Lerntagebuch() {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['authUser'],
    queryFn: () => getCurrentUser(),
    staleTime: 30 * 1000,
  });

  const eintraegeKey = ['lerntagebuch', user?.email];
  const { data: eintraege = [], isLoading } = useQuery({
    queryKey: eintraegeKey,
    queryFn: () =>
      base44.entities.SchuelerLerntagebuchEintrag.filter(
        { user_email: user.email },
        '-created_date',
        200
      ),
    enabled: !!user?.email,
  });

  const speichern = async () => {
    const clean = text.trim();
    if (!clean) return;
    setSaving(true);
    try {
      await base44.entities.SchuelerLerntagebuchEintrag.create({
        user_email: user.email,
        text: clean,
        typ: 'frei',
      });
      setText('');
      await queryClient.invalidateQueries({ queryKey: eintraegeKey });
      toast.success('Eintrag gespeichert.');
    } finally {
      setSaving(false);
    }
  };

  const loeschen = async (id) => {
    await base44.entities.SchuelerLerntagebuchEintrag.delete(id);
    await queryClient.invalidateQueries({ queryKey: eintraegeKey });
  };

  // Nach Tag gruppieren (neueste zuerst)
  const gruppen = [];
  for (const e of eintraege) {
    const tag = new Date(e.created_date).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.tag === tag) letzte.eintraege.push(e);
    else gruppen.push({ tag, eintraege: [e] });
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <Link
          to="/lernen"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 text-accent">
            <NotebookPen className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Mein Lerntagebuch</h1>
            <p className="text-sm text-muted-foreground">
              Dein Logbuch: Reflexionen, Notizen fürs nächste Mal und alles, was du dir merken willst.
            </p>
          </div>
        </div>

        {/* Neuer freier Eintrag */}
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-2 mb-8">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was willst du festhalten? Tippen oder aufsprechen …"
            rows={3}
            className="bg-card"
          />
          <div className="flex items-center justify-between gap-2">
            <SpeechInputButton value={text} onResult={setText} maxSeconds={60} label="Aufsprechen" />
            <Button size="sm" onClick={speichern} disabled={saving || !text.trim()} className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Eintragen
            </Button>
          </div>
        </div>

        {/* Logbuch */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Dein Tagebuch wird geladen …</p>
        ) : gruppen.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Noch keine Einträge. Am Ende jeder Poolzeit schreibst du hier auf, wo du
              weitermachen willst – dein erster Eintrag kommt also bald!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {gruppen.map((g) => (
              <div key={g.tag}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 sticky top-0 bg-background py-1">
                  {g.tag}
                </h2>
                <div className="space-y-2">
                  {g.eintraege.map((e) => (
                    <LerntagebuchEintrag key={e.id} eintrag={e} onLoeschen={loeschen} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}