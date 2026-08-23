/**
 * AssistentEingabe.jsx
 * Eingabezeile des Doku-Assistenten: Frage tippen, optional Material
 * (Foto/Screenshot/PDF) anhängen, mit Enter absenden.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

export default function AssistentEingabe({ onSenden, busy, variant = 'footer' }) {
  const [text, setText] = useState('');
  const [dateien, setDateien] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const { toast } = useToast();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDateien((prev) => [...prev, { url: file_url, name: file.name }]);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload fehlgeschlagen',
        description: err?.message || 'Bitte erneut versuchen.',
      });
    } finally {
      setUploading(false);
    }
  };

  const absenden = () => {
    const frage = text.trim();
    if (!frage || busy) return;
    onSenden(frage, dateien.map((d) => d.url));
    setText('');
    setDateien([]);
  };

  return (
    <div
      className={
        variant === 'start'
          ? 'bg-card px-4 py-3'
          : 'border-t border-border bg-card px-4 py-3'
      }
    >
      {dateien.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {dateien.map((d, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted border border-border max-w-[220px]"
            >
              <span className="truncate">{d.name}</span>
              <button
                type="button"
                onClick={() => setDateien((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          title="Foto, Screenshot oder PDF anhängen"
          disabled={uploading || busy}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </Button>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              absenden();
            }
          }}
          placeholder="Frag einfach: Wo finde ich …? Wie mache ich …? Ich habe hier eine Aufgabe und will …"
          rows={2}
          className="resize-none min-h-[44px]"
        />

        <SpeechInputButton
          value={text}
          onResult={setText}
          disabled={busy || uploading}
          maxSeconds={30}
          className="self-center"
        />

        <Button
          className="h-10 shrink-0"
          onClick={absenden}
          disabled={busy || uploading || !text.trim()}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Enter sendet · Shift+Enter für eine neue Zeile
      </p>
    </div>
  );
}