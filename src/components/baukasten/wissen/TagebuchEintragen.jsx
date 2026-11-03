import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Neue gehaltene Stunde frei einsprechen; die KI ordnet den Bericht. */
export default function TagebuchEintragen({ einheit, onFertig }) {
  const [text, setText] = React.useState('');
  const [datum, setDatum] = React.useState(new Date().toISOString().slice(0, 10));
  const [laedt, setLaedt] = React.useState(false);
  const speichern = async () => {
    setLaedt(true);
    try {
      const me = await base44.auth.me();
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Eine Lehrkraft berichtet, wie eine gehaltene Stunde der Einheit "${einheit.titel}" (${einheit.fach}, Jahrgang ${einheit.jahrgangsstufe}) verlaufen ist. Ordne den Bericht sachlich, ohne etwas zu erfinden. Wenn mehrere Stunden beschrieben sind, fasse sie zusammen und nenne das im Titel.\n\nBericht:\n${text}`,
        response_json_schema: { type: 'object', properties: { titel: { type: 'string' }, inhalt: { type: 'string' }, ergebnis: { type: 'string' }, besonderheiten: { type: 'string' } } },
      });
      await base44.entities.UnterrichtsTagebuch.create({ ...r, datum, rohtext: text, unterrichtseinheit_id: einheit.id, besitzer_email: me.email });
      setText(''); onFertig();
    } catch {
      toast.error('Der Eintrag konnte nicht gespeichert werden.');
    } finally { setLaedt(false); }
  };
  return (
    <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
      <p className="text-sm font-semibold">Gehaltene Stunde festhalten</p>
      <Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className="w-44" />
      <FreitextMitSprache rows={4} value={text} onChange={setText} placeholder="Erzähl einfach: Was habt ihr gemacht, wie lief es, was ist offen geblieben?" />
      <Button size="sm" onClick={speichern} disabled={!text.trim() || laedt}>{laedt && <Loader2 className="h-4 w-4 animate-spin" />} Speichern</Button>
    </div>
  );
}