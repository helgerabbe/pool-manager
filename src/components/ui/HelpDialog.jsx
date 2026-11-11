import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import HilfeInhalt from '@/components/ui/HilfeInhalt';

/**
 * HelpDialog – kontextbezogenes Hilfesystem
 *
 * Props:
 *   title       – Name des aktuellen Tabs/Bereichs
 *   description – Kurze Erklärung in einfacher Sprache
 *   features    – Array<string>: Was man hier tun kann
 *   faqs        – Array<{ question: string, answer: string }>
 *   docsSlug    – Optionaler Slug für Deep-Link in die Dokumentation
 *   label       – Optional: Beschriftung. Mit Beschriftung erscheint ein
 *                 Knopf mit Fragezeichen, ohne nur das runde Fragezeichen.
 */
export default function HelpDialog({ title, description, features = [], faqs = [], docsSlug, label }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {label ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 text-xs px-2.5 bg-card"
          onClick={() => setOpen(true)}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {label}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-accent"
          onClick={() => setOpen(true)}
          title="Hilfe"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Hilfe: {title}
            </DialogTitle>
          </DialogHeader>

          <div className="py-1 overflow-y-auto flex-1 -mr-2 pr-2">
            <HilfeInhalt
              description={description}
              features={features}
              faqs={faqs}
              docsSlug={docsSlug}
              onLinkClick={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}