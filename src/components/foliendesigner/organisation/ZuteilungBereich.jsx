import React from 'react';
import { Input } from '@/components/ui/input';
import Umschalter from '../einstellungen/Umschalter';
import { ZUTEILUNG_ARTEN, ZUTEILUNG_VERFAHREN, WECHSEL } from '@/lib/folienOrganisation';

const feld = 'text-xs font-medium text-muted-foreground';

/** Zuteilung: Wer arbeitet mit wem, in welcher Rolle oder auf welcher Seite? */
export default function ZuteilungBereich({ o, setze }) {
  const aktiv = o.zuteilung !== 'keine';
  return (
    <section className="space-y-3">
      <div><p className="font-semibold">Zuteilung</p><p className="text-xs text-muted-foreground">Die Schüler sehen ihre Zuteilung über das Element „Zuteilungsanzeige“.</p></div>
      <Umschalter titel="Was wird zugeteilt?" optionen={ZUTEILUNG_ARTEN} wert={o.zuteilung} setze={(v) => setze({ zuteilung: v })} />
      {aktiv && <>
        <Umschalter titel="Verfahren" optionen={ZUTEILUNG_VERFAHREN} wert={o.verfahren} setze={(v) => setze({ verfahren: v })} />
        {o.zuteilung === 'gruppen' && <div className="space-y-1"><p className={feld}>Gruppengröße</p><Input type="number" min={2} value={o.groesse} onChange={(e) => setze({ groesse: Number(e.target.value) })} /></div>}
        {(o.zuteilung === 'rollen' || o.zuteilung === 'seiten') && <div className="space-y-1"><p className={feld}>{o.zuteilung === 'rollen' ? 'Rollen (durch Komma getrennt)' : 'Seiten (durch Komma getrennt)'}</p>
          <Input value={o.rollen} onChange={(e) => setze({ rollen: e.target.value })} placeholder={o.zuteilung === 'rollen' ? 'z. B. Zeitwächter, Schreiber, Sprecher' : 'z. B. Pro, Contra'} /></div>}
        {o.verfahren === 'wahl' && <p className="text-xs text-muted-foreground">Die Schüler entscheiden sich über eine Abstimmung auf der Folie; wer dieselbe Antwort wählt, kommt zusammen (z. B. Vier-Ecken-Methode).</p>}
        {o.verfahren === 'rotierend' && <>
          <Umschalter titel="Wechsel" optionen={WECHSEL} wert={o.wechsel} setze={(v) => setze({ wechsel: v })} />
          {o.wechsel === 'takt' && <div className="space-y-1"><p className={feld}>Takt in Minuten</p><Input type="number" min={1} value={o.takt} onChange={(e) => setze({ takt: Number(e.target.value) })} /></div>}
        </>}
      </>}
    </section>
  );
}