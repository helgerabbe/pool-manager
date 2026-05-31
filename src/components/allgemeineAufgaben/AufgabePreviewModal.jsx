/**
 * AufgabePreviewModal.jsx
 *
 * Schüler-Vorschau für eine allgemeine Aufgabe (Ebene 2/3) im iPad-Frame.
 * Zeigt die Aufgabenstellung so, wie der Schüler sie auf dem Tablet sieht –
 * inkl. optionalem Aufgaben-Bild, Zusatzmaterialien, erwartetem Ergebnis und
 * (da es sich um eine KI-Tutor-/Brian-Aufgabe handelt) dem Brian-CTA.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Sparkles, MessageCircle, ExternalLink, Package, Tag, FileType2 } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';

const BRIAN_LOGO_URL = 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/829f1dcc1_image.png';

function AufgabeBody({ aufgabe }) {
  const aufgabenstellung = (aufgabe?.aufgabenstellung || '').trim();
  const bild = aufgabe?.aufgaben_bild_url;
  const materialien = Array.isArray(aufgabe?.materialien) ? aufgabe.materialien : [];
  const brianUrl = aufgabenstellung
    ? `https://brian.study/?task=${encodeURIComponent(aufgabenstellung)}`
    : 'https://brian.study/';

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-4">
      <div className="flex items-center gap-3">
        <img src={BRIAN_LOGO_URL} alt="Brian – KI-Tutor" className="w-11 h-11 object-contain shrink-0" />
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Deine Aufgabe</div>
          <div className="text-base font-bold text-slate-900 leading-tight">{aufgabe?.titel || 'Aufgabe'}</div>
        </div>
      </div>

      {aufgabenstellung ? (
        <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 px-5 py-4">
          <div className="flex items-center gap-2 text-violet-700 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Aufgabenstellung
          </div>
          <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">{aufgabenstellung}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">Für diese Aufgabe ist noch keine Aufgabenstellung hinterlegt.</p>
      )}

      {bild && (
        <img src={bild} alt="Aufgaben-Bild" className="max-h-56 w-full object-contain rounded-lg border border-slate-200 bg-slate-50" />
      )}

      {(aufgabe?.ergebnis_form || aufgabe?.ergebnis_dateiformat) && (
        <div className="flex items-start gap-x-5 gap-y-1 flex-wrap text-[13px] px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
          {aufgabe?.ergebnis_form && (
            <span className="inline-flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">Ergebnisform:</span>
              <span className="font-medium text-slate-800">{aufgabe.ergebnis_form}</span>
            </span>
          )}
          {aufgabe?.ergebnis_dateiformat && (
            <span className="inline-flex items-center gap-1.5">
              <FileType2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">Dateiformat:</span>
              <span className="font-medium text-slate-800">{aufgabe.ergebnis_dateiformat}</span>
            </span>
          )}
        </div>
      )}

      {materialien.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Material
          </p>
          {materialien.map((mat, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 text-[13px]">
              {mat.type === 'image' && mat.url && (
                <img src={mat.url} alt={mat.label || 'Bild'} className="max-h-40 rounded border border-slate-200 object-contain mb-2" />
              )}
              {mat.type === 'pdf' && mat.url && (
                <a href={mat.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 underline">
                  <ExternalLink className="w-3.5 h-3.5" /> {mat.label || 'Dokument öffnen'}
                </a>
              )}
              {mat.type !== 'pdf' && mat.type !== 'image' && (
                <p className="font-medium text-slate-800">{mat.label || mat.content || mat.url}</p>
              )}
              {mat.content && mat.type !== 'pdf' && <p className="text-slate-500 mt-0.5">{mat.content}</p>}
            </div>
          ))}
        </div>
      )}

      {aufgabenstellung && (
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <a href={brianUrl} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-[15px] font-semibold shadow-lg shadow-violet-200 transition-all">
            <MessageCircle className="w-5 h-5" />
            Mit dem KI-Tutor Brian besprechen
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
          <p className="text-[11px] text-slate-400">Öffnet brian.study in einem neuen Tab</p>
        </div>
      )}
    </div>
  );
}

export default function AufgabePreviewModal({ open, onOpenChange, aufgabe }) {
  const titel = aufgabe?.titel || 'Aufgabe';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {titel}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht der Schüler diese Aufgabe auf dem iPad.
          </p>
        </DialogHeader>

        <div className="pt-3">
          <IPadFrame lernpaketTitel={titel} phaseLabel="Aufgabe">
            <div className="bg-white h-full flex flex-col">
              <AufgabeBody aufgabe={aufgabe} />
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}