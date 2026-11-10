import React from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useKompetenzkarte from '@/hooks/useKompetenzkarte';
import KompetenzkarteEditor from './KompetenzkarteEditor';
import OnlineTestChat from '@/components/onlinetest/OnlineTestChat';

const TEXTE = {
  titel: 'Kompetenzkarten-Assistent',
  intro: 'Ich lese den Pragmatiker-Lernplan dieser Einheit und schlage eine Kompetenzkarte in Schülersprache vor: nach Bereichen gegliedert, gewichtet (zentral, wichtig, ergänzend) und mit den Lernpaketen und Aufgaben verknüpft, mit denen die Schüler jede Kompetenz lernen.',
  start: 'Kompetenzkarte erstellen',
  platzhalter: 'Was soll sich an der Karte ändern?',
  erstellt: 'Ich überarbeite die Karte …',
  neu: 'Ich erstelle die Karte, das dauert etwa eine Minute …',
};

/** Extra-Fenster für den Systembaustein „Kompetenzkarte“ im Pragmatiker-Dashboard. */
export default function KompetenzkarteDialog({ open, onOpenChange, einheit, sektoren, aufgabenById }) {
  const kk = useKompetenzkarte({ einheit, sektoren, aufgabenById, offen: open });
  const onSenden = (w) => kk.senden(w).catch(() => toast.error('Der Assistent hat nicht geantwortet. Bitte noch einmal versuchen.'));
  const schliessen = (v) => { if (!v && kk.geaendert && !window.confirm('Ungespeicherte Änderungen verwerfen?')) return; onOpenChange(v); };

  return (
    <Dialog open={open} onOpenChange={schliessen}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 p-0">
        <div className="flex items-center gap-3 border-b px-5 py-3 pr-12">
          <DialogTitle className="flex-1 font-display">Kompetenzkarte · {einheit?.titel_der_einheit}</DialogTitle>
          {kk.karte && (
            <Button size="sm" disabled={!kk.geaendert || kk.speichert} onClick={() => kk.speichern().then(() => toast.success('Kompetenzkarte gespeichert.'))}>
              {kk.speichert ? <Loader2 className="animate-spin" /> : <Save />} {kk.geaendert ? 'Speichern' : 'Gespeichert'}
            </Button>
          )}
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto bg-muted/40">
            {kk.isLoading ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : kk.karte?.bereiche ? (
              <KompetenzkarteEditor karte={kk.karte} verweise={kk.verweise} onChange={kk.aendern} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Target className="h-10 w-10" />
                <p className="text-sm">Noch keine Kompetenzkarte. Lass rechts einen Vorschlag erstellen.</p>
              </div>
            )}
          </div>
          <aside className="w-96 shrink-0 border-l bg-background">
            <OnlineTestChat verlauf={kk.gespraech} laedt={kk.laedt} hatTest={!!kk.karte?.bereiche} onSenden={onSenden} texte={TEXTE} />
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}