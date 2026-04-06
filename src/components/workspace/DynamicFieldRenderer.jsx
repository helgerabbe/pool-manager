import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, AlertCircle, Upload, FileText, X, Pencil, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Inline-editierbares Feld mit Standardtext-Anzeige
function DefaultTextareaField({ field, value, onChange, defaultText }) {
  const [editing, setEditing] = useState(false);
  const displayValue = value || defaultText;
  const isDefault = !value;

  if (!editing) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Pencil className="w-3 h-3" />
            {isDefault ? 'Anpassen' : 'Bearbeiten'}
          </button>
        </div>
        <div
          className={`rounded-lg border px-3 py-2 text-sm cursor-pointer hover:border-primary/50 transition-colors ${
            isDefault
              ? 'bg-blue-50 border-blue-200 text-blue-800 italic'
              : 'bg-muted/40 border-border text-foreground'
          }`}
          onClick={() => setEditing(true)}
        >
          {isDefault && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 block mb-0.5 not-italic">
              Standardtext
            </span>
          )}
          {displayValue}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2">
          {isDefault && (
            <button
              onClick={() => { onChange(''); setEditing(false); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Standardtext wiederherstellen
            </button>
          )}
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Check className="w-3 h-3" />
            Fertig
          </button>
        </div>
      </div>
      <Textarea
        value={value || defaultText}
        onChange={(e) => {
          const newVal = e.target.value;
          // Wenn identisch mit Standardtext → als leer speichern (damit Standardtext greift)
          onChange(newVal === defaultText ? '' : newVal);
        }}
        rows={4}
        className="text-sm"
        autoFocus
      />
    </div>
  );
}

// JSON List-Builder für komplexe Datentypen
function JsonListBuilder({ value, onChange, label, placeholder }) {
  const [inputValue, setInputValue] = useState('');
  const items = Array.isArray(value) ? value : [];

  const handleAddItem = () => {
    if (!inputValue.trim()) {
      toast.error('Bitte geben Sie einen Wert ein');
      return;
    }
    try {
      // Versuche, den Input als JSON zu parsen
      let parsedItem;
      try {
        parsedItem = JSON.parse(inputValue);
      } catch {
        // Falls nicht möglich, behandle es als String
        parsedItem = inputValue;
      }
      onChange([...items, parsedItem]);
      setInputValue('');
    } catch (err) {
      toast.error('Fehler beim Hinzufügen: ' + err.message);
    }
  };

  const handleRemoveItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder || 'z.B. {"frage": "...", "antwort": "..."}'}
            className="flex-1 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddItem();
              }
            }}
          />
          <Button
            onClick={handleAddItem}
            size="sm"
            variant="outline"
            className="gap-1"
          >
            <Plus className="w-3 h-3" />
            Hinzufügen
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/50 border border-border flex items-start justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <code className="text-xs text-muted-foreground break-all">
                  {typeof item === 'object' ? JSON.stringify(item) : item}
                </code>
              </div>
              <button
                onClick={() => handleRemoveItem(idx)}
                className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Multiselect für Lernziele/Kategorien
function MultiSelectField({ value, onChange, label, options }) {
  const selectedItems = Array.isArray(value) ? value : [];

  const handleToggle = (optionId) => {
    if (selectedItems.includes(optionId)) {
      onChange(selectedItems.filter((id) => id !== optionId));
    } else {
      onChange([...selectedItems, optionId]);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="space-y-2 max-h-56 overflow-y-auto p-2 rounded-lg border border-border bg-muted/30">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Keine Optionen verfügbar</p>
        ) : (
          options.map((option) => (
            <div key={option.id} className="flex items-start gap-2">
              <Checkbox
                id={option.id}
                checked={selectedItems.includes(option.id)}
                onCheckedChange={() => handleToggle(option.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={option.id}
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  {option.label}
                </label>
                {option.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// File-Upload Handler (nutzt Base44 SDK)
function FileField({ value, onChange, label, required, accept }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success(`"${file.name}" hochgeladen.`);
    } catch (err) {
      toast.error('Upload-Fehler: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`file-${label}`} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {value ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50">
          <FileText className="w-4 h-4 text-green-700 shrink-0" />
          <span className="text-xs text-green-700 flex-1 truncate">Dokument hochgeladen</span>
          <button onClick={() => onChange('')} className="text-muted-foreground hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className={`flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}>
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground text-center">
            {isUploading ? 'Wird hochgeladen…' : 'PDF oder Word-Dokument auswählen'}
          </span>
          <input
            type="file"
            accept={accept || '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

// Haupt-Renderer
export default function DynamicFieldRenderer({
  formSchema,
  metaData,
  onMetaDataChange,
  multiSelectOptions,
}) {
  if (!formSchema || formSchema.length === 0) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <AlertCircle className="h-4 w-4 text-green-700" />
        <AlertDescription className="text-green-700">
          Diese Aktivität benötigt keine weitere Konfiguration.
        </AlertDescription>
      </Alert>
    );
  }

  // Bedingte Anzeige: inhalt nur wenn inhalt_typ === 'text', dokument_url nur wenn 'datei'
  const inhaltTyp = metaData?.inhalt_typ;
  const hasInhaltTypControl = formSchema.some(f => f.field_name === 'inhalt_typ');

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/40 border border-border">
      {formSchema.map((field) => {
        // Bedingte Felder ausblenden je nach inhalt_typ
        if (hasInhaltTypControl) {
          if (field.field_name === 'inhalt' && inhaltTyp !== 'text') return null;
          if (field.field_name === 'dokument_url' && inhaltTyp !== 'datei') return null;
        }

        const fieldValue = metaData?.[field.field_name] ?? '';
        const isRequired = field.required ?? false;

        return (
          <div key={field.field_name} className="space-y-2">
            {/* TEXT */}
            {field.type === 'text' && (
              <>
                <Label htmlFor={field.field_name} className="text-sm font-medium">
                  {field.label}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.field_name}
                  type="text"
                  value={fieldValue}
                  onChange={(e) => onMetaDataChange(field.field_name, e.target.value)}
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              </>
            )}

            {/* SELECT */}
            {field.type === 'select' && (
              <>
                <Label className="text-sm font-medium">
                  {field.label}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Select
                  value={fieldValue}
                  onValueChange={(val) => onMetaDataChange(field.field_name, val)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Bitte wählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options || []).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {/* TEXTAREA – mit optionalem Standardtext */}
            {field.type === 'textarea' && (
              field.default_text ? (
                <DefaultTextareaField
                  field={field}
                  value={fieldValue}
                  onChange={(val) => onMetaDataChange(field.field_name, val)}
                  defaultText={field.default_text}
                />
              ) : (
                <>
                  <Label htmlFor={field.field_name} className="text-sm font-medium">
                    {field.label}
                    {isRequired && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Textarea
                    id={field.field_name}
                    value={fieldValue}
                    onChange={(e) => onMetaDataChange(field.field_name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={6}
                    className="text-sm"
                  />
                </>
              )
            )}

            {/* URL */}
            {field.type === 'url' && (
              <>
                <Label htmlFor={field.field_name} className="text-sm font-medium">
                  {field.label}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.field_name}
                  type="url"
                  value={fieldValue}
                  onChange={(e) => onMetaDataChange(field.field_name, e.target.value)}
                  placeholder={field.placeholder || 'https://example.com'}
                  className="text-sm"
                />
              </>
            )}

            {/* FILE / IMAGE / AUDIO */}
            {(field.type === 'file' || field.type === 'image' || field.type === 'audio') && (
              <FileField
                value={fieldValue}
                onChange={(value) => onMetaDataChange(field.field_name, value)}
                label={field.label}
                required={isRequired}
                accept={field.type === 'image' ? 'image/*' : field.type === 'audio' ? 'audio/*' : undefined}
              />
            )}

            {/* JSON */}
            {field.type === 'json' && (
              <JsonListBuilder
                value={fieldValue}
                onChange={(value) => onMetaDataChange(field.field_name, value)}
                label={field.label}
                placeholder={field.placeholder}
              />
            )}

            {/* MULTISELECT */}
            {field.type === 'multiselect' && (
              <MultiSelectField
                value={fieldValue}
                onChange={(value) => onMetaDataChange(field.field_name, value)}
                label={field.label}
                options={multiSelectOptions || []}
              />
            )}

            {/* INFO */}
            {field.type === 'info' && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-700" />
                <AlertDescription className="text-blue-700 text-sm">
                  {field.label}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      })}
    </div>
  );
}