import React from 'react';
import { cn } from '@/lib/utils';
import { FileQuestion } from 'lucide-react';
import { ANTWORT_FORMATE, loesungsText, istFrageVollstaendig, MATERIAL_TYPEN } from '@/lib/materialaufgabe';

/** Lehrkraft-Ansicht (read-only) einer Materialaufgabe. */
export default function MaterialaufgabeReadOnly({ fieldValues = {} }) {
  const material = fieldValues.material || {};
  const fragen = Array.isArray(fieldValues.material_fragen) ? fieldValues.material_fragen : [];
  const frageOptional = fieldValues.fragen_im_material === true;
  const typLabel = MATERIAL_TYPEN.find((t) => t.value === (material.material_typ || 'text'))?.label || 'Material';

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {fieldValues.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900">
          <p className="whitespace-pre-wrap leading-relaxed">{fieldValues.aufgabentext}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Material · {typLabel}</p>
        {material.beschreibung && <p className="text-sm font-medium">{material.beschreibung}</p>}
        {material.material_typ === 'text' && material.inhalt && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{material.inhalt}</p>
        )}
        {material.material_typ === 'bild' && material.datei_url && (
          <img src={material.datei_url} alt="Material" className="max-h-56 w-auto object-contain rounded-lg border border-border" />
        )}
        {material.material_typ === 'audio' && (material.datei_url || material.url) && (
          <audio src={material.datei_url || material.url} controls className="w-full" />
        )}
        {(material.url || material.datei_url) && material.material_typ !== 'bild' && material.material_typ !== 'audio' && (
          <a href={material.url || material.datei_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs break-all">
            {material.url || material.datei_url}
          </a>
        )}
        {!material.inhalt && !material.url && !material.datei_url && (
          <p className="text-sm text-muted-foreground italic">Noch kein Material hinterlegt.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <FileQuestion className="w-3.5 h-3.5" /> {frageOptional ? 'Aufgaben (Aufgabenstellung im Material)' : 'Fragen'} ({fragen.length})
        </p>
        {fragen.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Noch keine Fragen hinterlegt.</p>
        ) : (
          <div className="space-y-2">
            {fragen.map((f, i) => (
              <div key={f.id || i} className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{i + 1}. {f.frage || <span className="italic text-muted-foreground">{frageOptional ? 'Aufgabenstellung im Material' : 'Ohne Fragetext'}</span>}</p>
                  <span className={cn(
                    'shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                    istFrageVollstaendig(f, { frageOptional })
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  )}>
                    {ANTWORT_FORMATE.find((a) => a.value === f.format)?.label || f.format}
                  </span>
                </div>
                <p className="text-xs text-green-700">✓ {loesungsText(f) || '—'}</p>
                {f.rueckmeldung && <p className="text-xs text-muted-foreground">{f.rueckmeldung}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}