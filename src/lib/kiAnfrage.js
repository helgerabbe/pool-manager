import { base44 } from '@/api/base44Client';

/** Wie Core.InvokeLLM, läuft aber serverseitig über den Anthropic-Schlüssel. */
export async function kiAnfrage(params) {
  const res = await base44.functions.invoke('kiAnfrage', params);
  return res.data.ergebnis;
}