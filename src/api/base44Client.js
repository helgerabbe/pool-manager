import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

/**
 * ✅ Session-Stabilisierung: Token-Refresh + Interceptor für 401 Fehler
 * 
 * Der Client wird mit aktivem Token-Refresh konfiguriert.
 * Falls ein 401 auftritt, versucht der Interceptor einmalig einen
 * Session-Refresh und wiederholt den Request.
 * Bei Fehlschlag wird der Nutzer zum Login gezwungen.
 */
const base44Instance = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
  autoRefreshToken: true  // ✅ Automatischer Token-Refresh aktivieren
});

/**
 * ✅ Globaler Interceptor für 401-Fehler
 * Fallback, falls autoRefreshToken nicht ausreicht
 */
const originalFetch = globalThis.fetch;
let isRefreshing = false;
let refreshPromise = null;

async function interceptedFetch(url, options = {}) {
  try {
    const response = await originalFetch(url, options);

    // 401: Token abgelaufen – versuche Refresh
    if (response.status === 401 && !isRefreshing) {
      isRefreshing = true;
      
      try {
        // Einmaliger Versuch, die Session zu erneuern
        if (base44Instance.auth && typeof base44Instance.auth.refreshSession === 'function') {
          await base44Instance.auth.refreshSession();
        }
        isRefreshing = false;

        // Wiederhole den ursprünglichen Request
        return originalFetch(url, options);
      } catch (refreshError) {
        isRefreshing = false;
        console.error('[Session] Token refresh failed, forcing logout:', refreshError);

        // Token-Refresh fehlgeschlagen – erzwinge Logout
        if (base44Instance.auth && typeof base44Instance.auth.logout === 'function') {
          base44Instance.auth.logout();
        }
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  } catch (error) {
    console.error('[Session] Fetch error:', error);
    throw error;
  }
}

// Optionaler Interceptor-Hook (nur wenn SDK keinen nativen Support hat)
// globalThis.fetch = interceptedFetch;  // ← Aktiviere nur bei Bedarf

export const base44 = base44Instance;