import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Lightbulb } from 'lucide-react';
import IdeenkisteEntwurfForm from './IdeenkisteEntwurfForm';
import IdeenkisteEntwurfCard from './IdeenkisteEntwurfCard';
import AufgabenAssistentDialog from './AufgabenAssistentDialog';
import IntegrationAssistentDialog from './IntegrationAssistentDialog';
import ThemenfeldIdeenModal from '@/components/missionen/ThemenfeldIdeenModal';
import { speichereIdeeInKiste, baueIdeenBeschreibung } from '@/lib/ideenkisteUebernahme';

/**
 * Der IDEENSPEICHER einer Einheit — die Ablage für Aufgaben-Ideen, die noch
 * keinen Platz haben.
 *
 * Der Name: In der Oberfläche hieß das lange "Aufgabenassistent", im Code
 * "Ideenkiste", in der Datenbank "Sammelbox" — drei Namen, und keiner sagte,
 * was es tut. Es assistiert nicht, es speichert. Deshalb heißt es in der
 * Oberfläche jetzt durchgängig Ideenspeicher (2026-08-30). Dateinamen und
 * Bezeichner blieben absichtlich unverändert: Eine Umbenennung quer durch
 * ein Dutzend Dateien wäre reines Risiko ohne Gewinn für die Lehrkraft.
 *
 * Drei Wege hinein, ein Weg hinaus:
 * 1. Ideen VORSCHLAGEN lassen — derselbe KI-Generator wie in der Werkstatt.
 * 2. Aufgabe im Dialog ERSTELLEN — mit Material-Upload.
 * 3. SELBST erfassen.
 * Hinaus geht es über INTEGRIEREN (Platzierung in der Einheit) oder über den
 * Einstieg der Aufgaben-Werkstatt, der offene Ideen zur Übernahme anbietet.
 */
export default function IdeenkistePanel({ open, onOpenChange, einheitId, einheit = null, ideen = [], kannBearbeiten }) {
  const [formIdee, setFormIdee] = useState(null); // null = zu, {} = neu, {id,...} = bearbeiten
  const [assistentOpen, setAssistentOpen] = useState(false);
  const [integrierenIdee, setIntegrierenIdee] = useState(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  // Der Generator arbeitet themenfeldbezogen — ohne Themenfelder kann er
  // nichts vorschlagen, deshalb wird der Weg dann gar nicht erst angeboten.
  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId && open,
  });

  const offene = ideen.filter((i) => i.status !== 'integriert');
  const integrierte = ideen.filter((i) => i.status === 'integriert');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Ideenspeicher
          </SheetTitle>
          <SheetDescription>
            Hier liegen Aufgaben-Ideen, die noch keinen Platz haben. Sammeln Sie sie, wann immer
            Ihnen etwas einfällt — und holen Sie sie später heraus, wenn Sie die Aufgabe wirklich
            bauen. Das geht über „Integrieren" oder direkt aus der Aufgaben-Werkstatt.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {kannBearbeiten && !formIdee && (
            <div className="space-y-2">
              {themenfelder.length > 0 && (
                <Button
                  onClick={() => setGeneratorOpen(true)}
                  variant="outline"
                  className="w-full gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                  size="sm"
                >
                  <Lightbulb className="w-4 h-4" />
                  Ideen vorschlagen lassen
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setAssistentOpen(true)} className="gap-1.5" size="sm">
                  <Sparkles className="w-4 h-4" />
                  Aufgabe erstellen
                </Button>
                <Button onClick={() => setFormIdee({})} variant="outline" className="gap-1.5" size="sm">
                  <Plus className="w-4 h-4" />
                  Selbst erfassen
                </Button>
              </div>
            </div>
          )}

          {formIdee && (
            <IdeenkisteEntwurfForm
              einheitId={einheitId}
              idee={formIdee.id ? formIdee : null}
              onClose={() => setFormIdee(null)}
            />
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Liegt bereit ({offene.length})
            </p>
            {offene.length === 0 && (
              <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                Noch nichts gesammelt. Lassen Sie sich Ideen vorschlagen oder erfassen Sie selbst eine.
              </p>
            )}
            {offene.map((idee) => (
              <IdeenkisteEntwurfCard
                key={idee.id}
                idee={idee}
                kannBearbeiten={kannBearbeiten}
                onEdit={() => setFormIdee(idee)}
                onIntegrieren={() => setIntegrierenIdee(idee)}
              />
            ))}
          </div>

          {integrierte.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Integriert ({integrierte.length})
              </p>
              {integrierte.map((idee) => (
                <IdeenkisteEntwurfCard key={idee.id} idee={idee} kannBearbeiten={kannBearbeiten} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>

      <AufgabenAssistentDialog
        open={assistentOpen}
        onOpenChange={setAssistentOpen}
        einheit={einheit || { id: einheitId }}
        onJetztIntegrieren={(idee) => {
          setAssistentOpen(false);
          setIntegrierenIdee(idee);
        }}
      />

      {/* Derselbe Generator wie in der Aufgaben-Werkstatt. Hier gibt es nur
          EIN sinnvolles Ziel — der Speicher ist ja schon der Speicher —,
          deshalb ist das zweite Ziel ausgeblendet. */}
      <ThemenfeldIdeenModal
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        einheitId={einheitId}
        themenfelder={themenfelder}
        zweitZielAnzeigen={false}
        primaerLabel="In den Ideenspeicher legen"
        primaerLabelFertig="Im Ideenspeicher"
        primaerErfolg="Idee liegt jetzt im Ideenspeicher."
        onSaveIdea={async (idea) => {
          await speichereIdeeInKiste({
            einheitId,
            titel: idea.titel,
            beschreibung: baueIdeenBeschreibung(idea, {
              themenfeldTitel: idea.themenfeld_titel,
              missionLabel: idea.mission_type,
            }),
            aufgabentypVorschlag: 'Allgemeine Aufgabe Ebene 2',
          });
        }}
      />

      <IntegrationAssistentDialog
        open={!!integrierenIdee}
        onOpenChange={(v) => { if (!v) setIntegrierenIdee(null); }}
        idee={integrierenIdee}
        einheit={einheit || { id: einheitId }}
      />
    </Sheet>
  );
}