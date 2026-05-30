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
import PhaseSubtitleBar from '@/components/workspace/preview/PhaseSubtitleBar';

function StudentKITutorBody({ aufgabentext, aufgabenstellung }) {
  // Wir hängen die Aufgabenstellung an die brian.study-URL, damit der Tutor
  // (sofern unterstützt) bereits mit Kontext startet. Endgültige Integration
  // wird mit brian.study abgestimmt – siehe Konzept-Entscheidung 2026-05-30.
  const brianUrl = aufgabenstellung
    ? `https://brian.study/?task=${encodeURIComponent(aufgabenstellung)}`
    : 'https://brian.study/';

  const isEmpty = !aufgabentext && !aufgabenstellung;

  return (
    <div className="h-full flex flex-col px-6 py-5 gap-4">
      {aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-[14px] text-blue-900 leading-relaxed shrink-0">
          {aufgabentext}
        </div>
      )}

      {aufgabenstellung && (
        <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 text-violet-700 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Deine Aufgabe
          </div>
          <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">
            {aufgabenstellung}
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
  // Aufgabenstellung kommt aus dem Master (KI-Tutor speichert sie dort);
  // Aufgabentext (Anweisung) sitzt auf der Activity-Ebene.
  const aufgabentext = activityRecord?.field_values?.aufgabentext || '';
  const aufgabenstellung =
    master?.field_values?.aufgabenstellung ||
    master?.field_values?.aufgabe ||
    master?.field_values?.aufgabe_text ||
    '';

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
                <StudentKITutorBody aufgabentext={aufgabentext} aufgabenstellung={aufgabenstellung} />
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}