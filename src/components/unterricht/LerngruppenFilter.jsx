/**
 * LerngruppenFilter.jsx — schmale Filterleiste (Fach / Jahrgang) über den
 * Lerngruppen-Kacheln. Filtert nur, fügt keine Navigationsebene hinzu.
 */
import React from 'react';
import { AKTUELLES_SCHULJAHR, SCHULJAHRE } from '@/lib/schuljahre';

const sel =
  'h-8 rounded-md border border-input bg-transparent px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export default function LerngruppenFilter({ kacheln, filter, onChange }) {
  const faecher = [...new Set(kacheln.map((k) => k.fach))].sort((a, b) => a.localeCompare(b, 'de'));
  const jgs = [...new Set(kacheln.map((k) => String(k.jahrgangsstufe)))].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={sel} value={filter.sj} onChange={(e) => onChange({ ...filter, sj: e.target.value })}>
        <option value="">Alle Schuljahre</option>
        {SCHULJAHRE.map((s) => <option key={s} value={s}>Schuljahr {s}</option>)}
      </select>
      <select className={sel} value={filter.fach} onChange={(e) => onChange({ ...filter, fach: e.target.value })}>
        <option value="">Alle Fächer</option>
        {faecher.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <select className={sel} value={filter.jg} onChange={(e) => onChange({ ...filter, jg: e.target.value })}>
        <option value="">Alle Jahrgänge</option>
        {jgs.map((j) => <option key={j} value={j}>Jg. {j}</option>)}
      </select>
      {(filter.fach || filter.jg || filter.sj !== AKTUELLES_SCHULJAHR) && (
        <button type="button" className="text-xs text-primary hover:underline" onClick={() => onChange({ fach: '', jg: '', sj: AKTUELLES_SCHULJAHR })}>
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}