import React from 'react';
import { STUNDEN_CSS } from '@/lib/stundenDesign';

/** Zeigt ein Vorlagen-Fragment mit dem Grund-Design im passenden Seitenverhältnis. */
export default function VorlagenAnzeige({ html, ansicht }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>${STUNDEN_CSS}</style></head><body>${html}</body></html>`;
  const breite = ansicht === 'lehrer' ? 1280 : 1024;
  const hoehe = ansicht === 'lehrer' ? 720 : 768;
  return (
    <div className="mx-auto w-full overflow-hidden rounded-xl border shadow-sm" style={{ maxWidth: ansicht === 'lehrer' ? 960 : 640, aspectRatio: `${breite} / ${hoehe}` }}>
      <iframe title="Vorlage" srcDoc={doc} sandbox="allow-scripts" className="h-full w-full bg-background" />
    </div>
  );
}