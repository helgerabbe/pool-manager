import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentUploadPanel({ onDocumentsChange }) {
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    
    // Nur PDF, TXT und DOC-Dateien akzeptieren
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur PDF, TXT und Word-Dokumente sind erlaubt');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB max
      toast.error('Datei ist zu groß (max. 5MB)');
      return;
    }

    setIsUploading(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      const newDoc = {
        id: Date.now(),
        name: file.name,
        url: response.file_url,
        size: file.size,
        type: file.type,
      };
      const updated = [...documents, newDoc];
      setDocuments(updated);
      onDocumentsChange(updated);
      toast.success(`${file.name} hochgeladen`);
    } catch (err) {
      toast.error('Upload fehlgeschlagen');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const removeDocument = (id) => {
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    onDocumentsChange(updated);
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border border-dashed border-blue-300 bg-blue-50">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-blue-900">Kontextdokumente</h4>
      </div>
      <p className="text-xs text-blue-700">
        Laden Sie Schularbeitspläne, Lehrpläne oder andere Dokumente hoch, damit der KI-Coach diese bei der Strukturierung berücksichtigen kann.
      </p>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`p-4 rounded border-2 border-dashed transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-100' : 'border-blue-300 bg-white'
        }`}
      >
        <input
          type="file"
          id="doc-upload"
          accept=".pdf,.txt,.doc,.docx"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={isUploading}
          className="hidden"
        />
        <label
          htmlFor="doc-upload"
          className="flex flex-col items-center gap-2 cursor-pointer"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-xs text-muted-foreground">Wird hochgeladen...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-center text-muted-foreground">
                Datei hierher ziehen oder klicken zum Durchsuchen
              </span>
              <span className="text-[10px] text-muted-foreground">
                PDF, TXT, Word (max. 5MB)
              </span>
            </>
          )}
        </label>
      </div>

      {/* Dokumentenliste */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2 rounded bg-white border border-blue-200"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(doc.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => removeDocument(doc.id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <Badge variant="secondary" className="text-[10px]">
            {documents.length} Dokument{documents.length !== 1 ? 'e' : ''} geladen
          </Badge>
        </div>
      )}
    </div>
  );
}