/**
 * BrianUebergabeFelder.jsx
 *
 * Zeigt die vier Brian.study-Übergabefelder einer Brian-Aufgabe zur
 * Kontrolle an (Dialogname, Anweisung für Lernende, interne Anweisung,
 * Abbruchbedingung) – mit Kopier-Button pro Feld. Reine Anzeige.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const FELDER = [
  { key: 'dialog_name', label: '1 · Dialogname' },
  { key: 'learner_instruction', label: '2 · Anweisung für Lernende (schülersichtbar)' },
  { key: 'system_instruction', label: '3 · Interne Anweisung für Brian' },
  { key: 'completion_rule', label: '4 · Abbruchbedingung' },
];

export default function BrianUebergabeFelder({ uebergabe }) {
  if (!uebergabe) return null;

  const copy = async (text, label) => {
    await navigator.clipboard.writeText(text || '');
    toast.success(`${label} kopiert.`);
  };

  return (
    <div className="rounded-xl border border-sky-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-700">
        <MessageCircle className="w-3.5 h-3.5" /> Übergabefelder für Brian.study
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        Diese vier Felder gehen so in die Übergabe an die MBK bzw. nach Brian.study.
      </p>
      <div className="mt-3 space-y-3">
        {FELDER.map(({ key, label }) => (
          <div key={key}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-700">{label}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[10px] gap-1"
                onClick={() => copy(uebergabe[key], label)}
              >
                <Copy className="w-3 h-3" /> Kopieren
              </Button>
            </div>
            <div className="mt-0.5 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs whitespace-pre-wrap text-slate-800">
              {uebergabe[key] || <span className="text-slate-400">— leer —</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}