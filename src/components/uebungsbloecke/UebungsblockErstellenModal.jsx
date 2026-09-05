import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { neuerUebungsblock } from '@/lib/einheitFormat';

/**
 * UebungsblockErstellenModal
 * ──────────────────────────
 * Schlanker Einstieg für das Format „Übungsblock" — ein kleines Format für
 * die Poolzeit, das in wenigen Minuten stehen soll.
 *
 * Angelegt wird eine PRIVATE Einheit mit `format: 'uebungsblock'`. Kein
 * eigener Datentyp: So erbt der Block Arbeitsplan, Bündel, Rechte und den Weg
 * nach Moodle über den Einheiten-Code. Und weil private Einheiten ohnehin
 * ohne Sperrlogik und Freigabe-Abschnitte auskommen, muss davon nichts
 * unterdrückt werden.
 *
 * Verwendet dieselbe Serverfunktion wie die Unterrichtsstunden
 * (`createEinheitMitDefaults` mit `privat: true`) — die legt die
 * Standardvorlagen gleich mit an.
 *
 * Gefragt wird nur, was ohne Nachdenken zu beantworten ist: Fach, Titel,
 * Jahrgang. Lernziele als Freitext sind optional und lassen sich später
 * ergänzen — wer schnell etwas bauen will, soll nicht an einem Formular
 * hängenbleiben.
 */
export default function UebungsblockErstellenModal({ open, onOpenChange, besitzerEmail }) {
  const [fach, setFach] = useState('');
  const [titel, setTitel] = useState('');
  const [jahrgang, setJahrgang] = useState('');
  const [thema, setThema] = useState('');
  const [lernziele, setLernziele] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.filter({ ist_aktiv: true }, 'reihenfolge', 100),
    enabled: open,
  });
  const { data: jahrgaenge = [] } = useQuery({
    queryKey: ['lookupJahrgaenge'],
    queryFn: () => base44.entities.LookupJahrgaenge.filter({ ist_aktiv: true }, 'reihenfolge', 100),
    enabled: open,
  });

  const anlegen = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('createEinheitMitDefaults', {
        metaData: { fach, titel_der_einheit: titel.trim(), jahrgangsstufe: jahrgang },
        privat: true,
      });
      const einheit = res?.data?.einheit;
      if (!einheit?.id) throw new Error(res?.data?.error || 'Übungsblock konnte nicht angelegt werden.');

      // Format und Vorbelegungen nachziehen. Die Serverfunktion kennt das
      // Format nicht — sie legt eine gewöhnliche private Einheit an.
      const vorbelegung = neuerUebungsblock({ fach, titel, jahrgangsstufe: jahrgang, besitzerEmail });
      await base44.entities.Einheiten.update(einheit.id, {
        format: vorbelegung.format,
        aktive_lerntypen: vorbelegung.aktive_lerntypen,
        wizard_status: vorbelegung.wizard_status,
        ...(lernziele.trim() ? { gesamtziele: [lernziele.trim()] } : {}),
      });

      // KEIN neues Themenfeld anlegen: createEinheitMitDefaults legt bereits
      // „Themenfeld 1" an. Ein zweites hier führte zu genau dem Doppel, das
      // beim Übungsblock nicht vorkommen darf — er hat exakt eines.
      // Stattdessen das vorhandene umbenennen, wenn ein Thema angegeben ist.
      const wunschTitel = thema.trim() || titel.trim();
      if (wunschTitel) {
        const vorhandene = await base44.entities.Themenfeld
          .filter({ einheit_id: einheit.id })
          .catch(() => []);
        const erstes = (vorhandene || [])[0];
        if (erstes?.id) {
          await base44.entities.Themenfeld.update(erstes.id, { titel: wunschTitel });
        }
      }

      return einheit;
    },
    onSuccess: (einheit) => {
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      toast.success('Übungsblock angelegt.');
      onOpenChange(false);
      navigate(`/workspace?einheit=${einheit.id}`);
    },
    onError: (err) => toast.error(err?.message || 'Anlegen fehlgeschlagen.'),
  });

  const bereit = !!fach && !!titel.trim() && !!jahrgang;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-violet-600" />
            Neuer Übungsblock
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Ein kleines Format für die Poolzeit: ein Thema, ein bis drei Lernpakete, ein paar
            Aufgaben. Alles Weitere ergänzst du danach.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fach *</Label>
              <Select value={fach} onValueChange={setFach}>
                <SelectTrigger><SelectValue placeholder="Fach wählen" /></SelectTrigger>
                <SelectContent>
                  {faecher.map((f) => (
                    <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jahrgang *</Label>
              <Select value={jahrgang} onValueChange={setJahrgang}>
                <SelectTrigger><SelectValue placeholder="Jahrgang" /></SelectTrigger>
                <SelectContent>
                  {/* Das Feld heißt 'bezeichnung', nicht 'name' — bei
                      LookupFaecher ist es umgekehrt. */}
                  {jahrgaenge.map((j) => (
                    <SelectItem key={j.id} value={String(j.bezeichnung)}>{j.bezeichnung}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titel *</Label>
            <Input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z. B. „Brüche kürzen und erweitern“"
            />
          </div>

          <div className="space-y-2">
            <Label>Thema <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input
              value={thema}
              onChange={(e) => setThema(e.target.value)}
              placeholder="Leer lassen — dann wird der Titel verwendet"
            />
          </div>

          <div className="space-y-2">
            <Label>Lernziele <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={lernziele}
              onChange={(e) => setLernziele(e.target.value)}
              placeholder="Was sollen die Schüler:innen danach können?"
              className="min-h-[70px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="ml-auto">
            Abbrechen
          </Button>
          <Button onClick={() => anlegen.mutate()} disabled={!bereit || anlegen.isPending} className="gap-2">
            {anlegen.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird angelegt…</>
              : 'Übungsblock anlegen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}