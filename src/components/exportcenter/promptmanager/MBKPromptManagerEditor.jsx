/**
 * MBKPromptManagerEditor.jsx
 *
 * Rechte Spalte des MBK-Prompt-Managers: Editor für den ausgewählten
 * Prompt. Speichert via `updateMBKGlobalPromptSecure` (RBAC-Wrapper).
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Copy, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('de-DE');
  } catch {
    return iso;
  }
}

export default function MBKPromptManagerEditor({ prompt, onSave, isSaving }) {
  const [text, setText] = useState('');
  const [istAktiv, setIstAktiv] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setText(prompt?.prompt_text || '');
    setIstAktiv(prompt?.ist_aktiv !== false);
    setDirty(false);
  }, [prompt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!prompt) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="text-center max-w-sm">
          <Info className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Wähle links einen Prompt aus, um ihn zu bearbeiten.
          </p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    await onSave({
      id: prompt.id,
      prompt_text: text,
      ist_aktiv: istAktiv,
    });
    setDirty(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text || '');
    toast.success('Text kopiert.');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border p-4 bg-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{prompt.anzeigename}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="font-mono">{prompt.schluessel}</span>
              <Badge variant="outline" className="text-[10px]">{prompt.kategorie}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Switch
                id="prompt-active"
                checked={istAktiv}
                onCheckedChange={(v) => { setIstAktiv(v); setDirty(true); }}
              />
              <Label htmlFor="prompt-active" className="text-xs cursor-pointer">
                Aktiv
              </Label>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Zuletzt bearbeitet: {formatDateTime(prompt.updated_date)}
          {prompt.created_by ? ` · von ${prompt.created_by}` : ''}
        </p>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <Textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setDirty(true); }}
          placeholder="Prompt-Text als Markdown …"
          className="h-full min-h-[300px] resize-none font-mono text-sm"
        />
      </div>

      <div className="shrink-0 border-t border-border p-3 bg-card flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {dirty ? 'Ungespeicherte Änderungen' : 'Alle Änderungen gespeichert'}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            Kopieren
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || isSaving} className="gap-1.5">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}