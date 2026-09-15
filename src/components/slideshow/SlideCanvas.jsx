/**
 * SlideCanvas.jsx
 *
 * Rendert EINE Folie in Originalgröße (960×540) — im Editor bearbeitbar,
 * sonst als reine Anzeige. Elemente, die (noch) nicht eingeblendet sind,
 * werden sanft per Opacity eingeblendet (keine Animation darüber hinaus).
 */
import React from 'react';
import { SLIDE_W, SLIDE_H, slotsInReihenfolge, slotHatInhalt, textFarbeFuer } from '@/lib/slideshowVorlagen';
import SlideTextSlot from '@/components/slideshow/SlideTextSlot';
import SlideBildSlot from '@/components/slideshow/SlideBildSlot';

export default function SlideCanvas({
  folie,
  modus = 'view',
  sichtbareSlots = null,
  aktiverSlotKey = null,
  onSlotFokus,
  onElementChange,
  // Grafik-Assistent: rein optisches Design-Profil (lib/grafikVariante).
  // Inhalte, Vorlage und Einblendlogik bleiben davon unberührt.
  design = null,
}) {
  const slots = slotsInReihenfolge(folie);
  const textFarbe = design?.text_farbe || textFarbeFuer(folie?.hintergrund);
  const bearbeitbar = modus === 'edit';
  const bildUrl = design?.bilder?.[folie?.id] || '';
  const hintergrund = design
    ? (bildUrl
      ? `url(${bildUrl}) center / cover no-repeat`
      : (design.hintergrund || folie?.hintergrund || '#ffffff'))
    : (folie?.hintergrund || '#ffffff');
  const panel = design?.panel || null;

  return (
    <div
      style={{
        width: SLIDE_W, height: SLIDE_H, position: 'relative',
        background: hintergrund, color: textFarbe,
        fontFamily: design?.schrift || undefined,
      }}
    >
      {design?.akzent_farbe && (
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: SLIDE_W, height: 8,
            background: design.akzent_farbe,
          }}
        />
      )}
      {slots.map((slot) => {
        if (!bearbeitbar && !slotHatInhalt(folie, slot)) return null;
        const sichtbar = !sichtbareSlots || sichtbareSlots.has(slot.key);
        const element = folie?.elemente?.[slot.key] || {};
        // Textfelder wachsen mit dem Inhalt (Vorlagen-Höhe = Mindesthöhe),
        // sofern die Lehrkraft keine eigene Höhe gezogen hat.
        const box = slot.art === 'bild'
          ? slot.box
          : {
              left: slot.box.left, top: slot.box.top, width: slot.box.width,
              height: element.hoehe || 'auto',
              minHeight: element.hoehe ? undefined : slot.box.height,
            };
        return (
          <div
            key={slot.key}
            style={{
              position: 'absolute', ...box,
              ...(panel && slot.art !== 'bild' ? {
                background: panel.fuellung || undefined,
                borderRadius: panel.radius ?? undefined,
                boxShadow: panel.schatten || undefined,
                padding: panel.polsterung ?? undefined,
              } : {}),
              ...(design && slot.key === 'ueberschrift' && design.ueberschrift_farbe
                ? { color: design.ueberschrift_farbe }
                : {}),
              opacity: sichtbar ? 1 : 0,
              transition: 'opacity 600ms ease',
              pointerEvents: sichtbar ? 'auto' : 'none',
            }}
          >
            {slot.art === 'bild' ? (
              <SlideBildSlot
                slot={slot}
                url={element.url || ''}
                modus={modus}
                onChange={(url) => onElementChange?.(slot.key, { url })}
              />
            ) : (
              <SlideTextSlot
                slot={slot}
                html={element.html || ''}
                modus={modus}
                textFarbe={textFarbe}
                aktiv={aktiverSlotKey === slot.key}
                onFokus={(el) => onSlotFokus?.(slot.key, el)}
                onChange={(html) => onElementChange?.(slot.key, { html })}
                onHoeheChange={(hoehe) => onElementChange?.(slot.key, { hoehe: hoehe || undefined })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}