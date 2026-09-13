import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Reply, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import AustauschAntwortDialog from '@/components/austausch/AustauschAntwortDialog';

const STATUS_LABEL = { offen: 'Offen', beantwortet: 'Beantwortet', erledigt: 'Erledigt' };

/** EINE Nachricht des Briefkastens: Kopf, aufklappbarer Text, Antworten. */
export default function AustauschNachrichtKarte({ nachricht }) {
  const [offen, setOffen] = useState(false);
  const eingehend = nachricht.an === 'pm';
  const wartet = eingehend && nachricht.status === 'offen';

  return (
    <div className={cn('rounded-lg border p-3', wartet ? 'border-accent/60 bg-accent/5' : 'border-border')}>
      <div className="flex flex-wrap items-start gap-2">
        {eingehend ? (
          <ArrowDownLeft className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : (
          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{nachricht.betreff}</p>
          <p className="text-xs text-muted-foreground">
            {eingehend ? 'Kursbau → Pool-Manager' : 'Pool-Manager → Kursbau'} · {nachricht.datei}
            {nachricht.antwortet_auf ? ` · antwortet auf ${nachricht.antwortet_auf}` : ''}
          </p>
        </div>
        {nachricht.braucht_malte && (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" /> Mensch entscheidet
          </Badge>
        )}
        <Badge variant={wartet ? 'default' : 'outline'} className="text-[11px]">
          {STATUS_LABEL[nachricht.status] || nachricht.status}
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => setOffen((o) => !o)} className="gap-1">
          {offen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {offen ? 'Zuklappen' : 'Lesen'}
        </Button>
      </div>

      {offen && (
        <div className="mt-3 space-y-3">
          <div className="prose prose-sm max-w-none rounded-md bg-muted/40 p-3 text-foreground">
            <ReactMarkdown>{nachricht.text}</ReactMarkdown>
          </div>
          {eingehend && (
            <AustauschAntwortDialog
              nachricht={nachricht}
              trigger={
                <Button size="sm" className="gap-2">
                  <Reply className="h-4 w-4" /> Antworten
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}