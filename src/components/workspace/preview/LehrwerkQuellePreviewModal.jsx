/**
 * LehrwerkQuellePreviewModal.jsx
 *
 * Schüler-Vorschau für "Lehrwerk / Quelle" im iPad-Frame.
 * Der Frame wird proportional auf die verfügbare Breite skaliert, damit
 * nie horizontal gescrollt werden muss.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import LehrwerkQuelleBody from '@/components/workspace/preview/bodies/LehrwerkQuelleBody';

const FRAME_W = 1216;
const FRAME_H = 740;

export default function LehrwerkQuellePreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Lehrwerk / Quelle', phase = 'Input' }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;
    const calc = () => {
      const w = wrapRef.current?.offsetWidth || FRAME_W;
      setScale(Math.min(1, w / FRAME_W));
    };
    const t = setTimeout(calc, 0);
    window.addEventListener('resize', calc);
    return () => { clearTimeout(t); window.removeEventListener('resize', calc); };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto overflow-x-hidden bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau · {catalogName}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht der Schüler den Verweis auf das Lehrwerk bzw. die Quelle.
          </p>
        </DialogHeader>
        <div ref={wrapRef} className="pt-3 overflow-hidden" style={{ height: FRAME_H * scale + 12 }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: FRAME_W, margin: '0 auto' }}>
            <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
              <LehrwerkQuelleBody fieldValues={fieldValues} />
            </IPadFrame>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}