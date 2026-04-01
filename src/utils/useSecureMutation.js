/**
 * useSecureMutation.js
 * 
 * Universal Hook für sichere Operationen (Create, Update, Delete) mit:
 * - Active-Rejection: Buttons bleiben sichtbar/klickbar
 * - Einheitliches Toast-Feedback bei 403/Fehler
 * - Keine Optimistic Updates – nur onSuccess nach Backend-Bestätigung
 * 
 * Usage:
 * const mutation = useSecureMutation({
 *   mutationFn: (data) => secureApi.updateEinheit(id, data),
 *   onSuccess: () => { ... },
 *   operationName: 'Einheit aktualisieren',
 * });
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useSecureMutation({
  mutationFn,
  onSuccess,
  onError,
  operationName = 'Operation',
  invalidateQueries = [],
  showSuccessToast = true,
  successMessage,
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    // ✅ onSuccess: Nur hier ändern wir die UI/Cache
    onSuccess: async (data, variables, context) => {
      // Invalidate React Query caches
      for (const queryKey of invalidateQueries) {
        await queryClient.invalidateQueries({ queryKey });
      }

      // Show success toast if enabled
      if (showSuccessToast) {
        toast.success(successMessage || `${operationName} erfolgreich.`);
      }

      // Custom callback
      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },

    // ❌ onError: Nur Toast + keine UI-Änderung
    onError: (error, variables, context) => {
      // Extract error message from SecureApiError or generic error
      let errorMessage = error.message || 'Ein Fehler ist aufgetreten.';

      // If it's a SecureApiError with context, use the message directly
      // (which comes from backend: "Cannot create unit for subject: Deutsch")
      if (error.isForbidden && error.isForbidden()) {
        // 403 Forbidden – RBAC denied
        toast.error(`Keine Berechtigung: ${errorMessage}`, {
          description: `${operationName} konnte nicht durchgeführt werden.`,
          duration: 5000,
        });
      } else if (error.isNotFound && error.isNotFound()) {
        // 404 Not Found
        toast.error(`Nicht gefunden: ${errorMessage}`, {
          duration: 4000,
        });
      } else if (error.isUnauthorized && error.isUnauthorized()) {
        // 401 Unauthorized
        toast.error('Authentifizierung erforderlich. Bitte melden Sie sich an.', {
          duration: 5000,
        });
      } else {
        // Generic error
        toast.error(`Fehler beim ${operationName.toLowerCase()}: ${errorMessage}`, {
          duration: 4000,
        });
      }

      // Custom error callback if provided
      if (onError) {
        onError(error, variables, context);
      }
    },
  });
}