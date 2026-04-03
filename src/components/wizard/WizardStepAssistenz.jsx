import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Struktur-Vorschau Komponente
function StructurePreview({ themenfelder = [], lernpakete = [] }) {
  return (
    <div className="space-y-4 overflow-y-auto pr-4">
      {themenfelder.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Die KI generiert hier die Struktur...</p>
        </div>
      ) : (
        themenfelder.map(tf => (
          <div key={tf.id} className="space-y-2">
            {/* Themenfeld Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-sm text-foreground">{tf.titel}</h4>
              {tf.beschreibung && (
                <p className="text-xs text-muted-foreground mt-1">{tf.beschreibung}</p>
              )}
            </div>

            {/* Lernpakete für dieses Themenfeld */}
            <div className="ml-4 space-y-2">
              {lernpakete
                .filter(lp => lp.themenfeld_id === tf.id)
                .map(lp => (
                  <div key={lp.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <p className="text-sm font-medium text-foreground">{lp.titel_des_pakets}</p>
                    {lp.geschaetzte_dauer_minuten && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ⏱ {lp.geschaetzte_dauer_minuten} Min
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Chat Message Komponente
function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-primary">AI</span>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-slate-100 text-foreground'
        }`}
      >
        <p className="leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

export default function WizardStepAssistenz({
  einheitId,
  stammdaten = {},
  documentUrls = [],
  onStructureAccepted,
  initialMessages = [],
}) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [themenfelder, setThemenfelder] = useState([]);
  const [lernpakete, setLernpakete] = useState([]);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll zu neuester Message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('didaktikCoach', {
        messages: [...messages, { role: 'user', content: userMessage }],
        documentUrls: documentUrls || [],
      });

      const aiReply = response.data?.reply || 'Keine Antwort erhalten.';
      setMessages(prev => [...prev, { role: 'assistant', content: aiReply }]);

      // Versuche, die Struktur aus der AI-Antwort zu extrahieren (vereinfacht)
      // In produktivem Code würde man hier ein komplexeres Parsing durchführen
      if (aiReply.includes('Einheit:') || aiReply.includes('Lernpaket')) {
        parseAndStoreStructure(aiReply);
      }
    } catch (err) {
      setError(err.message || 'Fehler bei der KI-Kommunikation');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Fehler: ${err.message || 'Ein Fehler ist aufgetreten.'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const parseAndStoreStructure = (response) => {
    // Vereinfachtes Parsing - in der Praxis würde man hier eine strukturierte Antwort erwarten
    // Dies ist nur ein Platzhalter für die Logik
    // Die echte Implementierung würde die AI-Antwort analysieren und in Themenfelder/Lernpakete umwandeln
    console.log('Struktur-Parsing würde hier durchgeführt:', response);
  };

  const handleAcceptStructure = async () => {
    if (onStructureAccepted) {
      await onStructureAccepted({
        messages,
        themenfelder,
        lernpakete,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">KI-Assistent: Struktur-Design</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {stammdaten.titel_der_einheit} ({stammdaten.fach}, Jg. {stammdaten.jahrgangsstufe})
        </p>
      </div>

      {/* Main Split-Screen Area */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Left: Structure Preview (70%) */}
        <div className="flex-1 bg-card border rounded-lg p-4 overflow-hidden flex flex-col">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Live-Struktur-Vorschau</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Nur-Lesen Ansicht</p>
          </div>
          <StructurePreview themenfelder={themenfelder} lernpakete={lernpakete} />
        </div>

        {/* Right: Chat Interface (30%, fixed) */}
        <div className="w-[30%] bg-card border rounded-lg p-4 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {messages.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  Starten Sie ein Gespräch mit der KI, um Ihre Struktur zu entwerfen.
                </p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} role={msg.role} content={msg.content} />
            ))}
            {loading && (
              <div className="flex justify-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                </div>
                <div className="bg-slate-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">KI antwortet...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Ihre Frage oder Anweisung..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                className="text-sm h-9"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || loading}
                className="h-9 w-9"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer with Action Button */}
      <div className="border-t px-6 py-4 bg-muted/30 flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {themenfelder.length > 0
            ? `${themenfelder.length} Themenfelder, ${lernpakete.length} Lernpakete`
            : 'Keine Struktur erstellt'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline">Zurück</Button>
          <Button
            disabled={loading || themenfelder.length === 0}
            onClick={handleAcceptStructure}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird bearbeitet...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Struktur in Werkbank übernehmen
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}