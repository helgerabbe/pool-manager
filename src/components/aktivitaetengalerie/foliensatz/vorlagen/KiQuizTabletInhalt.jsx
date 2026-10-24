import React from 'react';
import { Send, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const FRAGEN = [
  { id: 'q1', frage: 'Erkläre in eigenen Worten, warum es in Deutschland eine Gewaltenteilung gibt.', gut: 'Du erklärst gut, dass Macht verteilt wird, damit niemand zu viel davon hat.', fehlt: 'Nenne noch die drei Gewalten beim Namen.' },
  { id: 'q2', frage: 'Nenne ein Beispiel, wie sich die drei Gewalten gegenseitig kontrollieren.', gut: 'Dein Beispiel passt: Gerichte können Gesetze überprüfen.', fehlt: 'Erkläre noch kurz, warum diese Kontrolle wichtig ist.' },
];

/** KI-Quiz (Skizze): offene Fragen, je Antwort einmal eine kurze Rückmeldung (Beispieltext statt echter KI). */
export default function KiQuizTabletInhalt() {
  const [antw, setAntw] = React.useState({});
  const [status, setStatus] = React.useState({});
  const senden = (id) => { setStatus((s) => ({ ...s, [id]: 'laedt' })); setTimeout(() => setStatus((s) => ({ ...s, [id]: 'fertig' })), 900); };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border-2 border-[#C9CED8] bg-white p-4">
      {FRAGEN.map((f, i) => {
        const st = status[f.id];
        return (
          <div key={f.id} className="rounded-xl bg-[#F6F7F9] p-3">
            <p className="mb-2 text-lg font-semibold text-[#121721]">{i + 1}. {f.frage}</p>
            <textarea rows={3} disabled={!!st} value={antw[f.id] || ''} onChange={(e) => setAntw((a) => ({ ...a, [f.id]: e.target.value }))} placeholder="Schreibe deine Antwort …" className="w-full resize-none rounded-lg border-2 border-[#DCDFE4] bg-white px-3 py-2 text-base outline-none disabled:opacity-70" />
            {!st && <button type="button" disabled={!(antw[f.id] || '').trim()} onClick={() => senden(f.id)} className="mt-2 flex items-center gap-1 rounded-lg bg-[#2A4074] px-4 py-1.5 font-semibold text-white disabled:opacity-40"><Send className="h-4 w-4" /> Abgeben</button>}
            {st === 'laedt' && <p className="mt-2 flex items-center gap-2 text-sm text-[#6A7181]"><Loader2 className="h-4 w-4 animate-spin" /> Die KI liest deine Antwort …</p>}
            {st === 'fertig' && (
              <div className="mt-2 space-y-1 text-base">
                <p className="flex items-start gap-2 text-emerald-700"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />{f.gut}</p>
                <p className="flex items-start gap-2 text-amber-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{f.fehlt}</p>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={() => { setAntw({}); setStatus({}); }} className="ml-auto flex items-center gap-1 text-sm text-[#6A7181]"><RotateCcw className="h-4 w-4" /> Neu</button>
    </div>
  );
}