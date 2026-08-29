import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Upload, Link2, Type, Trash2, Loader2, FileText, Image as ImageIcon,
  File as FileIcon, Clipboard,
} from 'lucide-react';

/**
 * MaterialSammlung
 * ────────────────
 * Der Materialbereich der Aufgabenwerkstatt: alles, was die Lehrkraft schon
 * hat, bevor die Aufgabe existiert — ein Foto einer Buchseite, ein PDF, ein
 * Link, ein eingefügter Text.
 *
 * Gespeichert wird in `AllgemeineAufgabe.materialien[]` (Feld existiert seit
 * 2026-08-22, um 'link' erweitert am 2026-08-29). Ein Eintrag ist
 * { type, label, content, url }.
 *
 * Die Sammlung darf leer bleiben. Sie ist ein Angebot, keine Pflichtstation.
 *
 * Bilder lassen sich direkt aus der Zwischenablage einfügen — Strg+V mit
 * einem Screenshot im Puffer, während der Kasten offen ist. Das ist für
 * Buchseiten-Fotos der schnellste Weg und deshalb auch beschriftet.
 */

const TYP_ICONS = {
  image: ImageIcon,
  pdf: FileIcon,
  link: Link2,
  free_text: Type,
  book_ref: FileText,
};

const TYP_LABELS = {
  image: 'Bild',
  pdf: 'PDF',
  link: 'Link',
  free_text: 'Text',
  book_ref: 'Buchverweis',
};

/** Rät den Materialtyp aus dem Dateinamen. */
function typAusDatei(file) {
  if (file?.type?.startsWith('image/')) return 'image';
  if (file?.type === 'application/pdf') return 'pdf';
  return 'pdf'; // Doc/Docx/Txt laufen als Dokument mit; url trägt die Datei.
}

export default function MaterialSammlung({ materialien = [], onChange, disabled = false }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [linkEingabe, setLinkEingabe] = useState('');
  const [textEingabe, setTextEingabe] = useState('');
  const [textOffen, setTextOffen] = useState(false);

  const hinzufuegen = (eintrag) => onChange([...(materialien || []), eintrag]);
  const entfernen = (i) => onChange((materialien || []).filter((_, idx) => idx !== i));

  const upload = async (file) => {
    if (!file || disabled) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      hinzufuegen({
        type: typAusDatei(file),
        label: file.name || 'Material',
        content: '',
        url: file_url,
      });
      toast.success('Material hinzugefügt.');
    } catch (err) {
      toast.error(err?.message || 'Datei konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    for (const item of e.clipboardData?.items || []) {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); upload(file); return; }
      }
    }
  };

  const linkHinzufuegen = () => {
    const url = linkEingabe.trim();
    if (!url) return;
    hinzufuegen({ type: 'link', label: url.replace(/^https?:\/\//, '').slice(0, 60), content: '', url });
    setLinkEingabe('');
  };

  const textHinzufuegen = () => {
    const text = textEingabe.trim();
    if (!text) return;
    hinzufuegen({
      type: 'free_text',
      label: text.split('\n')[0].slice(0, 60) || 'Eingefügter Text',
      content: text,
      url: '',
    });
    setTextEingabe('');
    setTextOffen(false);
  };

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      {/* Liste */}
      {materialien.length > 0 && (
        <ul className="space-y-1.5">
          {materialien.map((m, i) => {
            const Icon = TYP_ICONS[m.type] || FileIcon;
            return (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{m.label || TYP_LABELS[m.type] || 'Material'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {TYP_LABELS[m.type] || m.type}
                    {m.type === 'free_text' && m.content ? ` · ${m.content.length} Zeichen` : ''}
                  </p>
                </div>
                {m.url && (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline shrink-0"
                  >
                    ansehen
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => entfernen(i)}
                  disabled={disabled}
                  className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 shrink-0 disabled:opacity-40"
                  title="Entfernen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Hinzufügen */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,.txt,.md,.doc,.docx,.rtf"
          onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Datei oder Foto
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled}
          onClick={() => setTextOffen((o) => !o)}
        >
          <Type className="w-4 h-4" /> Text einfügen
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={linkEingabe}
          onChange={(e) => setLinkEingabe(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); linkHinzufuegen(); } }}
          placeholder="… oder einen Link einfügen (https://…)"
          disabled={disabled}
          className="text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !linkEingabe.trim()}
          onClick={linkHinzufuegen}
        >
          <Link2 className="w-4 h-4" />
        </Button>
      </div>

      {textOffen && (
        <div className="space-y-2">
          <Textarea
            value={textEingabe}
            onChange={(e) => setTextEingabe(e.target.value)}
            placeholder="Text hier einfügen — z. B. eine Quelle, einen Auszug, eine Aufgabenstellung aus dem Buch …"
            className="min-h-[110px] text-sm"
            disabled={disabled}
          />
          <Button type="button" size="sm" onClick={textHinzufuegen} disabled={disabled || !textEingabe.trim()}>
            Text übernehmen
          </Button>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clipboard className="w-3 h-3 shrink-0" />
        Ein Screenshot im Zwischenspeicher lässt sich hier direkt mit Strg&nbsp;+&nbsp;V einfügen.
      </p>
    </div>
  );
}
