import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, CheckCircle, AlertCircle, Wand2, HammerIcon, Upload, FileText, X, Undo2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ScenarioSelectionGrid from './ScenarioSelectionGrid';

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

// Startbildschirm: Weiche für manuell vs. KI
function EntryModeSelection({ stammdaten, onManual, onStartAI }) {
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [uploadedNames, setUploadedNames] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newUrls = [];
    const newNames = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newUrls.push(file_url);
      newNames.push(file.name);
    }
    setUploadedUrls(prev => [...prev, ...newUrls]);
    setUploadedNames(prev => [...prev, ...newNames]);
    setUploading(false);
  };

  const removeFile = (idx) => {
    setUploadedUrls(prev => prev.filter((_, i) => i !== idx));
    setUploadedNames(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Wie möchtest du die Struktur aufbauen?</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Für <strong>{stammdaten.titel_der_einheit}</strong> ({stammdaten.fach}, Jg. {stammdaten.jahrgangsstufe})
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Karte A: Manuell */}
        <div className="border-2 border-border rounded-xl p-6 flex flex-col gap-4 hover:border-primary/50 transition-colors bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <HammerIcon className="w-5 h-5 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">Ich habe bereits einen Plan.</h3>
          </div>
          <p className="text-sm text-muted-foreground flex-1">
            Baue die Themenfelder und Lernpakete komplett manuell auf. Du gelangst direkt zur Werkbank.
          </p>
          <Button variant="outline" className="w-full gap-2" onClick={onManual}>
            <HammerIcon className="w-4 h-4" />
            Zur manuellen Werkbank
          </Button>
        </div>

        {/* Karte B: KI */}
        <div className="border-2 border-primary/30 rounded-xl p-6 flex flex-col gap-4 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Ich wünsche KI-Unterstützung.</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Lass uns gemeinsam einen passenden Struktur-Entwurf erarbeiten.
          </p>

          {/* Upload-Zone */}
          <div className="border border-dashed border-border rounded-lg p-3 bg-background space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Optional: Arbeitsplan oder Kerncurriculum hochladen</p>
            {uploadedNames.length > 0 && (
              <div className="space-y-1">
                {uploadedNames.map((name, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                    <span className="text-xs flex items-center gap-1.5 truncate">
                      <FileText className="w-3 h-3 flex-shrink-0 text-primary" />
                      {name}
                    </span>
                    <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive ml-2 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" multiple className="hidden" onChange={handleFileUpload} />
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-xs h-8 border border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'Wird hochgeladen...' : 'Datei auswählen'}
            </Button>
          </div>

          <Button className="w-full gap-2" onClick={() => onStartAI(uploadedUrls)}>
            <Wand2 className="w-4 h-4" />
            KI-Coach starten
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hilfsfunktion: Flacht ein struktur-Objekt {themenfelder:[...]} in den lokalen State-Format um
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
        geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten || 60,
      });
    });
  });
  return { flatThemenfelder, flatLernpakete };
}

export default function WizardStepAssistenz({
  einheitId,
  stammdaten = {},
  onStructureAccepted,
  onSkipToManual,
  initialMessages = [],
}) {
  const [entryMode, setEntryMode] = useState('selection'); // 'selection' | 'ai_split_screen'
  const [activeDocumentUrls, setActiveDocumentUrls] = useState([]);
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [themenfelder, setThemenfelder] = useState([]);
  const [lernpakete, setLernpakete] = useState([]);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('initial'); // 'initial' | 'selection' | 'refinement'
  const [szenarien, setSzenarien] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [structureHistory, setStructureHistory] = useState([]); // Undo-Historie (max. 8 Einträge)
  const messagesEndRef = useRef(null);
  const autoFetchDone = useRef(false);

  // Hilfsfunktion: Speichert aktuellen Stand in Historie, bevor neue Struktur gesetzt wird
  const pushToHistory = (currentTf, currentLp) => {
    if (currentTf.length === 0) return;
    setStructureHistory(prev => [...prev.slice(-7), { themenfelder: currentTf, lernpakete: currentLp }]);
  };

  // Undo: Letzten gespeicherten Stand wiederherstellen
  const handleUndo = () => {
    if (structureHistory.length === 0) return;
    const prev = structureHistory[structureHistory.length - 1];
    setThemenfelder(prev.themenfelder);
    setLernpakete(prev.lernpakete);
    setStructureHistory(h => h.slice(0, -1));
    setMessages(m => [...m, {
      role: 'user',
      content: 'Der Nutzer hat die letzte Änderung verworfen und ist zum vorherigen Stand zurückgekehrt.',
    }]);
  };

  // Auto-scroll zu neuester Message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-Trigger: Sobald Split-Screen aktiv wird, sofort ersten Vorschlag laden
  useEffect(() => {
    if (entryMode !== 'ai_split_screen' || autoFetchDone.current) return;
    autoFetchDone.current = true;

    const fetchInitialStructure = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await base44.functions.invoke('generateUnitStructure', {
          stammdaten,
          messages: [],
          documentUrls: activeDocumentUrls,
        });

        const chatText = response.data?.aiResponse || 'Keine Antwort erhalten.';
        const structure = response.data?.structure;

        setMessages([{ role: 'assistant', content: chatText }]);

        if (structure && structure.szenario_a && structure.szenario_b) {
          setSzenarien(structure);
          setViewMode('selection');
        } else if (structure && structure.themenfelder && Array.isArray(structure.themenfelder)) {
          const { flatThemenfelder, flatLernpakete } = flattenStructure(structure);
          setThemenfelder(flatThemenfelder);
          setLernpakete(flatLernpakete);
          setViewMode('refinement');
        }
      } catch (err) {
        setError(err.message || 'Fehler bei der KI-Kommunikation');
        setMessages([{ role: 'assistant', content: 'Es trat ein Fehler auf. Bitte versuchen Sie es erneut.' }]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialStructure();
  }, [entryMode]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setError(null);

    try {
      // Aktuellen Struktur-Kontext als JSON mitschicken, damit das Backend weiß was gerade existiert
      const currentStructureContext = viewMode === 'refinement' && themenfelder.length > 0
        ? JSON.stringify({
            themenfelder: themenfelder.map(tf => ({
              titel: tf.titel,
              beschreibung: tf.beschreibung,
              lernpakete: lernpakete
                .filter(lp => lp.themenfeld_id === tf.id)
                .map(lp => ({ titel: lp.titel_des_pakets, geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten })),
            })),
          })
        : null;

      const response = await base44.functions.invoke('generateUnitStructure', {
        stammdaten,
        messages: [...messages, { role: 'user', content: userMessage }],
        documentUrls: activeDocumentUrls,
        currentStructure: currentStructureContext,
      });

      const chatText = response.data?.aiResponse || 'Keine Antwort erhalten.';
      const structure = response.data?.structure;

      setMessages(prev => [...prev, { role: 'assistant', content: chatText }]);

      // Szenario-Auswahl (nur bei erster Anfrage)
      if (structure && structure.szenario_a && structure.szenario_b) {
        setSzenarien(structure);
        setViewMode('selection');
      }
      // Refinement: direkt die Vorschau auf der linken Seite aktualisieren
      else if (structure && structure.themenfelder && Array.isArray(structure.themenfelder)) {
        pushToHistory(themenfelder, lernpakete); // aktuellen Stand sichern
        const { flatThemenfelder, flatLernpakete } = flattenStructure(structure);
        setThemenfelder(flatThemenfelder);
        setLernpakete(flatLernpakete);
        if (viewMode !== 'refinement') setViewMode('refinement');
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
      pushToHistory(themenfelder, lernpakete); // aktuellen Stand sichern (falls vorhanden)
      const { flatThemenfelder, flatLernpakete } = flattenStructure(selectedData);
      setThemenfelder(flatThemenfelder);
      setLernpakete(flatLernpakete);

      // Beende Selections-Modus, starte Refinement
      setViewMode('refinement');
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
          documentUrls: activeDocumentUrls,
        });

        const chatText = response.data?.aiResponse || '';
        if (chatText) setMessages(prev => [...prev, { role: 'assistant', content: chatText }]);
      } catch (err) {
        console.error('Refinement error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegenerateScenarios = async () => {
    setLoading(true);
    setError(null);

    try {
      const regenerateMessage = 'Die vorherigen Vorschläge waren nicht passend. Bitte probiere einen komplett neuen Ansatz mit zwei unterschiedlichen didaktischen Perspektiven.';
      
      const response = await base44.functions.invoke('generateUnitStructure', {
        stammdaten,
        messages: [...messages, { role: 'user', content: regenerateMessage }],
        documentUrls: activeDocumentUrls,
      });

      const chatText = response.data?.aiResponse || 'Keine Antwort erhalten.';
      const structure = response.data?.structure;

      setMessages(prev => [...prev, { role: 'assistant', content: chatText }]);

      // Setze neue Szenarien
      if (structure && structure.szenario_a && structure.szenario_b) {
        setSzenarien(structure);
        setSelectedScenario(null);
        setViewMode('selection');
      }
    } catch (err) {
      setError(err.message || 'Fehler bei der Neu-Generierung');
    } finally {
      setLoading(false);
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

  // Weiche: Startbildschirm
  if (entryMode === 'selection') {
    return (
      <EntryModeSelection
        stammdaten={stammdaten}
        onManual={onSkipToManual}
        onStartAI={(urls) => {
          setActiveDocumentUrls(urls);
          setEntryMode('ai_split_screen');
        }}
      />
    );
  }

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
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm">
                {viewMode === 'selection' ? 'Didaktische Ansätze' : loading ? 'Didaktische Ansätze' : 'Struktur-Vorschau'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading && viewMode === 'initial' && 'KI generiert zwei Struktur-Vorschläge...'}
                {!loading && viewMode === 'initial' && 'Starten Sie das Gespräch um Vorschläge zu erhalten'}
                {viewMode === 'selection' && 'Wählen Sie den gewünschten Ansatz'}
                {viewMode === 'refinement' && `${themenfelder.length} Themenfelder`}
              </p>
            </div>
            {viewMode === 'refinement' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={structureHistory.length === 0 || loading}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                title="Letzte KI-Änderung rückgängig machen"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Rückgängig {structureHistory.length > 0 && `(${structureHistory.length})`}
              </Button>
            )}
          </div>

          {viewMode === 'selection' && szenarien ? (
            <ScenarioSelectionGrid
              szenarien={szenarien}
              onSelect={handleSelectScenario}
              selectedScenario={selectedScenario}
              onRegenerate={handleRegenerateScenarios}
              loading={loading}
            />
          ) : viewMode === 'refinement' && themenfelder.length > 0 ? (
            <StructurePreview 
              themenfelder={themenfelder} 
              lernpakete={lernpakete}
              loading={loading}
            />
          ) : loading ? (
            /* Skeleton für initiales Laden der zwei Szenario-Karten */
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Die KI entwirft zwei didaktische Ansätze...</p>
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                {[0, 1].map(i => (
                  <div key={i} className="border-2 border-dashed border-muted rounded-xl p-5 space-y-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted" />
                      <div className="h-4 w-24 bg-muted rounded" />
                    </div>
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-4/5 bg-muted rounded" />
                    <div className="space-y-2 mt-3">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-8 bg-muted rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center flex-1">
              <p className="text-sm">Starten Sie oben rechts ein Gespräch</p>
            </div>
          )}
        </div>

        {/* Right: Chat Interface (30%, sticky) */}
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
          {viewMode === 'selection'
            ? 'Wählen Sie einen Ansatz aus'
            : themenfelder.length > 0
              ? `${themenfelder.length} Themenfelder, ${lernpakete.length} Lernpakete`
              : 'Keine Struktur erstellt'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline">Zurück</Button>
          <Button
            disabled={loading || viewMode === 'selection' || themenfelder.length === 0}
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
                Struktur übernehmen & zur Werkbank
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}