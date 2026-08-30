import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import AufgabenstellungSection from '@/components/allgemeineAufgaben/aufgabeSections/AufgabenstellungSection';
import ZusaetzlichesMaterialSection from '@/components/allgemeineAufgaben/aufgabeSections/ZusaetzlichesMaterialSection';
import { HinweisText } from '@/components/schritte/SchrittHinweis';

/**
 * BrianAufgabeSection
 * ───────────────────
 * Erster Reiter eines Brian-Schritts: DIE AUFGABE.
 *
 * Hier steht, was die Schüler:innen tun sollen — Aufgabentext, optional ein
 * Aufgabenbild und zusätzliche Materialien. Alles Weitere baut darauf auf:
 * Die Lernzielanalyse liest diesen Text, der Erwartungshorizont wird daraus
 * erzeugt, und am Ende entstehen die vier Brian-Felder.
 *
 * Genau dieser Aufbau war der erste Reiter der früheren Brian-Einzelaufgabe.
 * Die Bausteine sind dieselben (aufgabeSections/…) — nur arbeiten sie hier auf
 * dem Entwurf des Schritts statt auf der Aufgabe.
 *
 * Die vier Brian-Felder stehen NICHT hier, sondern im letzten Reiter. Sie
 * werden dort erzeugt, nicht von Hand geschrieben — das ist der ganze Sinn
 * der Konstruktion.
 */
export default function BrianAufgabeSection({ schritt, onChange }) {
  const b = schritt?.brian || {};
  const setBrian = (teil) => onChange({ ...schritt, brian: { ...b, ...teil } });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Titel des Schritts</Label>
        <Input
          value={schritt.titel || ''}
          onChange={(e) => onChange({ ...schritt, titel: e.target.value })}
          placeholder="z. B. „Die Besonderheit des Textes“"
        />
        <HinweisText>Sehen die Schüler:innen über der Aufgabe.</HinweisText>
      </div>

      <AufgabenstellungSection
        text={b.aufgabenstellung || ''}
        onTextChange={(text) => setBrian({ aufgabenstellung: text })}
        bildUrl={b.aufgaben_bild_url || ''}
        onBildUrlChange={(url) => setBrian({ aufgaben_bild_url: url || '' })}
      />

      <ZusaetzlichesMaterialSection
        materials={Array.isArray(b.materialien) ? b.materialien : []}
        onMaterialsChange={(m) => setBrian({ materialien: m })}
      />
    </div>
  );
}
