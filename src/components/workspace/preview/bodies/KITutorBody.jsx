/**
 * KITutorBody.jsx
 *
 * Schüler-Body für die "KI-Tutor"-Aktivität. Zeigt die Aufgabenstellung
 * und einen CTA-Button, der brian.study öffnet (Erwartungshorizont bleibt
 * für Schüler:innen unsichtbar — der wird später nur als Kontext an Brian
 * übergeben).
 *
 * Liest die Aufgabe robust aus master.field_values bzw. activity.field_values,
 * auch wenn das konkrete Feld unter unterschiedlichen Schlüsseln liegt
 * (aufgabenstellung / aufgabentext / aufgabe / …).
 */
import React from 'react';
import { ExternalLink, Sparkles, MessageCircle } from 'lucide-react';

const BRIAN_LOGO_URL = 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/829f1dcc1_image.png';

const HIDDEN_KEYS = new Set([
  'erwartungshorizont', 'erwartungs_horizont', 'erwartung',
  'tutor_prompt', 'tutorprompt', 'hidden_prompt',
  'musterloesung', 'musterlösung', 'loesung', 'lösung',
  'kompetenz', 'kompetenzen', 'lernziel', 'lernziele',
]);

export function pickKITutorAufgabe(fv) {
  if (!fv || typeof fv !== 'object') return '';
  for (const k of ['aufgabenstellung', 'aufgabentext', 'aufgabe', 'aufgabe_text', 'aufgabenstellung_schueler', 'schueler_aufgabe', 'task', 'frage', 'fragestellung']) {
    const v = fv[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  for (const [k, v] of Object.entries(fv)) {
    if (HIDDEN_KEYS.has(k.toLowerCase())) continue;
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

export default function KITutorBody({ masterFieldValues, activityFieldValues }) {
  const aufgabe = pickKITutorAufgabe(masterFieldValues) || pickKITutorAufgabe(activityFieldValues);
  const brianUrl = aufgabe ? `https://brian.study/?task=${encodeURIComponent(aufgabe)}` : 'https://brian.study/';
  const isEmpty = !aufgabe;

  return (
    <div className="h-full flex flex-col px-6 py-5 gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <img src={BRIAN_LOGO_URL} alt="Brian – KI-Tutor" className="w-12 h-12 object-contain shrink-0" />
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700">KI-Tutor</div>
          <div className="text-base font-bold text-slate-900 leading-tight">Brian hilft dir bei dieser Aufgabe</div>
        </div>
      </div>

      {aufgabe && (
        <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 text-violet-700 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Deine Aufgabe
          </div>
          <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">{aufgabe}</p>
        </div>
      )}

      {!isEmpty ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className="text-[13px] text-slate-600 max-w-md">
            Klicke jetzt auf den Button und besprich die Aufgabe gemeinsam mit dem KI-Tutor Brian. Er hilft dir, ohne dir die Lösung zu verraten.
          </div>
          <a href={brianUrl} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-[15px] font-semibold shadow-lg shadow-violet-200 hover:shadow-xl transition-all">
            <MessageCircle className="w-5 h-5" />
            Mit dem KI-Tutor Brian besprechen
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
          <p className="text-[11px] text-slate-400">Öffnet brian.study in einem neuen Tab</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic text-center py-8">
          Für diese Aufgabe sind noch keine Inhalte hinterlegt.
        </p>
      )}
    </div>
  );
}