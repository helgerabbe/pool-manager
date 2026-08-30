import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MaterialDateiFeld from '@/components/allgemeineAufgaben/MaterialDateiFeld';
import { HinweisText } from '@/components/schritte/SchrittHinweis';
import { ABGABE_FORMATE, abgabeSatz } from '@/lib/abgabeFormate';
import { cn } from '@/lib/utils';

/**
 * Editoren der übrigen Schritttypen.
 *
 * Bewusst in einer Datei: Es sind drei schmale Formulare ohne eigene Logik.
 * Sobald einer davon wächst, wandert er in eine eigene Datei.
 */

/* ── Brian-Gespräch ────────────────────────────────────────────────────── */

const PERSONEN = [
  { value: 'standard', label: 'Standard' },
  { value: 'unterstuetzend', label: 'Unterstützend' },
  { value: 'streng', label: 'Streng' },
  { value: 'restriktiv', label: 'Restriktiv' },
];

/**
 * Die vier Brian-Felder, gleicher Schnitt wie an der Aufgabe selbst und in
 * StundenSequenz.brian — damit generateBrianSegments unverändert greift.
 */
export function BrianSchrittEditor({ schritt, onChange }) {
  const b = schritt.brian || {};
  const setB = (feld, wert) => onChange({ ...schritt, brian: { ...b, [feld]: wert } });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name des Gesprächs</Label>
        <Input
          value={b.dialog_name || ''}
          onChange={(e) => setB('dialog_name', e.target.value)}
          placeholder="z. B. 'Argumente zur Schulpflicht'"
        />
        <HinweisText>Erscheint in Brian als Titel der Aufgabe.</HinweisText>
      </div>

      <div className="space-y-2">
        <Label>Anweisung für die Lernenden</Label>
        <Textarea
          value={b.learner_instruction || ''}
          onChange={(e) => setB('learner_instruction', e.target.value)}
          placeholder="Was sollen die Schüler im Gespräch tun? Das lesen sie."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Interne Anweisung für den Chatbot</Label>
        <Textarea
          value={b.system_instruction || ''}
          onChange={(e) => setB('system_instruction', e.target.value)}
          placeholder="Wie soll Brian sich verhalten? Für Lernende unsichtbar."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Abschlussregel</Label>
        <Textarea
          value={b.completion_rule || ''}
          onChange={(e) => setB('completion_rule', e.target.value)}
          placeholder="Woran erkennt Brian, dass die Aufgabe erledigt ist?"
          className="min-h-[70px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Betreuungsstil</Label>
        <Select value={b.tutor_persona || 'standard'} onValueChange={(v) => setB('tutor_persona', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERSONEN.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Ergänzung zum Betreuungsstil (optional)</Label>
        <Textarea
          value={b.tutor_persona_zusatz || ''}
          onChange={(e) => setB('tutor_persona_zusatz', e.target.value)}
          placeholder="z. B. fachliche Strenge, Sprachebene, Hilfestellungen"
          className="min-h-[70px]"
        />
      </div>
    </div>
  );
}

/* ── Handlungsaufgabe ──────────────────────────────────────────────────── */

/**
 * Arbeit an realem Material. Schülerseitig gibt es NUR einen Bestätigen-Knopf
 * und keine Eingabe — deshalb hier auch keine Musterlösung.
 */
export function HandlungSchrittEditor({ schritt, onChange }) {
  const h = schritt.handlung || {};
  const setH = (feld, wert) => onChange({ ...schritt, handlung: { ...h, [feld]: wert } });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Arbeitsauftrag</Label>
        <Textarea
          value={h.arbeitsauftrag || ''}
          onChange={(e) => setH('arbeitsauftrag', e.target.value)}
          placeholder="Was sollen die Schüler mit dem echten Material tun?"
          className="min-h-[120px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Benötigtes Material (optional)</Label>
        <Textarea
          value={h.material_hinweis || ''}
          onChange={(e) => setH('material_hinweis', e.target.value)}
          placeholder="z. B. 'Zollstock, Taschenrechner, Arbeitsblatt vom Lehrertisch'"
          className="min-h-[70px]"
        />
        <HinweisText>Erscheint bei den Schülern als gelber Hinweiskasten.</HinweisText>
      </div>

      <div className="space-y-2">
        <Label>Arbeitsblatt oder Foto (optional)</Label>
        <MaterialDateiFeld
          value={h.datei_url || ''}
          onChange={(url) => setH('datei_url', url)}
          materialTyp="pdf"
        />
      </div>

      <div className="space-y-2">
        <Label>Beschriftung des Bestätigen-Knopfes (optional)</Label>
        <Input
          value={h.bestaetigungstext || ''}
          onChange={(e) => setH('bestaetigungstext', e.target.value)}
          placeholder="Erledigt – ich habe das gemacht"
        />
        <HinweisText>
          Leer lassen für den Standardtext. Diesen Knopf tippen die Schüler, wenn sie fertig sind —
          eine Eingabe gibt es bei diesem Schritt nicht.
        </HinweisText>
      </div>
    </div>
  );
}

/* ── Externe Seite ─────────────────────────────────────────────────────── */

/** Eingebettete fremde Seite, typischerweise GeoGebra. */
export function ExternSchrittEditor({ schritt, onChange }) {
  const e = schritt.extern || {};
  const setE = (feld, wert) => onChange({ ...schritt, extern: { ...e, [feld]: wert } });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Adresse der Seite</Label>
        <Input
          value={e.url || ''}
          onChange={(e2) => setE('url', e2.target.value)}
          placeholder="https://www.geogebra.org/…"
        />
        <HinweisText>
          Nicht jede Seite lässt sich einbetten — manche Anbieter verbieten das. Prüfen Sie den
          Schritt in der Vorschau, bevor Sie ihn übernehmen.
        </HinweisText>
      </div>

      <div className="space-y-2">
        <Label>Titel (optional)</Label>
        <Input
          value={e.titel || ''}
          onChange={(e2) => setE('titel', e2.target.value)}
          placeholder="z. B. 'Dynamisches Dreieck'"
        />
      </div>

      <div className="space-y-2">
        <Label>Hinweis für die Schüler (optional)</Label>
        <Textarea
          value={e.hinweis || ''}
          onChange={(e2) => setE('hinweis', e2.target.value)}
          placeholder="Was sollen die Schüler auf dieser Seite tun?"
          className="min-h-[70px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Höhe in Pixeln (optional)</Label>
        <Input
          type="number"
          value={e.hoehe ?? ''}
          onChange={(e2) => setE('hoehe', e2.target.value === '' ? null : Number(e2.target.value))}
          placeholder="480"
        />
      </div>
    </div>
  );
}

/* ── Ergebnisabgabe ────────────────────────────────────────────────────── */

/**
 * Legt fest, WAS die Schüler:innen abgeben sollen — nicht, wo.
 *
 * Der Pool-Manager nimmt keine Dateien entgegen; hochgeladen wird in Moodle.
 * Dieser Schritt kündigt die Abgabe an der richtigen Stelle der Aufgabe an
 * und gibt die Angaben im Payload an die MBK weiter, die beides verbindet.
 */
export function AbgabeSchrittEditor({ schritt, onChange }) {
  const a = schritt.abgabe || {};
  const formate = a.formate || [];
  const setA = (feld, wert) => onChange({ ...schritt, abgabe: { ...a, [feld]: wert } });

  const umschalten = (id) => setA(
    'formate',
    formate.includes(id) ? formate.filter((f) => f !== id) : [...formate, id],
  );

  const vorschau = abgabeSatz(formate, a.custom_format);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Was soll abgegeben werden?</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {ABGABE_FORMATE.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => umschalten(f.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 transition-all',
                formate.includes(f.id)
                  ? 'border-teal-500 bg-teal-50 text-teal-800'
                  : 'border-border bg-card text-muted-foreground hover:border-teal-300',
              )}
            >
              <span className="text-lg">{f.emoji}</span>
              <span className="text-[11px] leading-tight text-center">{f.label}</span>
            </button>
          ))}
        </div>
        <HinweisText>Mehrfachauswahl möglich.</HinweisText>
      </div>

      <div className="space-y-2">
        <Label>Etwas anderes (optional)</Label>
        <Input
          value={a.custom_format || ''}
          onChange={(e) => setA('custom_format', e.target.value)}
          placeholder="z. B. ein Plakat auf Papier"
        />
      </div>

      <div className="space-y-2">
        <Label>Dateiformat (optional)</Label>
        <Input
          value={a.dateiformat || ''}
          onChange={(e) => setA('dateiformat', e.target.value)}
          placeholder="z. B. PDF"
        />
        <HinweisText>
          Wo genau hochgeladen wird, regelt Moodle — das müssen Sie hier nicht angeben.
        </HinweisText>
      </div>

      <div className="space-y-2">
        <Label>Hinweis für die Schüler:innen (optional)</Label>
        <Textarea
          value={a.hinweis || ''}
          onChange={(e) => setA('hinweis', e.target.value)}
          placeholder="z. B. „Nenne im Dateinamen deinen Namen und die Klasse.""
          className="min-h-[70px]"
        />
      </div>

      {vorschau && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-teal-900 uppercase tracking-wide">So lesen es die Schüler:innen</p>
          <p className="mt-0.5 text-sm text-teal-900">{vorschau}</p>
        </div>
      )}
    </div>
  );
}
