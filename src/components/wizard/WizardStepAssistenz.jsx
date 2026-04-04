import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, CheckCircle, AlertCircle, Undo2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Hilfsfunktion: Flacht die Struktur {themenfelder:[...]} in lokales State-Format um
function flattenStructure(structure) {
  const flatThemenfelder = structure.themenfelder.map((tf, idx) => ({
    id: `tf-${idx}`,
    titel: tf.titel,
    beschreibung: tf.beschreibung || '',
  }));
  const flatLernpakete = [];
  structure.themenfelder.forEach((tf, tfIdx) => {
    (tf.lernpakete || []).forEach((lp, lpIdx) => {
      flatLernpakete.push({
        id: `lp-${tfIdx}-${lpIdx}`,
        themenfeld_id: `tf-${tfIdx}`,
        titel_des_pakets: lp.titel,
        geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten || 45,
      });
    });
  });
  return { flatThemenfelder, flatLernpakete };
}

// Struktur-Vorschau links
function StructurePreview({ themenfelder = [], lernpakete = [], loading = false }) {
  if (loading && themenfelder.length === 0) {
    return (
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">KI entwirft Struktur-Vorschlag...</p>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-10 bg-blue-100 rounded-lg animate-pulse" />
            <div className="ml-4 space-y-2">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (themenfelder.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
        <p className="text-sm">Warte auf KI-Vorschlag...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto pr-2 flex-1">
      {themenfelder.map(tf => (
        <div key={tf.id} className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-foreground">{tf.titel}</h4>
          </div>
          <div className="ml-4 space-y-2">
            {lernpakete
              .filter(lp => lp.themenfeld_id === tf.id)
              .map((lp, idx) => (
                <div
                  key={lp.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <p className="text-sm font-medium text-foreground">{lp.titel_des_pakets}</p>
                  {lp.geschaetzte_dauer_minuten && (
                    <p className="text-xs text-muted-foreground mt-0.5">⏱ {lp.geschaetzte_dauer_minuten} Min</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Chat-Nachricht
function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-primary">AI</span>
        </div>
      )}
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${isUser ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-foreground'}`}>
        <p className="leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

export default function WizardStepAssistenz({
  einheitId,
  stammdaten = {},
  onStructureAccepted,
  onSkipToManual,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true); // Startet direkt im Lade-Zustand
  const [themenfelder, setThemenfelder] = useState([]);
  const [lernpakete, setLernpakete] = useState([]);
  const [error, setError] = useState(null);
  const [structureHistory, setStructureHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const initialFetchDone = useRef(false);

  const pushToHistory = (currentTf, currentLp) => {
    if (currentTf.length === 0) return;
    setStructureHistory(prev => [...prev.slice(-7), { themenfelder: currentTf, lernpakete: currentLp }]);
  };

  const handleUndo = () => {
    if (structureHistory.length === 0) return;
    const prev = structureHistory[structureHistory.length - 1];
    setThemenfelder(prev.themenfelder);
    setLernpakete(prev.lernpakete);
    setStructureHistory(h => h.slice(0, -1));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialen Vorschlag direkt beim Mount laden
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;

    const fetchInitialStructure = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await base44.functions.invoke('generateUnitStructure', {
          stammdaten,
          messages: [],
          documentUrls: [],
        });

        const aiResponse = response.data?.aiResponse || 'Kein Vorschlag erhalten.';
        const structure = response.data?.structure;

        setMessages([{ role: 'assistant', content: aiResponse }]);

        if (structure?.themenfelder && Array.isArray(structure.themenfelder)) {
          const { flatThemenfelder, flatLernpakete } = flattenStructure(structure);
          setThemenfelder(flatThemenfelder);
          setLernpakete(flatLernpakete);
        }
      } catch (err) {
        setError(err.message || 'Fehler bei der KI-Kommunikation');
        setMessages([{ role: 'assistant', content: 'Es trat ein Fehler auf. Bitte versuche es erneut.' }]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialStructure();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const updatedMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);
    setError(null);

    try {
      const currentStructureContext = themenfelder.length > 0
        ? JSON.stringify({
            themenfelder: themenfelder.map(tf => ({
              titel: tf.titel,
              lernpakete: lernpakete
                .filter(lp => lp.themenfeld_id === tf.id)
                .map(lp => ({ titel: lp.titel_des_pakets, geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten })),
            })),
          })
        : null;

      const response = await base44.functions.invoke('generateUnitStructure', {
        stammdaten,
        messages: updatedMessages,
        documentUrls: [],
        currentStructure: currentStructureContext,
      });

      const aiResponse = response.data?.aiResponse || 'Keine Antwort erhalten.';
      const structure = response.data?.structure;

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

      if (structure?.themenfelder && Array.isArray(structure.themenfelder)) {
        pushToHistory(themenfelder, lernpakete);
        const { flatThemenfelder, flatLernpakete } = flattenStructure(structure);
        setThemenfelder(flatThemenfelder);
        setLernpakete(flatLernpakete);
      }
    } catch (err) {
      setError(err.message || 'Fehler bei der KI-Kommunikation');
      setMessages(prev => [...prev, { role: 'assistant', content: `Fehler: ${err.message || 'Ein Fehler ist aufgetreten.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptStructure = async () => {
    if (onStructureAccepted) {
      await onStructureAccepted({ messages, themenfelder, lernpakete });
    }
  };

  return (
    <div className="flex flex-col bg-background" style={{ height: 'calc(100vh - 220px)' }}>
      {/* Header */}
      <div className="border-b px-4 py-3 flex-shrink-0">
        <h2 className="text-base font-semibold">KI-Assistent: Struktur-Design</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {stammdaten.titel_der_einheit} · {stammdaten.fach} · Jg. {stammdaten.jahrgangsstufe}
        </p>
      </div>

      {/* Split-Screen */}
      <div className="flex flex-1 overflow-hidden gap-3 p-3">
        {/* Links: Struktur-Vorschau */}
        <div className="flex-1 bg-card border rounded-lg p-4 overflow-hidden flex flex-col">
          <div className="mb-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Struktur-Vorschau</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading && themenfelder.length === 0
                  ? 'KI generiert...'
                  : themenfelder.length > 0
                    ? `${themenfelder.length} Themenfelder · ${lernpakete.length} Lernpakete`
                    : '–'}
              </p>
            </div>
            {structureHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={loading}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Rückgängig ({structureHistory.length})
              </Button>
            )}
          </div>
          <StructurePreview themenfelder={themenfelder} lernpakete={lernpakete} loading={loading} />
        </div>

        {/* Rechts: Chat */}
        <div className="w-[32%] bg-card border rounded-lg p-3 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-3 mb-3">
            {messages.length === 0 && loading && (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">KI generiert Vorschlag...</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} role={msg.role} content={msg.content} />
            ))}
            {loading && messages.length > 0 && (
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                </div>
                <div className="bg-slate-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">KI überarbeitet...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="mb-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Änderungswunsch eingeben..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              className="text-sm h-9"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading} className="h-9 w-9 flex-shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 bg-muted/30 flex justify-between items-center flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onSkipToManual} className="text-muted-foreground text-xs">
          Manuell bearbeiten
        </Button>
        <Button
          disabled={loading || themenfelder.length === 0}
          onClick={handleAcceptStructure}
          className="gap-2"
          size="sm"
        >
          <CheckCircle className="w-4 h-4" />
          Struktur übernehmen
        </Button>
      </div>
    </div>
  );
}