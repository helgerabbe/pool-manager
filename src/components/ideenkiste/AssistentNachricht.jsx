import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Eine Chat-Nachricht im Aufgaben-Assistenten (Lehrkraft oder KI). */
export default function AssistentNachricht({ nachricht }) {
  const istUser = nachricht.rolle === 'user';
  return (
    <div className={cn('flex gap-2', istUser ? 'justify-end' : 'justify-start')}>
      {!istUser && (
        <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-amber-600" />
        </div>
      )}
      <div
        className={cn(
          'rounded-lg px-3 py-2 text-sm max-w-[85%]',
          istUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {istUser ? (
          <p className="whitespace-pre-line">{nachricht.text}</p>
        ) : (
          <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{nachricht.text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}