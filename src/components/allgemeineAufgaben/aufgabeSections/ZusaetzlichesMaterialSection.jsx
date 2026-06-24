import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { uploadFile } from '@/services/FileService';
import { Type, BookMarked, FileUp, ImagePlus, X, Loader2, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ZusaetzlichesMaterialSection
 * Liste hochgeladener / verlinkter Materialien zur Aufgabe.
 * 1:1 aus AufgabeCreateView extrahiert.
 */
const ICONS = { free_text: '📝', pdf: '📄', image: '🖼️', book_ref: '📚' };

export default function ZusaetzlichesMaterialSection({
  materials,
  onMaterialsChange,
  onUploadingChange,
}) {
  const [activeTab, setActiveTab] = useState('freitext');
  const [newMaterial, setNewMaterial] = useState({
    type: 'freitext',
    content: '',
    label: '',
    file: null,
  });
  const [uploading, setUploading] = useState(false);
  const [pasteHighlight, setPasteHighlight] = useState(false);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  // Globaler Paste-Listener wenn Bild-Tab aktiv ist
  useEffect(() => {
    if (activeTab !== 'image') return;
    const handleGlobalPaste = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          handleImagePasteOrDrop(item.getAsFile());
          return;
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [activeTab, handleImagePasteOrDrop]);

  const typeFromTab = (tab) => (tab === 'freitext' ? 'free_text' : tab);

  const handleImagePasteOrDrop = useCallback((file) => {
    if (!file?.type.startsWith('image/')) return;
    setActiveTab('image');
    setNewMaterial((p) => ({ ...p, type: 'image', file }));
    toast.info('Bild eingefügt – bitte auf „Hochladen & Hinzufügen" klicken.');
  }, []);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        handleImagePasteOrDrop(item.getAsFile());
        return;
      }
    }
  }, [handleImagePasteOrDrop]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setPasteHighlight(false);
    handleImagePasteOrDrop(e.dataTransfer.files?.[0]);
  }, [handleImagePasteOrDrop]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setNewMaterial({ type: typeFromTab(tab), content: '', label: '', file: null });
  };

  const addMaterial = async () => {
    const type = typeFromTab(activeTab);
    if ((type === 'free_text' || type === 'book_ref') && !newMaterial.content.trim()) {
      toast.error('Bitte Inhalt eingeben');
      return;
    }
    if ((type === 'pdf' || type === 'image') && !newMaterial.file) {
      toast.error('Bitte Datei auswählen');
      return;
    }

    let finalMaterial = { type, label: newMaterial.label };

    if (type === 'pdf' || type === 'image') {
      setUploading(true);
      const { file_url } = await uploadFile(newMaterial.file);
      finalMaterial.url = file_url;
      setUploading(false);
    } else {
      finalMaterial.content = newMaterial.content;
    }

    onMaterialsChange([...materials, finalMaterial]);
    setNewMaterial({ type: typeFromTab(activeTab), content: '', label: '', file: null });
    toast.success('Material hinzugefügt');
  };

  const removeMaterial = (idx) => onMaterialsChange(materials.filter((_, i) => i !== idx));

  return (
    <div
      className={`space-y-3 p-4 rounded-lg border-2 transition-colors ${
        pasteHighlight ? 'border-primary bg-primary/5' : 'bg-muted/20 border-border'
      }`}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setPasteHighlight(true); }}
      onDragLeave={() => setPasteHighlight(false)}
    >
      <h4 className="text-sm font-semibold">Zusätzliches Material zur Aufgabe</h4>
      <p className="text-xs text-muted-foreground">
        Weitere Informationen, die zum Lösen der Aufgabe hilfreich sind (z.B. Arbeitsblatt, Tabelle,
        Buchseite).
      </p>

      {materials.length > 0 && (
        <div className="space-y-2">
          {materials.map((mat, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white border border-border text-sm"
            >
              <span className="shrink-0 mt-0.5">{ICONS[mat.type] || '📎'}</span>
              <div className="flex-1 min-w-0">
                {mat.type === 'image' && mat.url && (
                  <img
                    src={mat.url}
                    alt={mat.label || 'Bild'}
                    className="max-h-32 rounded border border-border object-contain mb-1"
                  />
                )}
                {mat.type === 'pdf' && mat.url && (
                  <iframe
                    src={mat.url}
                    className="w-full h-40 rounded border border-border mb-1"
                    title={mat.label || 'PDF'}
                  />
                )}
                <span className="text-xs text-muted-foreground break-words">
                  {mat.label ||
                    mat.content ||
                    (mat.type === 'image' || mat.type === 'pdf' ? '' : mat.url) ||
                    '…'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeMaterial(idx)}
                className="shrink-0 text-destructive hover:text-destructive/70 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-2">
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="freitext" className="text-xs">
            <Type className="w-3 h-3 mr-1" />
            Text
          </TabsTrigger>
          <TabsTrigger value="book_ref" className="text-xs">
            <BookMarked className="w-3 h-3 mr-1" />
            Buch
          </TabsTrigger>
          <TabsTrigger value="pdf" className="text-xs">
            <FileUp className="w-3 h-3 mr-1" />
            PDF
          </TabsTrigger>
          <TabsTrigger value="image" className="text-xs">
            🖼️ Bild
          </TabsTrigger>
        </TabsList>

        <TabsContent value="freitext" className="space-y-2">
          <textarea
            value={newMaterial.content}
            onChange={(e) => setNewMaterial((p) => ({ ...p, content: e.target.value }))}
            placeholder="Freitext eingeben…"
            className="w-full h-16 px-2 py-1.5 text-xs border border-border rounded resize-none focus:outline-none"
          />
          <Input
            placeholder="Label (optional)"
            value={newMaterial.label}
            onChange={(e) => setNewMaterial((p) => ({ ...p, label: e.target.value }))}
            className="h-8 text-xs"
          />
          <Button type="button" onClick={addMaterial} size="sm" className="w-full text-xs">
            Hinzufügen
          </Button>
        </TabsContent>

        <TabsContent value="book_ref" className="space-y-2">
          <Input
            placeholder="z.B. 'Seite 45–47', 'Kapitel 3'"
            value={newMaterial.content}
            onChange={(e) => setNewMaterial((p) => ({ ...p, content: e.target.value }))}
            className="h-8 text-xs"
          />
          <Input
            placeholder="Label (optional)"
            value={newMaterial.label}
            onChange={(e) => setNewMaterial((p) => ({ ...p, label: e.target.value }))}
            className="h-8 text-xs"
          />
          <Button type="button" onClick={addMaterial} size="sm" className="w-full text-xs">
            Hinzufügen
          </Button>
        </TabsContent>

        <TabsContent value="pdf" className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            <FileUp className="w-4 h-4" />
            {newMaterial.file ? newMaterial.file.name : 'PDF auswählen…'}
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) =>
                setNewMaterial((p) => ({ ...p, file: e.target.files?.[0] || null }))
              }
            />
          </label>
          <Input
            placeholder="Label (optional)"
            value={newMaterial.label}
            onChange={(e) => setNewMaterial((p) => ({ ...p, label: e.target.value }))}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            onClick={addMaterial}
            disabled={uploading}
            size="sm"
            className="w-full text-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Hochladen…
              </>
            ) : (
              'Hochladen & Hinzufügen'
            )}
          </Button>
        </TabsContent>

        <TabsContent value="image" className="space-y-2">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              <ImagePlus className="w-4 h-4" />
              {newMaterial.file ? newMaterial.file.name : 'Bild auswählen…'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setNewMaterial((p) => ({ ...p, file: e.target.files?.[0] || null }))
                }
              />
            </label>
            {newMaterial.file && newMaterial.file.type?.startsWith('image/') && (
              <img
                src={URL.createObjectURL(newMaterial.file)}
                alt="Vorschau"
                className="max-h-24 rounded border border-border object-contain"
              />
            )}
            {!newMaterial.file && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ClipboardPaste className="w-3 h-3" />
                Oder Bild mit <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Strg+V</kbd> einfügen
              </p>
            )}
          </div>
          <Input
            placeholder="Label (optional)"
            value={newMaterial.label}
            onChange={(e) => setNewMaterial((p) => ({ ...p, label: e.target.value }))}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            onClick={addMaterial}
            disabled={uploading}
            size="sm"
            className="w-full text-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Hochladen…
              </>
            ) : (
              'Hochladen & Hinzufügen'
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}