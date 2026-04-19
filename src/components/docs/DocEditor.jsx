import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Pencil, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocEditor({ slug, currentContent, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(currentContent);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(currentContent);
  }, [currentContent, slug]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Prüfe ob bereits ein Datensatz für diesen slug existiert
      const existing = await base44.entities.DocContent.filter({ slug });
      if (existing.length > 0) {
        await base44.entities.DocContent.update(existing[0].id, { content: draft });
      } else {
        await base44.entities.DocContent.create({ slug, content: draft });
      }
      onSave(draft);
      setIsEditing(false);
      toast.success('Dokumentation gespeichert.');
    } catch (err) {
      toast.error('Fehler beim Speichern: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(currentContent);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(true)}
        className="gap-2"
      >
        <Pencil className="w-3.5 h-3.5" />
        Bearbeiten
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card shrink-0">
        <span className="text-sm font-semibold flex-1">Dokumentation bearbeiten: <code className="text-primary bg-muted px-1.5 py-0.5 rounded text-xs">{slug}</code></span>
        <Button variant="outline" size="sm" onClick={handleCancel} className="gap-2">
          <X className="w-3.5 h-3.5" />
          Abbrechen
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Speichern
        </Button>
      </div>

      {/* Editor */}
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="flex-1 w-full px-8 py-6 font-mono text-sm bg-background text-foreground resize-none focus:outline-none leading-relaxed"
        placeholder="Markdown-Inhalt..."
        spellCheck={false}
      />
    </div>
  );
}