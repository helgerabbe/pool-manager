import React from 'react';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

/**
 * Inhalt einer Direkthilfe: Beschreibung, „Was kann ich hier tun?", häufige
 * Fragen und der Verweis auf die Dokumentation. Wird im Hilfefenster
 * (HelpDialog) und auf den Startseiten der Bereiche (BereichStartseite) gezeigt.
 */
export default function HilfeInhalt({ description, features = [], faqs = [], docsSlug, onLinkClick }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

      {features.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Was kann ich hier tun?</p>
          <ul className="space-y-1.5">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {faqs.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Häufige Fragen</p>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {docsSlug && (
        <div className="pt-3 border-t border-border">
          <Link
            to={`/docs/${docsSlug}`}
            onClick={onLinkClick}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <BookOpen className="w-4 h-4" />
            Ausführliche Dokumentation lesen
          </Link>
        </div>
      )}
    </div>
  );
}