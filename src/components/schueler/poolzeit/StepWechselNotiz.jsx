import { useState } from 'react';
import { NotebookPen, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import SpeechInputButton from '@/components/ui/SpeechInputButton';
import { base44 } from '@/api/base44Client';
import PoolzeitStepShell from './PoolzeitStepShell';

/**
 * Kleiner Erinnerungs-Schritt beim Fachwechsel: „Denk an dein Lerntagebuch!"
 * Der Schüler kann jetzt eine kurze Zwischennotiz machen (tippen oder
 * aufsprechen) – oder einfach weiterziehen und alles am Ende notieren.
 */
export default function StepWechselNotiz({ vorherigesFach, naechstesFach, userEmail, onWeiter }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const weiter = async () => {
    const clean = text.trim();
    if (clean && userEmail) {
      setSaving(true);
      try {
        await base44.entities.SchuelerLerntagebuchEintrag.create({
          user_email: userEmail,
          text: clean,
          typ: 'zwischennotiz',
          fach_name: vorherigesFach || null,
        });
      } finally {
        setSaving(false);
      }
    }
    onWeiter();
  };

  return (
    <PoolzeitStepShell
      titel="Kurzer Stopp: dein Lerntagebuch"
      untertitel={
        naechstesFach
          ? `Bevor es mit ${naechstesFach} weitergeht – willst du dir kurz etwas notieren?`
          : 'Willst du dir kurz etwas notieren?'
      }
      onWeiter={weiter}
      weiterLabel={text.trim() ? 'Notieren & weiter' : 'Ohne Notiz weiter'}
      weiterDisabled={saving}
      zeigeZurueck={false}
    >
      <div className="w-full max-w-xl flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-xl bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
          <NotebookPen className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {vorherigesFach ? <>Du hast gerade an <strong>{vorherigesFach}</strong> gearbeitet. </> : null}
            Was war schwierig? Wo willst du weitermachen? Du kannst es jetzt notieren –
            oder am Ende der Poolzeit.
          </span>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Kurze Notiz (freiwillig) …"
          rows={3}
        />
        <div className="flex items-center justify-between">
          <SpeechInputButton value={text} onResult={setText} maxSeconds={30} label="Aufsprechen" />
          {saving && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird gespeichert …
            </span>
          )}
        </div>
      </div>
    </PoolzeitStepShell>
  );
}