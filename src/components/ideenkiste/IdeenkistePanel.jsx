import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import IdeenkisteEntwurfForm from './IdeenkisteEntwurfForm';
import IdeenkisteEntwurfCard from './IdeenkisteEntwurfCard';
import AufgabenAssistentDialog from './AufgabenAssistentDialog';
import IntegrationAssistentDialog from './IntegrationAssistentDialog';

/**
 * Aufgabenassistent einer Einheit (früher "Ideenkiste"). Zwei getrennte Schritte:
 * 1. Aufgabe ERSTELLEN — im KI-Dialog (mit Material-Upload) oder selbst erfassen.
 * 2. Aufgabe INTEGRIEREN — sofort nach dem Erstellen oder später; der Assistent
 *    empfiehlt eine Platzierung, die Lehrkraft wählt die Stelle immer selbst.
 */
export default function IdeenkistePanel({ open, onOpenChange, einheitId, einheit = null, ideen = [], kannBearbeiten }) {
  const [formIdee, setFormIdee] = useState(null); // null = zu, {} = neu, {id,...} = bearbeiten
  const [assistentOpen, setAssistentOpen] = useState(false);
  const [integrierenIdee, setIntegrierenIdee] = useState(null);

  const offene = ideen.filter((i) => i.status !== 'integriert');
  const integrierte = ideen.filter((i) => i.status === 'integriert');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Aufgabenassistent
          </SheetTitle>
          <SheetDescription>
            Erstellen Sie Aufgaben im Dialog mit dem Assistenten (oder selbst) und integrieren Sie
            sie an die passende Stelle der Einheit — sofort oder später. Der Assistent empfiehlt
            eine Platzierung, die Entscheidung liegt bei Ihnen.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {kannBearbeiten && !formIdee && (
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
              Erstellt — noch nicht integriert ({offene.length})
            </p>
            {offene.length === 0 && (
              <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                Noch keine erstellten Aufgaben. Starten Sie mit „Aufgabe erstellen".
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

      <IntegrationAssistentDialog
        open={!!integrierenIdee}
        onOpenChange={(v) => { if (!v) setIntegrierenIdee(null); }}
        idee={integrierenIdee}
        einheit={einheit || { id: einheitId }}
      />
    </Sheet>
  );
}