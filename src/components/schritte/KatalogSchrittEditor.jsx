import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StandardInput from '@/components/workspace/inputs/StandardInput';
import useAktivitaetenKatalog from '@/hooks/useAktivitaetenKatalog';
import { Loader2, Info } from 'lucide-react';
import AktivitaetInhaltEditor from '@/components/schritte/AktivitaetInhaltEditor';
import { hatEigenenEditor } from '@/lib/aktivitaetEditorMap';

/**
 * KatalogSchrittEditor
 * ────────────────────
 * Editor für einen Schritt vom Typ 'katalog': ein fertiges, deterministisches
 * Aufgabenformat aus dem Aktivitätenkatalog.
 *
 * Kern der Sache: Es wird KEIN eigenes Formular gebaut. Nach der Auswahl der
 * Aktivität rendert dieser Editor exakt deren `form_schema` über denselben
 * `StandardInput`, den auch der Lernpaket-Editor benutzt. Die Werte landen in
 * `schritt.field_values` — formatgleich zu LernpaketPhaseAktivitaet, damit die
 * vorhandenen Schüler-Renderer unverändert greifen.
 *
 * Damit ist Stufe 1 der Dreierregel abgedeckt: passenden Typ im Katalog
 * suchen und nur dessen Attribute abfragen (Beispiel Lehrwerk/Quelle:
 * Buchtitel, Seiten, Aufgabentext).
 *
 * Der INHALT entsteht nicht hier, sondern im Editor des jeweiligen Formats:
 * der WYSIWYG-Lückentext, der Miniquiz-Editor mit KI-Hilfe, der Galerie-Dialog
 * mit Demo-Vorschau. Diese Editoren gibt es bereits und sie werden an allen
 * Stellen benutzt, an denen so ein Format ausgearbeitet wird — siehe
 * schritte/AktivitaetInhaltEditor und lib/aktivitaetEditorMap.
 *
 * Formate ohne eigenen Editor zeigen ihre form_schema-Felder direkt: Für drei
 * Textfelder wie bei Lehrwerk/Quelle wäre ein eigenes Fenster nur im Weg.
 */
export default function KatalogSchrittEditor({ schritt, onChange }) {
  const { katalogMap, auswahlListe, isLoading } = useAktivitaetenKatalog();

  const aktivitaet = schritt.aktivitaet_id ? katalogMap[schritt.aktivitaet_id] : null;
  const formSchema = useMemo(() => aktivitaet?.form_schema || [], [aktivitaet]);
  const werte = schritt.field_values || {};

  const setAktivitaet = (id) => {
    // Formatwechsel verwirft die alten Feldwerte — sie gehören zu einem
    // anderen form_schema und wären sonst stille Altlasten.
    onChange({
      ...schritt,
      aktivitaet_id: id,
      field_values: {},
      herkunft: { ...(schritt.herkunft || {}), quelle: 'katalog' },
    });
  };

  const setWert = (feld, wert) => {
    onChange({ ...schritt, field_values: { ...werte, [feld]: wert } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Aktivitätenkatalog wird geladen …
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Aufgabenformat</Label>
        <Select value={schritt.aktivitaet_id || ''} onValueChange={setAktivitaet}>
          <SelectTrigger><SelectValue placeholder="Format auswählen …" /></SelectTrigger>
          <SelectContent>
            {auswahlListe.map((k) => (
              <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {aktivitaet?.beschreibung && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 leading-relaxed">{aktivitaet.beschreibung}</p>
        </div>
      )}

      {!aktivitaet && (
        <p className="text-sm text-muted-foreground italic">
          Wählen Sie ein Format – danach werden nur die Felder abgefragt, die dieses Format braucht.
        </p>
      )}

      {aktivitaet && formSchema.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Für dieses Format sind keine weiteren Felder hinterlegt.
        </p>
      )}

      {/* Der Inhalt wird im Editor des jeweiligen Formats gebaut — dem
          gleichen, den auch Lernpaket und Regieblatt benutzen. Formate ohne
          eigenen Editor zeigen ihre Felder direkt: für drei Textfelder lohnt
          kein zusätzliches Fenster. */}
      {aktivitaet && hatEigenenEditor(aktivitaet.name) && (
        <AktivitaetInhaltEditor
          katalogEntry={aktivitaet}
          fieldValues={werte}
          onChange={(fv) => onChange({ ...schritt, field_values: fv })}
          kontext={schritt?.plan?.kurzbeschreibung || ''}
        />
      )}

      {aktivitaet && !hatEigenenEditor(aktivitaet.name) && formSchema.map((field) => {
        // Bedingte Felder – gleiche Regel wie im Lernpaket-Editor.
        const inhaltTyp = werte.inhalt_typ;
        if (field.field_name === 'inhalt' && inhaltTyp && inhaltTyp !== 'text') return null;
        if (field.field_name === 'dokument_url' && inhaltTyp !== 'datei') return null;

        if (field.type === 'info') {
          return (
            <div key={field.field_name} className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              {field.label}
            </div>
          );
        }

        return (
          <div key={field.field_name} className="space-y-2">
            {field.field_name !== 'aufgabentext' && (
              <Label className="flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <StandardInput
              field={field}
              value={werte[field.field_name] || ''}
              onChange={(wert) => setWert(field.field_name, wert)}
            />
            {field.placeholder && !field.required && (
              <p className="text-xs text-muted-foreground italic">{field.placeholder}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
