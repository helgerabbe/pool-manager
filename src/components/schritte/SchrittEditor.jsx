import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { SCHRITT_TYPEN, getSchrittTyp } from '@/lib/schrittTypen';
import MaterialSchrittEditor from '@/components/schritte/MaterialSchrittEditor';
import FreitextSchrittEditor from '@/components/schritte/FreitextSchrittEditor';
import KatalogSchrittEditor from '@/components/schritte/KatalogSchrittEditor';
import OffenSchrittEditor from '@/components/schritte/OffenSchrittEditor';
import {
  BrianSchrittEditor, HandlungSchrittEditor, ExternSchrittEditor,
} from '@/components/schritte/WeitereSchrittEditoren';
import { HinweisText } from '@/components/schritte/SchrittHinweis';

/**
 * SchrittEditor
 * ─────────────
 * Verteiler: wählt anhand von `schritt.typ` das passende Formular und rahmt
 * es mit den Feldern, die jeder Schritt hat (Titel, Kurzbeschreibung aus der
 * Struktur-Phase).
 *
 * Einzige Stelle, an der die Zuordnung Typ → Formular steht. Ein neuer
 * Schritttyp braucht einen Eintrag in lib/schrittTypen und einen Fall hier.
 *
 * Diese Komponente kommt ohne KI aus. Nur der Typ 'offen' verweist auf das
 * Gespräch, und auch das nur, wenn `onGespraechOeffnen` übergeben wird —
 * gewöhnliches Bearbeiten funktioniert also auch, wenn der Assistent
 * gerade nicht erreichbar ist.
 */
export default function SchrittEditor({ schritt, onChange, onGespraechOeffnen }) {
  if (!schritt) {
    return (
      <p className="text-sm text-muted-foreground italic py-8 text-center">
        Wählen Sie links einen Schritt aus.
      </p>
    );
  }

  const typInfo = getSchrittTyp(schritt.typ);
  const plan = schritt.plan || {};
  const setPlan = (feld, wert) => onChange({ ...schritt, plan: { ...plan, [feld]: wert } });

  const spezifisch = (() => {
    switch (schritt.typ) {
      case SCHRITT_TYPEN.MATERIAL:
        return <MaterialSchrittEditor schritt={schritt} onChange={onChange} />;
      case SCHRITT_TYPEN.AUFGABE:
        return <FreitextSchrittEditor schritt={schritt} onChange={onChange} />;
      case SCHRITT_TYPEN.KATALOG:
        return <KatalogSchrittEditor schritt={schritt} onChange={onChange} />;
      case SCHRITT_TYPEN.OFFEN:
        return <OffenSchrittEditor schritt={schritt} onGespraechOeffnen={onGespraechOeffnen} />;
      case SCHRITT_TYPEN.BRIAN:
        return <BrianSchrittEditor schritt={schritt} onChange={onChange} />;
      case SCHRITT_TYPEN.HANDLUNG:
        return <HandlungSchrittEditor schritt={schritt} onChange={onChange} />;
      case SCHRITT_TYPEN.EXTERN:
        return <ExternSchrittEditor schritt={schritt} onChange={onChange} />;
      default:
        return (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900">
              Für den Schritttyp „{schritt.typ}“ gibt es noch kein Formular. Der Schritt bleibt
              unverändert erhalten.
            </p>
          </div>
        );
    }
  })();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Titel des Schritts</Label>
        <Input
          value={schritt.titel || ''}
          onChange={(e) => onChange({ ...schritt, titel: e.target.value })}
          placeholder={typInfo?.label || 'Titel'}
        />
        <HinweisText>Sehen die Schüler über dem Inhalt. Leer lassen für den Standardtext.</HinweisText>
      </div>

      {/* Ergebnis der Struktur-Phase: bleibt sichtbar, auch wenn der Schritt
          längst gebaut ist — sonst geht die ursprüngliche Absicht verloren. */}
      <div className="space-y-2">
        <Label>Was hier passieren soll <span className="font-normal text-muted-foreground">(nur für Sie)</span></Label>
        <Textarea
          value={plan.kurzbeschreibung || ''}
          onChange={(e) => setPlan('kurzbeschreibung', e.target.value)}
          placeholder="Kurz notiert: Was ist der Zweck dieses Schritts?"
          className="min-h-[70px]"
        />
      </div>

      <div className="pt-1 border-t border-border" />

      {spezifisch}
    </div>
  );
}
