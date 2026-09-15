import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';
import { toast } from 'sonner';
import GrafikAssistentDialog from '@/components/grafik/GrafikAssistentDialog';
import GrafikVarianteToggle from '@/components/grafik/GrafikVarianteToggle';
import { hatGrafikVariante, VARIANTE_FUNKTIONAL, VARIANTE_GRAFISCH } from '@/lib/grafikVariante';
import { HinweisText } from '@/components/schritte/SchrittHinweis';

/**
 * Der zweite, grafische Blick auf einen fertigen offenen Schritt.
 *
 * Bewusst getrennt vom Bauen: Hier wird nichts an der Funktion geändert, es
 * entsteht nur eine zusätzliche, schön gestaltete Fassung. Das Original bleibt
 * in `offen.fragment` unangetastet.
 */
export default function OffenGrafikSektion({ schritt, onChange, einheit = null }) {
  const [offen2, setOffen2] = useState(false);
  const offen = schritt.offen || {};
  const hatVariante = hatGrafikVariante(offen);

  const setOffenFelder = (patch) =>
    onChange({ ...schritt, offen: { ...offen, ...patch } });

  const uebernehmen = ({ fragment_polished, meta }) => {
    setOffenFelder({
      fragment_polished,
      design_meta: meta || null,
      design_variante: VARIANTE_GRAFISCH,
    });
    toast.success('Grafische Fassung übernommen — sie ist jetzt aktiv.');
  };

  const verwerfen = () => {
    setOffenFelder({
      fragment_polished: '',
      design_meta: null,
      design_variante: VARIANTE_FUNKTIONAL,
    });
    toast.success('Grafische Fassung verworfen. Das Original ist wieder aktiv.');
  };

  return (
    <div className="space-y-2 pt-3 border-t border-border">
      {hatVariante ? (
        <GrafikVarianteToggle
          variante={offen.design_variante || VARIANTE_FUNKTIONAL}
          onVariante={(v) => setOffenFelder({ design_variante: v })}
          onNeu={() => setOffen2(true)}
          onVerwerfen={verwerfen}
        />
      ) : (
        <>
          <Button
            variant="outline"
            className="w-full gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
            onClick={() => setOffen2(true)}
          >
            <Palette className="w-4 h-4" />
            Grafisch aufbereiten
          </Button>
          <HinweisText>
            Die Aufgabe funktioniert — jetzt darf ein Grafiker darüber schauen. Inhalt und Funktion
            bleiben unverändert, die schöne Fassung liegt als Variante daneben.
          </HinweisText>
        </>
      )}

      <GrafikAssistentDialog
        open={offen2}
        onOpenChange={setOffen2}
        art="offen"
        fragment={offen.fragment || ''}
        kontext={{
          fach: einheit?.fach,
          jahrgangsstufe: einheit?.jahrgangsstufe,
          thema: einheit?.titel_der_einheit,
          titel: schritt.titel,
        }}
        onUebernehmen={uebernehmen}
      />
    </div>
  );
}