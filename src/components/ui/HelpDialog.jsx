import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

/**
 * HelpDialog – kontextbezogenes Hilfesystem
 *
 * Props:
 *   title       – Name des aktuellen Tabs/Bereichs
 *   description – Kurze Erklärung in einfacher Sprache
 *   features    – Array<string>: Was man hier tun kann
 *   faqs        – Array<{ question: string, answer: string }>
 */
export default function HelpDialog({ title, description, features = [], faqs = [] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
        onClick={() => setOpen(true)}
        title="Hilfe"
      >
        <HelpCircle className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Hilfe: {title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Beschreibung */}
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

            {/* Was kann ich hier tun? */}
            {features.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Was kann ich hier tun?</p>
                <ul className="space-y-1.5">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FAQs */}
            {faqs.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Häufige Fragen</p>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-sm text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}