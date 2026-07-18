import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SpeechInputButton from '@/components/ui/SpeechInputButton';
import CoachChatMessage from '@/components/coach/CoachChatMessage';
import {
  Send,
  Loader2,
  ImagePlus,
  X,
  SearchCheck,
  Lightbulb,
  MonitorPlay,
} from 'lucide-react';

/**
 * Chat-Bereich des Einheiten-Coach: Nachrichtenverlauf, Eingabe (Tippen,
 * Diktieren, Bild einfügen per Strg+V oder Datei-Auswahl) und die drei
 * Standard-Aktionen (Kritische Prüfung, Inspiration, Studyflix).
 */
export default function CoachChat({
  messages,
  busy,
  uploadingBild,
  bilder,
  onSend,
  onAction,
  onAddBild,
  onRemoveBild,
}) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    onSend(t);
  };

  const handlePaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type?.startsWith('image/'));
    if (item) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) onAddBild(file);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Verlauf */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => (
          <CoachChatMessage key={i} message={m} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-9">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Der Coach denkt nach…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Aktions-Buttons */}
      <div className="px-4 pt-2 flex flex-wrap gap-2 shrink-0">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction('kritik')} className="gap-1.5 text-xs">
          <SearchCheck className="w-3.5 h-3.5" /> Kritische Prüfung
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction('inspiration')} className="gap-1.5 text-xs">
          <Lightbulb className="w-3.5 h-3.5" /> Inspiration
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction('studyflix')} className="gap-1.5 text-xs">
          <MonitorPlay className="w-3.5 h-3.5" /> Studyflix-Recherche
        </Button>
      </div>

      {/* Kontext-Bilder (z. B. Inhaltsverzeichnis) */}
      {(bilder.length > 0 || uploadingBild) && (
        <div className="px-4 pt-2 flex flex-wrap gap-2 shrink-0">
          {bilder.map((url, i) => (
            <div key={url} className="relative group">
              <img src={url} alt={`Kontext-Bild ${i + 1}`} className="h-14 w-14 object-cover rounded-md border border-border" />
              <button
                onClick={() => onRemoveBild(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Bild entfernen"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {uploadingBild && (
            <div className="h-14 w-14 rounded-md border border-dashed border-border flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Eingabe */}
      <div className="p-4 shrink-0">
        <div className="rounded-xl border border-border bg-card shadow-sm p-2 space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Erzähl dem Coach, was du vorhast… (Bild einfügen mit Strg+V, z. B. das Inhaltsverzeichnis deines Buches)"
            rows={2}
            className="resize-none text-sm border-0 focus-visible:ring-0 shadow-none p-1.5"
            disabled={busy}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAddBild(f);
                  e.target.value = '';
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || uploadingBild}
                title="Bild hochladen (z. B. Inhaltsverzeichnis des Lehrwerks)"
              >
                <ImagePlus className="w-4 h-4" /> Bild
              </Button>
              <SpeechInputButton
                value={text}
                onResult={(t) => setText(t)}
                maxSeconds={90}
                label="Diktieren"
                listeningLabel="Stopp"
              />
            </div>
            <Button size="sm" onClick={submit} disabled={busy || !text.trim()} className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Senden
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}