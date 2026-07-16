import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

/**
 * Eine kopierbare Zeile (Label + Wert + Kopieren-Button) für die
 * Moodle-LTI-Einrichtungskarte.
 */
export default function LtiCopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-44 shrink-0 text-xs font-medium text-muted-foreground">{label}</div>
      <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs" title={value}>
        {value || '—'}
      </code>
      <Button variant="outline" size="sm" className="h-7 gap-1.5 shrink-0" onClick={handleCopy} disabled={!value}>
        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Kopiert' : 'Kopieren'}
      </Button>
    </div>
  );
}