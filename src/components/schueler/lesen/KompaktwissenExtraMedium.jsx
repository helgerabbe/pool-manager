/**
 * KompaktwissenExtraMedium.jsx
 *
 * Zusatz-Angebot im Kompaktwissen: Hat die Lehrkraft neben dem Text auch eine
 * Grafik oder eine PDF hinterlegt, können die Schüler:innen sie hier per Klick
 * zusätzlich aufklappen und ansehen. Rein optional – der Text bleibt der
 * Haupt-Inhalt der Seite.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Image as ImageIcon, FileText } from 'lucide-react';
import { istPdfUrl } from '@/lib/dateiTyp';
import KompaktwissenMedium from './KompaktwissenMedium';

export default function KompaktwissenExtraMedium({ url }) {
  const [offen, setOffen] = useState(false);
  if (!url) return null;

  const istPdf = istPdfUrl(url);
  const Icon = istPdf ? FileText : ImageIcon;
  const label = istPdf ? 'PDF anschauen' : 'Grafik anschauen';

  return (
    <div className="pt-1">
      <Button
        variant="outline"
        className="w-full justify-between gap-2 border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:text-sky-900"
        onClick={() => setOffen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Icon className="w-4 h-4" /> {offen ? (istPdf ? 'PDF ausblenden' : 'Grafik ausblenden') : label}
        </span>
        {offen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {offen && (
        <div className="mt-3">
          <KompaktwissenMedium url={url} />
        </div>
      )}
    </div>
  );
}