import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ScenarioSelectionCards from './ScenarioSelectionCards';

// Struktur-Vorschau Komponente
function StructurePreview({ themenfelder = [], lernpakete = [], loading = false }) {
  return (
    <div className="space-y-4 overflow-y-auto pr-4">
      {themenfelder.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">{loading ? 'Die KI generiert die Struktur...' : 'Noch keine Struktur vorhanden'}</p>
          {loading && (
            <div className="mt-4 space-y-3">
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
          )}
        </div>
      ) : (
        themenfelder.map(tf => (
          <div key={tf.id} className="space-y-2">
            {/* Themenfeld Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
              <h4 className="font-semibold text-sm text-foreground">{tf.titel}</h4>
              {tf.beschreibung && (
                <p className="text-xs text-muted-foreground mt-1">{tf.beschreibung}</p>
              )}
            </div>

            {/* Lernpakete für dieses Themenfeld */}
            <div className="ml-4 space-y-2">
              {lernpakete
                .filter(lp => lp.themenfeld_id === tf.id)
                .map((lp, idx) => (
                  <div 
                    key={lp.id} 
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [szenarien, setSzenarien] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
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
      const response = await base44.functions.invoke('generateUnitStructure', {
        stammdaten,
        messages: [...messages, { role: 'user', content: userMessage }],
        documentUrls: documentUrls || [],
      });

      const aiReply = response.data?.aiResponse || 'Keine Antwort erhalten.';
      const structure = response.data?.structure;

      // Extrahiere Text-Teil (vor dem ---JSON_START--- Trenner)
      const textPart = aiReply.split('---JSON_START---')[0].trim();
      
      setMessages(prev => [...prev, { role: 'assistant', content: textPart }]);

      // Prüfe ob es Szenarien gibt (erste Anfrage)
      if (structure && structure.szenario_a && structure.szenario_b) {
        setSzenarien(structure);
        setIsSelectionMode(true);
      }
      // Oder normale Ein-Szenario-Struktur
      else if (structure && structure.themenfelder && Array.isArray(structure.themenfelder)) {
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
              geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten || 60,
            });
          });
        });

        setThemenfelder(flatThemenfelder);
        setLernpakete(flatLernpakete);
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

  const handleSelectScenario = async (scenarioKey) => {
    setSelectedScenario(scenarioKey);
    
    // Extrahiere die gewählte Struktur
    const selectedData = szenarien[scenarioKey];
    if (selectedData && selectedData.themenfelder) {
      const flatThemenfelder = selectedData.themenfelder.map((tf, idx) => ({
        id: `tf-${idx}`,
        titel: tf.titel,
        beschreibung: tf.beschreibung || '',
      }));

      const flatLernpakete = [];
      selectedData.themenfelder.forEach((tf, tfIdx) => {
        (tf.lernpakete || []).forEach((lp, lpIdx) => {
          flatLernpakete.push({
            id: `lp-${tfIdx}-${lpIdx}`,
            themenfeld_id: `tf-${tfIdx}`,
            titel_des_pakets: lp.titel,
            geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten || 60,
          });
        });
      });

      setThemenfelder(flatThemenfelder);
      setLernpakete(flatLernpakete);

      // Beende Selections-Modus
      setIsSelectionMode(false);
      setSzenarien(null);

      // Sende automatisierte Chat-Nachricht
      const confirmMessage = `Ich habe mich für ${scenarioKey === 'szenario_a' ? 'Szenario A' : 'Szenario B'} entschieden. Lass uns das verfeinern.`;
      setMessages(prev => [...prev, { role: 'user', content: confirmMessage }]);
      
      // Versuche automatisch die Verfeinerung abzurufen
      setLoading(true);
      try {
        const response = await base44.functions.invoke('generateUnitStructure', {
          stammdaten,
          messages: [...messages, { role: 'assistant', content: selectedData.erlaeuterung }],
          documentUrls: documentUrls || [],
        });

        const aiReply = response.data?.aiResponse || '';
        const textPart = aiReply.split('---JSON_START---')[0].trim();
        setMessages(prev => [...prev, { role: 'assistant', content: textPart }]);
      } catch (err) {
        console.error('Refinement error:', err);
      } finally {
        setLoading(false);
      }
    }
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
        {/* Left: Structure Preview or Scenario Selection (70%) */}
        <div className="flex-1 bg-card border rounded-lg p-4 overflow-hidden flex flex-col">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">
              {isSelectionMode ? 'Didaktische Ansätze' : 'Live-Struktur-Vorschau'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSelectionMode ? 'Wählen Sie den gewünschten Ansatz' : 'Nur-Lesen Ansicht'}
            </p>
          </div>
          {isSelectionMode && szenarien ? (
            <ScenarioSelectionCards 
              szenarien={szenarien}
              onSelect={handleSelectScenario}
              selectedScenario={selectedScenario}
            />
          ) : (
            <StructurePreview 
              themenfelder={themenfelder} 
              lernpakete={lernpakete}
              loading={loading}
            />
          )}
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