import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PHASEN = [
  { id: 'Input', label: 'Erarbeitung', color: 'bg-blue-50 border-blue-200' },
  { id: 'Übung', label: 'Übung', color: 'bg-green-50 border-green-200' },
  { id: 'Abschluss', label: 'Abschluss', color: 'bg-purple-50 border-purple-200' },
];

// ──── Dynamisches Feld-Rendering ────
function DynamicField({ field, value, onChange }) {
  const baseInputClasses = 'h-9 text-sm';

  switch (field.type) {
    case 'text':
      return (
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={baseInputClasses}
        />
      );

    case 'url':
      return (
        <Input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'https://...'}
          required={field.required}
          className={baseInputClasses}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={baseInputClasses}
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className="min-h-[100px] text-sm"
        />
      );

    case 'file':
    case 'image':
    case 'audio':
      return (
        <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <input
              type="file"
              accept={
                field.type === 'image' ? 'image/*' :
                field.type === 'audio' ? 'audio/*' :
                '*'
              }
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onChange(file.name); // Speichere Dateinamen oder URL nach Upload
                }
              }}
              required={field.required}
              className="hidden"
              id={`file-${field.field_name}`}
            />
            <label
              htmlFor={`file-${field.field_name}`}
              className="text-xs text-primary cursor-pointer hover:underline"
            >
              Klicke zum Hochladen oder ziehe eine Datei hierher
            </label>
            {value && <span className="text-xs text-muted-foreground mt-2">{value}</span>}
          </div>
        </div>
      );

    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="-- Auswählen --" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'json':
      return (
        <Textarea
          value={typeof value === 'string' ? value : JSON.stringify(value || [], null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          placeholder={field.placeholder || 'JSON eingeben...'}
          className="font-mono text-xs min-h-[120px]"
        />
      );

    case 'info':
      return (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-900">{field.label}</p>
        </div>
      );

    default:
      return (
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Unbekannter Feldtyp"
          className={baseInputClasses}
        />
      );
  }
}

// ──── Phase-Container ────
function PhaseContainer({ phase, aktivitaeten, paketData, onDataChange, isDisabled, onToggleDisable }) {
  const [selectedAktivitaetId, setSelectedAktivitaetId] = useState(paketData?.selected_aktivitaet_id || '');
  const [fieldValues, setFieldValues] = useState(paketData?.field_values || {});

  const aktivitaeterFuerPhase = aktivitaeten.filter(
    (a) => a.is_active && a.phase === phase.id
  );

  const selectedAktivitaet = aktivitaeten.find((a) => a.id === selectedAktivitaetId);

  const handleActivityChange = (newId) => {
    setSelectedAktivitaetId(newId);
    setFieldValues({});
    onDataChange({
      selected_aktivitaet_id: newId,
      field_values: {},
    });
  };

  const handleFieldChange = (fieldName, value) => {
    const newValues = { ...fieldValues, [fieldName]: value };
    setFieldValues(newValues);
    onDataChange({
      selected_aktivitaet_id: selectedAktivitaetId,
      field_values: newValues,
    });
  };

  return (
    <Card className={cn('border-2 transition-all', isDisabled ? 'bg-muted/30 opacity-50' : phase.color)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {PHASEN.findIndex((p) => p.id === phase.id) + 1}
            </div>
            <CardTitle className="text-base">{phase.label}</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{isDisabled ? 'Übersprungen' : 'Aktiv'}</span>
            <Switch
              checked={!isDisabled}
              onCheckedChange={() => onToggleDisable()}
              disabled={!aktivitaeterFuerPhase.length}
            />
          </div>
        </div>
      </CardHeader>

      {!isDisabled && aktivitaeterFuerPhase.length > 0 && (
        <CardContent className="pt-0 space-y-4">
          {/* Aktivitäts-Dropdown */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Aktivität</Label>
            <Select value={selectedAktivitaetId} onValueChange={handleActivityChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Aktivität auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {aktivitaeterFuerPhase.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamische Felder */}
          {selectedAktivitaet?.form_schema && selectedAktivitaet.form_schema.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-border">
              {selectedAktivitaet.form_schema.map((field) => (
                <div key={field.field_name}>
                  {field.type !== 'info' && (
                    <Label className="text-xs font-medium mb-2 block">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                  )}
                  <DynamicField
                    field={field}
                    value={fieldValues[field.field_name]}
                    onChange={(value) => handleFieldChange(field.field_name, value)}
                  />
                </div>
              ))}
            </div>
          )}

          {selectedAktivitaet && selectedAktivitaet.form_schema?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Diese Aktivität benötigt keine weiteren Einstellungen.
            </p>
          )}
        </CardContent>
      )}

      {!isDisabled && aktivitaeterFuerPhase.length === 0 && (
        <CardContent className="text-center py-6">
          <p className="text-xs text-muted-foreground">
            Keine Aktivitäten für diese Phase verfügbar.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

// ──── Haupt-Komponente ────
export default function LernpaketDetail({ lernpaketId }) {
  const queryClient = useQueryClient();
  const [phasenData, setPhasenData] = useState({
    Input: { disabled: false, selected_aktivitaet_id: '', field_values: {} },
    Übung: { disabled: false, selected_aktivitaet_id: '', field_values: {} },
    Abschluss: { disabled: false, selected_aktivitaet_id: '', field_values: {} },
  });

  // ── Queries ──
  const { data: aktivitaeten = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const { data: lernpaket } = useQuery({
    queryKey: ['lernpaket', lernpaketId],
    queryFn: () => base44.entities.Lernpakete.get(lernpaketId),
  });

  // ── Mutation zum Speichern der Phasendaten ──
  const savePhasenData = useMutation({
    mutationFn: (data) =>
      base44.entities.Lernpakete.update(lernpaketId, {
        phasen_konfiguration: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaket', lernpaketId] });
      toast.success('Phase gespeichert');
    },
  });

  // Lade existierende Phasendaten
  useEffect(() => {
    if (lernpaket?.phasen_konfiguration) {
      setPhasenData(lernpaket.phasen_konfiguration);
    }
  }, [lernpaket]);

  const handlePhaseChange = (phaseId, data) => {
    const updated = { ...phasenData, [phaseId]: data };
    setPhasenData(updated);
  };

  const handleTogglePhase = (phaseId) => {
    const updated = {
      ...phasenData,
      [phaseId]: {
        ...phasenData[phaseId],
        disabled: !phasenData[phaseId].disabled,
      },
    };
    setPhasenData(updated);
  };

  const handleSave = () => {
    savePhasenData.mutate(phasenData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{lernpaket?.titel_des_pakets}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Konfigurieren Sie die drei Lernphasen für dieses Paket.
        </p>
      </div>

      {/* Phase-Container */}
      <div className="grid gap-6">
        {PHASEN.map((phase) => (
          <PhaseContainer
            key={phase.id}
            phase={phase}
            aktivitaeten={aktivitaeten}
            paketData={phasenData[phase.id]}
            onDataChange={(data) => handlePhaseChange(phase.id, data)}
            isDisabled={phasenData[phase.id]?.disabled || false}
            onToggleDisable={() => handleTogglePhase(phase.id)}
          />
        ))}
      </div>

      {/* Speichern-Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={savePhasenData.isPending} className="gap-2">
          {savePhasenData.isPending ? 'Speichert...' : 'Konfiguration speichern'}
        </Button>
      </div>
    </div>
  );
}