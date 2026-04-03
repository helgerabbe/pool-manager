import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUp, Zap, Hammer, Loader2, X } from 'lucide-react';

export default function WizardStepPfadwahl({ onSelectPath, einheitId }) {
  const [selectedPath, setSelectedPath] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const newDocs = [];
      for (const file of files) {
        if (!['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
          console.warn(`Datei ${file.name} wird nicht unterstützt (nur PDF, TXT, DOCX)`);
          continue;
        }

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newDocs.push({ name: file.name, url: file_url });
      }
      setUploadedDocs(prev => [...prev, ...newDocs]);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDoc = (url) => {
    setUploadedDocs(prev => prev.filter(d => d.url !== url));
  };

  const handleSelectPath = (path) => {
    setSelectedPath(path);
    onSelectPath(path, uploadedDocs.map(d => d.url));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Schritt 2: Wie möchten Sie vorgehen?</h2>
        <p className="text-sm text-muted-foreground mt-1">Wählen Sie einen Weg zur Strukturierung Ihrer Einheit.</p>
      </div>

      {/* Path Selection Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Option A: Manual */}
        <Card
          onClick={() => handleSelectPath('manual')}
          className={`p-6 cursor-pointer border-2 transition-all hover:shadow-lg ${
            selectedPath === 'manual'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Hammer className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Option A: Manuelle Struktur</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Ich habe bereits eine genaue Struktur vorbereitet. Ich möchte diese direkt in die Werkbank eingeben und arrangieren.
            </p>
            <div className="pt-2">
              <Button
                type="button"
                variant={selectedPath === 'manual' ? 'default' : 'outline'}
                className="w-full"
                onClick={e => {
                  e.stopPropagation();
                  handleSelectPath('manual');
                }}
              >
                Diese Option wählen
              </Button>
            </div>
          </div>
        </Card>

        {/* Option B: AI Assistant */}
        <Card
          onClick={() => setSelectedPath('ai')}
          className={`p-6 cursor-pointer border-2 transition-all hover:shadow-lg ${
            selectedPath === 'ai'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">Option B: KI-Assistent</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Ich benötige Vorschläge von der KI. Sie können optional Dokumente hochladen (Lehrplan, Arbeitsplan), die die KI berücksichtigt.
            </p>
            <div className="pt-2">
              <Button
                type="button"
                variant={selectedPath === 'ai' ? 'default' : 'outline'}
                className="w-full"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedPath('ai');
                }}
              >
                Diese Option wählen
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Document Upload Section (only for AI path) */}
      {selectedPath === 'ai' && (
        <Card className="p-6 border border-amber-200 bg-amber-50">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileUp className="w-4 h-4 text-amber-600" />
                Optionale Dokumente hochladen
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Laden Sie Lehrpläne, Arbeitspläne oder andere Dokumente hoch, die die KI bei der Strukturierung berücksichtigen soll. (PDF, TXT, DOCX)
              </p>
            </div>

            {/* Upload Area */}
            <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100/30 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUp className="w-6 h-6 text-amber-600 mb-2" />
                <p className="text-sm font-medium text-foreground">Dateien hier ablegen oder klicken zum Auswählen</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, TXT oder DOCX (max. 5MB pro Datei)</p>
              </div>
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {/* Uploaded Documents */}
            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Hochgeladene Dokumente:</p>
                <div className="space-y-2">
                  {uploadedDocs.map(doc => (
                    <div
                      key={doc.url}
                      className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-lg"
                    >
                      <span className="text-sm text-foreground truncate">{doc.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.url)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline">Zurück</Button>
        <Button
          disabled={!selectedPath || uploading}
          onClick={() => handleSelectPath(selectedPath)}
          className="gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Wird hochgeladen...
            </>
          ) : (
            <>Weiter</>
          )}
        </Button>
      </div>
    </div>
  );
}