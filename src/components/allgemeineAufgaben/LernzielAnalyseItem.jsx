/**
 * LernzielAnalyseItem.jsx
 *
 * Eine einzelne Zeile in der Lernzielanalyse-Liste.
 * - Anklicken (Checkbox/Zeile) = auswählen → grün hinterlegt = "übernommen".
 * - KI-Vorschläge und Basismodul-Lücken sind sprachlich editierbar.
 * - Bestehende & Basismodul-Lernziele sind read-only (Originale).
 *
 * Quelle-Marker:
 *   bestehend          → 🔵 blaues Quadrat (Themenfeld-Kontext)
 *   ki                 → ✨ Sparkles
 *   basismodul         → 🟠 Fundament
 *   basismodul_luecke  → 🟣 Hinweis
 *   manuell            → ✏️ Stift
 */

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Square, Layers, AlertTriangle, PencilLine, X, Pencil } from 'lucide-react';

const QUELLE_META = {
  bestehend: { Icon: Square, color: 'text-blue-500', title: 'Bestehendes Lernziel der Einheit' },
  ki: { Icon: Sparkles, color: 'text-primary/70', title: 'Neuer KI-Vorschlag' },
  basismodul: { Icon: Layers, color: 'text-amber-600', title: 'Aus Basismodul (Vorwissen)' },
  basismodul_luecke: { Icon: AlertTriangle, color: 'text-purple-600', title: 'Fehlt noch im Basismodul' },
  manuell: { Icon: PencilLine, color: 'text-muted-foreground', title: 'Manuell ergänzt' },
};

export default function LernzielAnalyseItem({
  item,
  selected,
  kannBearbeiten,
  onToggle,
  onEdit,
  onRemove,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  const meta = QUELLE_META[item.quelle] || QUELLE_META.manuell;
  const Icon = meta.Icon;
  const editierbar = item.quelle === 'ki' || item.quelle === 'basismodul_luecke' || item.quelle === 'manuell';

  const saveEdit = () => {
    const t = draft.trim();
    if (t && t !== item.text) onEdit(t);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-primary/40 bg-primary/5">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
            if (e.key === 'Escape') { setDraft(item.text); setEditing(false); }
          }}
          className="text-[13px] h-8"
        />
        <Button size="sm" onClick={saveEdit} className="shrink-0 h-8">Übernehmen</Button>
      </div>
    );
  }

  // Kontext-Zusatz (nur wenn vorhanden): Lernpaket-Name bei bestehenden,
  // Basismodul-Name bei Basis-Lernzielen. "Aktuelles Themenfeld" entfällt –
  // die Zuordnung ist bereits über das blaue Symbol erkennbar.
  const kontext =
    item.quelle === 'bestehend'
      ? (item.lernpaket_titel ? `Lernpaket: ${item.lernpaket_titel}` : (item.themenfeld_titel ? `Themenfeld: ${item.themenfeld_titel}` : null))
      : item.quelle === 'basismodul'
      ? `Basismodul: ${item.basismodul_titel}`
      : null;

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md border text-[13px] transition-colors ${
        selected
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-border bg-card hover:bg-muted/40'
      }`}
    >
      {/* Auswahl-Toggle */}
      <button
        type="button"
        disabled={!kannBearbeiten}
        onClick={() => onToggle(!selected)}
        title={selected ? 'Ausgewählt – klicken zum Abwählen' : 'Klicken zum Übernehmen'}
        className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          selected
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'bg-white border-muted-foreground/40 text-transparent hover:border-emerald-400'
        } ${!kannBearbeiten ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
      >
        <Check className="w-3 h-3" />
      </button>

      {/* Text + Kontext (einzeilig) */}
      <div className="flex-1 min-w-0">
        <p className="leading-snug truncate" title={item.text}>{item.text}</p>
        {kontext && (
          <p className="text-[10px] text-muted-foreground leading-tight truncate">{kontext}</p>
        )}
        {item.quelle === 'basismodul_luecke' && (
          <p className="text-[10px] text-purple-600 leading-tight truncate">
            Müsste es vermutlich als Basismodul-Lernziel geben.
          </p>
        )}
      </div>

      {/* Quelle-Marker */}
      <span className="shrink-0" title={meta.title}>
        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
      </span>

      {/* Aktionen */}
      {kannBearbeiten && (
        <div className="shrink-0 flex items-center gap-1">
          {editierbar && (
            <button
              type="button"
              onClick={() => { setDraft(item.text); setEditing(true); }}
              title="Sprachlich anpassen"
              className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            title="Aus Liste entfernen"
            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}