/**
 * ImageLabelingPreviewModal.jsx
 *
 * Schüler-Vorschau für "Bildbeschriftung" im iPad-Frame.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import ImageLabelingBody from '@/components/workspace/preview/bodies/ImageLabelingBody';

export default function ImageLabelingPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Bildbeschriftung', phase = 'Aktivität' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1200px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau · {catalogName}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So bearbeiten Schüler die Aufgabe: Begriff anklicken und an der richtigen Stelle im Bild platzieren.
          </p>
        </DialogHeader>
        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <ImageLabelingBody fieldValues={fieldValues} />
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}