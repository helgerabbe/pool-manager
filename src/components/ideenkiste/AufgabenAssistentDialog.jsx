import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Paperclip, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { frageAufgabenAssistent } from '@/lib/aufgabenAssistent';
import AssistentNachricht from './AssistentNachricht';
import AssistentEntwurfVorschlag from './AssistentEntwurfVorschlag';

/**
 * Aufgaben-Assistent (Etappe 2): KI-Dialog, in dem die Lehrkraft eine
 * Aufgaben-Idee beschreibt und/oder Material hochlädt. Die KI analysiert,
 * stellt Rückfragen und liefert am Ende einen Entwurf für die Ideenkiste.
 */
export default function AufgabenAssistentDialog({ open, onOpenChange, einheit }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [materialien, setMaterialien] = useState([]); // {url, name}
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entwurf, setEntwurf] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, entwurf, loading]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setMaterialien((prev) => [...prev, { url: file_url, name: file.name }]);
      }
    } catch (_err) {
      toast.error('Upload fehlgeschlagen.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const neuerVerlauf = [...messages, { rolle: 'user', text }];
    setMessages(neuerVerlauf);
    setInput('');
    setLoading(true);
    try {
      const res = await frageAufgabenAssistent({
        einheit,
        verlauf: neuerVerlauf,
        fileUrls: materialien.map((m) => m.url),
      });
      setMessages((prev) => [...prev, { rolle: 'ki', text: res.antwort || '…' }]);
      if (res.entwurf?.titel) setEntwurf(res.entwurf);
    } catch (_err) {
      toast.error('Der Assistent konnte nicht antworten. Bitte erneut versuchen.');
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setEntwurf(null);
    setMaterialien([]);
    setInput('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) handleReset(); }}>
      <DialogContent className="w-[95%] sm:max-w-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Aufgaben-Assistent
          </DialogTitle>
          <DialogDescription>
            Beschreiben Sie Ihre Aufgaben-Idee und/oder laden Sie Material hoch (Screenshot, PDF,
            Dokument). Der Assistent arbeitet die Aufgabe mit Ihnen aus und legt sie in die Ideenkiste.
          </DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-40 space-y-3 py-2 pr-1">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
              Beispiel: „Ich habe ein Arbeitsblatt zur Quellenanalyse gesehen und möchte etwas
              Ähnliches für meine Einheit — die Schüler sollen lernen, Bildquellen zu beschreiben."
            </p>
          )}
          {messages.map((m, idx) => (
            <AssistentNachricht key={idx} nachricht={m} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Der Assistent denkt nach …
            </div>
          )}
          {entwurf && !loading && (
            <AssistentEntwurfVorschlag
              entwurf={entwurf}
              einheitId={einheit?.id}
              materialien={materialien}
            />
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t pt-3">
          {materialien.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {materialien.map((m, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-muted border rounded px-1.5 py-0.5">
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-32 truncate">{m.name}</span>
                  <button onClick={() => setMaterialien((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="shrink-0 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors" title="Material hochladen">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading}
                accept="image/*,.pdf,.doc,.docx,.odt,.txt" />
            </label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              rows={2}
              placeholder="Beschreiben Sie Ihre Aufgaben-Idee …"
              className="flex-1 resize-none"
            />
            <Button size="icon" onClick={handleSend} disabled={loading || uploading || !input.trim()} className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}