/**
 * KITutorPreviewModal.jsx
 *
 * Schüler-Vorschau für "KI-Tutor Aufgabe" im iPad-Frame (960×600-Slot).
 *
 * Schüler sehen NUR:
 *  - die Aufgabenstellung der Lehrkraft
 *  - einen klar markierten CTA-Button "Zum KI-Tutor (brian.study)"
 *
 * Der Erwartungshorizont der Lehrkraft fließt später als Kontext an Brian,
 * wird dem Schüler aber NIE angezeigt.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ExternalLink, Sparkles, MessageCircle } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';

// Inline Phasen-Kopfleiste (schlanker Ersatz für PhaseBadge im 960×600-Slot).
const PHASE_BAR = {
  'Input':     { label: 'Input',     subtitle: 'Hier erklären wir dir, was du wissen und können sollst.', bg: 'bg-blue-50',    border: 'border-blue-100',    text: 'text-blue-900' },
  'Übung':     { label: 'Übung',     subtitle: 'Hier übst du, was du gelernt hast.',                       bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-800' },
  'Abschluss': { label: 'Abschluss', subtitle: 'Hier zeigst du, was du kannst.',                           bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800' },
};
function PhaseSubtitleBar({ phase }) {
  const c = PHASE_BAR[phase];
  if (!c) return null;
  return (
    <div className={`px-4 py-1.5 ${c.bg} border-b ${c.border} text-[12px] ${c.text} shrink-0`}>
      <span className="font-semibold">{c.label} ·</span> {c.subtitle}
    </div>
  );
}

// Brian-Logo (vom Nutzer bereitgestellt) – dient gleichzeitig als visuelle
// Bestätigung, dass diese KI-Tutor-Vorschau wirklich geladen wurde.
const BRIAN_LOGO_URL = 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/829f1dcc1_image.png';

function StudentKITutorBody({ aufgabe }) {
  const brianUrl = aufgabe
    ? `https://brian.study/?task=${encodeURIComponent(aufgabe)}`
    : 'https://brian.study/';

  const isEmpty = !aufgabe;

  return (
    <div className="h-full flex flex-col px-6 py-5 gap-4">
      {/* Brian-Header – Logo + Titel, identifiziert die richtige Vorschau */}
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
            <Sparkles className="w-3.5 h-3.5" />
            Deine Aufgabe
          </div>
          <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">
            {aufgabe}
          </p>
        </div>
      )}

      {!isEmpty && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className="text-[13px] text-slate-600 max-w-md">
            Klicke jetzt auf den Button und besprich die Aufgabe gemeinsam mit dem KI-Tutor Brian. Er hilft dir, ohne dir die Lösung zu verraten.
          </div>
          <a
            href={brianUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-[15px] font-semibold shadow-lg shadow-violet-200 hover:shadow-xl transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            Mit dem KI-Tutor Brian besprechen
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
          <p className="text-[11px] text-slate-400">Öffnet brian.study in einem neuen Tab</p>
        </div>
      )}

      {isEmpty && (
        <p className="text-sm text-slate-500 italic text-center py-8">
          Für diese Aufgabe sind noch keine Inhalte hinterlegt.
        </p>
      )}
    </div>
  );
}

export default function KITutorPreviewModal({ open, onOpenChange, activityRecord, master, catalogName, phase }) {
  // KI-Tutor ist standardmäßig NICHT masterfähig – Aufgabe liegt dann
  // direkt auf der Activity. Falls doch ein Master existiert, hat dieser Vorrang.
  // Da das Feld je nach Katalog-Schema unterschiedlich heisst, suchen wir
  // den ersten nicht-leeren String aus field_values, der NICHT zu den
  // KI-internen Feldern (Erwartungshorizont, Tutor-Prompt, Musterlösung)
  // gehört — das ist robust gegen Schema-Umbenennungen.
  const HIDDEN_KEYS = new Set([
    'erwartungshorizont', 'erwartungs_horizont', 'erwartung',
    'tutor_prompt', 'tutorprompt', 'hidden_prompt',
    'musterloesung', 'musterlösung', 'loesung', 'lösung',
    'kompetenz', 'kompetenzen', 'lernziel', 'lernziele',
  ]);
  const pickAufgabe = (fv) => {
    if (!fv || typeof fv !== 'object') return '';
    // Bevorzugte Feldnamen zuerst prüfen
    for (const k of ['aufgabenstellung', 'aufgabentext', 'aufgabe', 'aufgabe_text', 'aufgabenstellung_schueler', 'schueler_aufgabe', 'task', 'frage', 'fragestellung']) {
      const v = fv[k];
      if (typeof v === 'string' && v.trim()) return v;
    }
    // Fallback: erster nicht-leerer String, der nicht in HIDDEN_KEYS liegt
    for (const [k, v] of Object.entries(fv)) {
      if (HIDDEN_KEYS.has(k.toLowerCase())) continue;
      if (typeof v === 'string' && v.trim()) return v;
    }
    return '';
  };
  const aufgabe = pickAufgabe(master?.field_values) || pickAufgabe(activityRecord?.field_values);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName || 'KI-Tutor Aufgabe'}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht der Schüler die Aufgabe auf dem iPad (960 × 600 px Slide). Der Erwartungshorizont bleibt für den Schüler unsichtbar.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName || 'KI-Tutor Aufgabe'} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar phase={phase} />
              <div className="flex-1 min-h-0">
                <StudentKITutorBody aufgabe={aufgabe} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}