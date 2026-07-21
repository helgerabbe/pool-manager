import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Lightbulb, Plus, Sparkles } from 'lucide-react';
import IdeenkisteEntwurfForm from './IdeenkisteEntwurfForm';
import IdeenkisteEntwurfCard from './IdeenkisteEntwurfCard';
import AufgabenAssistentDialog from './AufgabenAssistentDialog';
import IntegrationAssistentDialog from './IntegrationAssistentDialog';

/**
 * Aufgaben-Sammelbox ("Ideenkiste") einer Einheit: Liste aller Aufgaben-Ideen
 * mit Status offen/integriert plus Erfassungsformular für neue Ideen.
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
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Ideenkiste
          </SheetTitle>
          <SheetDescription>
            Sammeln Sie hier Aufgaben-Ideen für diese Einheit — auch wenn die Struktur noch
            nicht fertig ist. Später integrieren Sie die Ideen als echte Aufgaben in die Einheit.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {kannBearbeiten && !formIdee && (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setFormIdee({})} variant="outline" className="gap-1.5" size="sm">
                <Plus className="w-4 h-4" />
                Selbst erfassen
              </Button>
              <Button onClick={() => setAssistentOpen(true)} className="gap-1.5" size="sm">
                <Sparkles className="w-4 h-4" />
                Mit KI ausarbeiten
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
              Offen ({offene.length})
            </p>
            {offene.length === 0 && (
              <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                Noch keine offenen Aufgaben-Ideen.
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