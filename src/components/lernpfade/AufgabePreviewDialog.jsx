/**
 * AufgabePreviewDialog.jsx
 *
 * Schülermodus-Vorschau einer Aufgabe – komplett read-only.
 * Rendert je nach Aufgaben-Inhalt eine sinnvolle Vorschau:
 *  - Wenn ein Bildbeschriftungs-Datensatz erkennbar ist (backgroundImage + dropZones),
 *    wird der ImageLabelingEditor mit readOnly={true} eingebunden.
 *  - Sonst eine Light-Preview mit Aufgabenstellung, Bild, Materialien.
 *
 * WICHTIG: Es werden hier KEINE API-Calls/Saves ausgelöst.
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';
import ImageLabelingEditor from '@/components/workspace/ImageLabelingEditor';
import { getAufgabenTyp } from '@/lib/aufgabenTypen';

function isImageLabelingPayload(aufgabe) {
  // Heuristik: Bildbeschriftung benötigt mindestens ein Hintergrundbild + dropZones-Array.
  return !!(
    aufgabe &&
    typeof aufgabe.backgroundImage === 'string' &&
    aufgabe.backgroundImage.length > 0 &&
    Array.isArray(aufgabe.dropZones)
  );
}

function MaterialList({ materialien = [] }) {
  if (!materialien.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">Material</p>
      <ul className="space-y-1">
        {materialien.map((m, i) => (
          <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
            <span className="text-muted-foreground">•</span>
            <span className="min-w-0">
              {m.label && <span className="font-medium">{m.label}: </span>}
              {m.content || m.url || '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AufgabePreviewDialog({ open, onOpenChange, aufgabe }) {
  if (!aufgabe) return null;
  const typMeta = getAufgabenTyp(aufgabe.aufgaben_typ);

  const showImageLabeling = isImageLabelingPayload(aufgabe);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            Schülermodus-Vorschau
          </DialogTitle>
        </DialogHeader>

        {/* Header-Card */}
        <div className={`rounded-lg border ${typMeta.color.border}/30 ${typMeta.color.bg}/40 p-3 space-y-1.5`}>
          <div className="flex items-center gap-2">
            <Badge className={`${typMeta.color.bgSolid} ${typMeta.color.textOn} border-transparent`}>
              {typMeta.label}
            </Badge>
            {aufgabe.anforderungsebene && (
              <Badge variant="outline" className="text-[10px]">
                {aufgabe.anforderungsebene}
              </Badge>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {aufgabe.titel || 'Ohne Titel'}
          </h3>
        </div>

        {/* Inhalt */}
        <div className="space-y-3">
          {showImageLabeling ? (
            <ImageLabelingEditor
              initialData={aufgabe}
              readOnly
              hideInternalFooter
            />
          ) : (
            <>
              {aufgabe.aufgabenstellung && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Aufgabenstellung</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                    {aufgabe.aufgabenstellung}
                  </p>
                </div>
              )}

              {aufgabe.aufgaben_bild_url && (
                <img
                  src={aufgabe.aufgaben_bild_url}
                  alt="Aufgabenbild"
                  className="max-h-72 w-auto rounded-lg border border-border object-contain"
                />
              )}

              <MaterialList materialien={aufgabe.materialien || []} />

              {!aufgabe.aufgabenstellung && !aufgabe.aufgaben_bild_url && (aufgabe.materialien || []).length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Keine Inhalte zur Vorschau vorhanden.
                </p>
              )}
            </>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">
          Nur-Lese-Vorschau – Änderungen werden nicht gespeichert.
        </p>
      </DialogContent>
    </Dialog>
  );
}