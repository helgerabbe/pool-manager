/**
 * useMBKEditablePrompts.js
 *
 * Lokale Editor-States + Save-Logik für die Payload-Bausteine, die in der
 * MBK-Konsole bearbeitbar sein sollen. Schreibt direkt in MBKGlobalPrompt
 * (Single Source of Truth) — sowohl der Air-Gap-Export als auch die interne
 * MBK lesen daraus, sodass Änderungen überall sichtbar werden.
 *
 * Verwaltet vier Bausteine:
 *   - architekt_system_prompt → Schlüssel `mbk_architekt_system_prompt`
 *   - ui_css_variables        → Schlüssel `ui_css_variables`
 *   - ui_tab_bar_html         → Schlüssel `ui_tab_bar_html`
 *   - ui_default_header_html  → Schlüssel `ui_default_header_html`
 *
 * Die UI-Bausteine werden bewusst getrennt editiert (statt als ganzes
 * uiConfigPayload-JSON), weil das Payload aus drei separaten Records
 * zusammengebaut wird — es gibt keinen einzelnen "UI-Config-Datensatz".
 */
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ARCHITEKT_SYSTEM_PROMPT } from '@/lib/mbkArchitektPrompt';
import { AUFGABEN_SYSTEM_PROMPT } from '@/lib/mbkAufgabenPrompt';
import { AKTIVITAETSTYP_ANWEISUNGEN } from '@/lib/aktivitaetstypAnweisungen';

const ARCHITEKT_KEY = 'mbk_architekt_system_prompt';
const AUFGABEN_KEY = 'mbk_aufgaben_system_prompt';

const ARCHITEKT_DEFAULTS = {
  schluessel: ARCHITEKT_KEY,
  kategorie: 'systembaustein',
  anzeigename: 'Architekt – System-Prompt',
  prompt_text: ARCHITEKT_SYSTEM_PROMPT,
  ist_aktiv: true,
  sort_order: 100,
};

const AUFGABEN_DEFAULTS = {
  schluessel: AUFGABEN_KEY,
  kategorie: 'systembaustein',
  anzeigename: 'Aufgaben-Bauer – System-Prompt',
  prompt_text: AUFGABEN_SYSTEM_PROMPT,
  ist_aktiv: true,
  sort_order: 101,
};

function findBySchluessel(prompts, key) {
  return (prompts || []).find((p) => p?.schluessel === key) || null;
}

export function useMBKEditablePrompts() {
  const queryClient = useQueryClient();

  const { data: globalPrompts = [], isLoading } = useQuery({
    queryKey: ['mbk-architekt-globalprompts'],
    queryFn: () => base44.entities.MBKGlobalPrompt.list('-created_date', 200),
    staleTime: 60_000,
  });

  // Architekt-Override: existiert er schon? Falls nicht, fallback auf das
  // Konstanten-File aus lib/mbkArchitektPrompt.js.
  const architektRecord = findBySchluessel(globalPrompts, ARCHITEKT_KEY);
  const architektStored = architektRecord?.prompt_text || ARCHITEKT_SYSTEM_PROMPT;

  // Aufgaben-Bauer-Override (analog zum Architekten).
  const aufgabenRecord = findBySchluessel(globalPrompts, AUFGABEN_KEY);
  const aufgabenStored = aufgabenRecord?.prompt_text || AUFGABEN_SYSTEM_PROMPT;

  const cssStored = findBySchluessel(globalPrompts, 'ui_css_variables')?.prompt_text || '';
  const tabBarStored = findBySchluessel(globalPrompts, 'ui_tab_bar_html')?.prompt_text || '';
  const headerStored = findBySchluessel(globalPrompts, 'ui_default_header_html')?.prompt_text || '';

  // Aktivitätstyp-spezifische Anweisungen (Kategorie 'aktivitaetstyp').
  // Wir bauen pro bekanntem Typ aus dem Katalog einen eigenen Edit-State.
  // Falls der DB-Record (noch) nicht existiert, gilt der Code-Default als
  // gespeicherter Stand — beim ersten Save wird der Record automatisch
  // angelegt.
  const aktivitaetstypStored = React.useMemo(() => {
    const m = {};
    for (const entry of AKTIVITAETSTYP_ANWEISUNGEN) {
      const rec = findBySchluessel(globalPrompts, entry.schluessel);
      m[entry.schluessel] = rec?.prompt_text ?? entry.prompt_text;
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPrompts]);
  const aktivitaetstypStoredKey = JSON.stringify(aktivitaetstypStored);

  // Lokale Editor-Zustände.
  const [draftArchitekt, setDraftArchitekt] = React.useState(architektStored);
  const [draftAufgaben, setDraftAufgaben] = React.useState(aufgabenStored);
  const [draftCss, setDraftCss] = React.useState(cssStored);
  const [draftTabBar, setDraftTabBar] = React.useState(tabBarStored);
  const [draftHeader, setDraftHeader] = React.useState(headerStored);
  const [draftAktivitaetstyp, setDraftAktivitaetstyp] = React.useState(aktivitaetstypStored);
  const [savingKey, setSavingKey] = React.useState(null);

  // Wenn DB-Daten reinkommen, lokale Zustände initialisieren / synchronisieren.
  React.useEffect(() => {
    setDraftArchitekt(architektStored);
    setDraftAufgaben(aufgabenStored);
    setDraftCss(cssStored);
    setDraftTabBar(tabBarStored);
    setDraftHeader(headerStored);
    setDraftAktivitaetstyp(aktivitaetstypStored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [architektStored, aufgabenStored, cssStored, tabBarStored, headerStored, aktivitaetstypStoredKey]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['mbk-architekt-globalprompts'] });
    queryClient.invalidateQueries({ queryKey: ['mbkGlobalPrompts'] });
  };

  // Update via existierende Backend-Function. Wenn der Architekt-Datensatz
  // noch nicht existiert, legen wir ihn einmalig direkt über die Entity an.
  const saveArchitekt = async () => {
    setSavingKey('architekt');
    try {
      if (!architektRecord?.id) {
        await base44.entities.MBKGlobalPrompt.create({
          ...ARCHITEKT_DEFAULTS,
          prompt_text: draftArchitekt,
        });
      } else {
        const res = await base44.functions.invoke('updateMBKGlobalPromptSecure', {
          id: architektRecord.id, prompt_text: draftArchitekt,
        });
        if (!res?.data?.ok) throw new Error(res?.data?.error || 'Update fehlgeschlagen.');
      }
      toast.success('Master-System-Prompt gespeichert.');
      invalidateAll();
    } catch (err) {
      toast.error(err?.message || 'Speichern fehlgeschlagen.');
      throw err;
    } finally {
      setSavingKey(null);
    }
  };

  // Aufgaben-Bauer speichern (Pattern wie Architekt: bei fehlendem Record
  // einmalig anlegen, sonst Update über updateMBKGlobalPromptSecure).
  const saveAufgaben = async () => {
    setSavingKey('aufgaben');
    try {
      if (!aufgabenRecord?.id) {
        await base44.entities.MBKGlobalPrompt.create({
          ...AUFGABEN_DEFAULTS,
          prompt_text: draftAufgaben,
        });
      } else {
        const res = await base44.functions.invoke('updateMBKGlobalPromptSecure', {
          id: aufgabenRecord.id, prompt_text: draftAufgaben,
        });
        if (!res?.data?.ok) throw new Error(res?.data?.error || 'Update fehlgeschlagen.');
      }
      toast.success('Master-System-Prompt (Aufgaben-Bauer) gespeichert.');
      invalidateAll();
    } catch (err) {
      toast.error(err?.message || 'Speichern fehlgeschlagen.');
      throw err;
    } finally {
      setSavingKey(null);
    }
  };

  const saveUiBlock = async (schluessel, draft, label) => {
    const rec = findBySchluessel(globalPrompts, schluessel);
    if (!rec?.id) {
      toast.error(`${label} existiert noch nicht in der DB. Bitte zuerst im Prompt-Manager anlegen.`);
      throw new Error('not found');
    }
    setSavingKey(schluessel);
    try {
      const res = await base44.functions.invoke('updateMBKGlobalPromptSecure', {
        id: rec.id, prompt_text: draft,
      });
      if (!res?.data?.ok) throw new Error(res?.data?.error || 'Update fehlgeschlagen.');
      toast.success(`${label} gespeichert.`);
      invalidateAll();
    } catch (err) {
      toast.error(err?.message || 'Speichern fehlgeschlagen.');
      throw err;
    } finally {
      setSavingKey(null);
    }
  };

  // Speichert eine Aktivitätstyp-Anweisung. Wenn der Record noch nicht
  // existiert, legen wir ihn auf Basis des Code-Defaults an — analog
  // zum Pattern bei Architekt/Aufgaben.
  const saveAktivitaetstyp = async (schluessel) => {
    const entry = AKTIVITAETSTYP_ANWEISUNGEN.find((e) => e.schluessel === schluessel);
    if (!entry) throw new Error(`Unbekannter Aktivitätstyp-Schlüssel: ${schluessel}`);
    const draft = draftAktivitaetstyp[schluessel] ?? entry.prompt_text;
    const rec = findBySchluessel(globalPrompts, schluessel);
    setSavingKey(schluessel);
    try {
      if (!rec?.id) {
        await base44.entities.MBKGlobalPrompt.create({
          kategorie: 'aktivitaetstyp',
          schluessel: entry.schluessel,
          anzeigename: entry.anzeigename,
          prompt_text: draft,
          ist_aktiv: true,
          sort_order: entry.sort_order || 300,
        });
      } else {
        const res = await base44.functions.invoke('updateMBKGlobalPromptSecure', {
          id: rec.id, prompt_text: draft,
        });
        if (!res?.data?.ok) throw new Error(res?.data?.error || 'Update fehlgeschlagen.');
      }
      toast.success(`${entry.anzeigename} gespeichert.`);
      invalidateAll();
    } catch (err) {
      toast.error(err?.message || 'Speichern fehlgeschlagen.');
      throw err;
    } finally {
      setSavingKey(null);
    }
  };

  return {
    isLoading,
    architekt: {
      value: draftArchitekt,
      stored: architektStored,
      dirty: draftArchitekt !== architektStored,
      saving: savingKey === 'architekt',
      onChange: setDraftArchitekt,
      onSave: saveArchitekt,
      onReset: () => setDraftArchitekt(architektStored),
    },
    aufgaben: {
      value: draftAufgaben,
      stored: aufgabenStored,
      dirty: draftAufgaben !== aufgabenStored,
      saving: savingKey === 'aufgaben',
      onChange: setDraftAufgaben,
      onSave: saveAufgaben,
      onReset: () => setDraftAufgaben(aufgabenStored),
    },
    uiCss: {
      value: draftCss,
      stored: cssStored,
      dirty: draftCss !== cssStored,
      saving: savingKey === 'ui_css_variables',
      onChange: setDraftCss,
      onSave: () => saveUiBlock('ui_css_variables', draftCss, 'CSS-Variablen'),
      onReset: () => setDraftCss(cssStored),
    },
    uiTabBar: {
      value: draftTabBar,
      stored: tabBarStored,
      dirty: draftTabBar !== tabBarStored,
      saving: savingKey === 'ui_tab_bar_html',
      onChange: setDraftTabBar,
      onSave: () => saveUiBlock('ui_tab_bar_html', draftTabBar, 'Tab-Bar HTML'),
      onReset: () => setDraftTabBar(tabBarStored),
    },
    uiHeader: {
      value: draftHeader,
      stored: headerStored,
      dirty: draftHeader !== headerStored,
      saving: savingKey === 'ui_default_header_html',
      onChange: setDraftHeader,
      onSave: () => saveUiBlock('ui_default_header_html', draftHeader, 'Header-Template'),
      onReset: () => setDraftHeader(headerStored),
    },
    /**
     * Liste der Aktivitätstyp-Edit-Bundles (eines pro Eintrag im
     * Katalog). Das AufgabenTab kann darüber iterieren und für jeden
     * Typ einen eigenen editierbaren Block im Payloads-Dialog rendern.
     */
    aktivitaetstypen: AKTIVITAETSTYP_ANWEISUNGEN.map((entry) => ({
      schluessel: entry.schluessel,
      anzeigename: entry.anzeigename,
      aktivitaet_name: entry.aktivitaet_name,
      value: draftAktivitaetstyp[entry.schluessel] ?? entry.prompt_text,
      stored: aktivitaetstypStored[entry.schluessel] ?? entry.prompt_text,
      dirty: (draftAktivitaetstyp[entry.schluessel] ?? entry.prompt_text)
        !== (aktivitaetstypStored[entry.schluessel] ?? entry.prompt_text),
      saving: savingKey === entry.schluessel,
      onChange: (v) => setDraftAktivitaetstyp((prev) => ({ ...prev, [entry.schluessel]: v })),
      onSave: () => saveAktivitaetstyp(entry.schluessel),
      onReset: () => setDraftAktivitaetstyp((prev) => ({
        ...prev,
        [entry.schluessel]: aktivitaetstypStored[entry.schluessel] ?? entry.prompt_text,
      })),
    })),
  };
}