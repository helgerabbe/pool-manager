/**
 * supabaseClient.js — Singleton-Client für den Supabase-Modus.
 *
 * Wird NUR im Supabase-Build verwendet (VITE_BACKEND=supabase). Die URL und
 * der öffentliche anon-Key werden zur Build-Zeit eingebrannt:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * Der anon-Key ist bewusst öffentlich – Datenschutz wird serverseitig über
 * Row Level Security erzwungen (siehe docs/migration/supabase-schema.sql).
 */

import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabase() {
  if (!client) {
    const url = import.meta.env?.VITE_SUPABASE_URL;
    const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        'Supabase ist nicht konfiguriert: VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY müssen beim Build gesetzt sein.'
      );
    }
    client = createClient(url, anonKey);
  }
  return client;
}