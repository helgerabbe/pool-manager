import React from 'react';
import { Switch } from '@/components/ui/switch';
import Umschalter from '../einstellungen/Umschalter';
import { FREIGABE, ABLAUF } from '@/lib/folienOrganisation';

const Schalter = ({ label, text, wert, setze }) => (
  <label className="flex items-start justify-between gap-3">
    <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{text}</span></span>
    <Switch checked={wert} onCheckedChange={setze} />
  </label>
);

/** Steuerung: Wer schaltet weiter, in welcher Reihenfolge, mit welchen Signalen? */
export default function SteuerungBereich({ o, setze }) {
  return (
    <section className="space-y-3">
      <p className="font-semibold">Steuerung</p>
      <Umschalter titel="Nächste Folie freigeben" optionen={FREIGABE} wert={o.freigabe} setze={(v) => setze({ freigabe: v })} />
      <Umschalter titel="Ablauf der Folien" optionen={ABLAUF} wert={o.ablauf} setze={(v) => setze({ ablauf: v })} />
      <Schalter label="Timer synchron" text="Der Timer läuft bei allen gleichzeitig und wird von der Lehrkraft gestartet." wert={o.timer_sync} setze={(v) => setze({ timer_sync: v })} />
      <Schalter label="Fertig melden" text="Schüler melden sich fertig; die Lehrkraft sieht den Stand der Klasse." wert={o.fertig_melden} setze={(v) => setze({ fertig_melden: v, partner_nach_fertig: v && o.partner_nach_fertig })} />
      {o.fertig_melden && <Schalter label="Partner nach Fertig-Meldung" text="Wer fertig ist, bekommt einen ebenfalls fertigen Partner (Lerntempoduett)." wert={o.partner_nach_fertig} setze={(v) => setze({ partner_nach_fertig: v })} />}
    </section>
  );
}