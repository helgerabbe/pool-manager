import { base44 } from '@/api/base44Client';

/**
 * Zentraler Adapter für alle Dateioperationen gegen den Base44 File Storage.
 * Enthält bewusst KEINE UI-Logik – diese gehört in die Komponenten / Hooks.
 */
export const storageService = {
  /**
   * Lädt eine Datei in den Base44 Storage hoch.
   * @param {File} file - Das File-Objekt aus dem Input.
   * @param {boolean} isPrivate - True für geschützte Dateien, False für öffentliche (Bilder etc.)
   * @returns {Promise<string>} Public URL oder Private URI ('private://...')
   */
  async upload(file, isPrivate = false) {
    try {
      if (isPrivate) {
        return await base44.integrations.Core.UploadPrivateFile(file);
      }
      return await base44.integrations.Core.UploadFile(file);
    } catch (error) {
      console.error('[StorageService] Upload fehlgeschlagen:', error);
      throw new Error('Datei konnte nicht hochgeladen werden.');
    }
  },

  /**
   * Löst eine URI in eine temporär signierte URL auf, oder gibt public URLs direkt zurück.
   * @param {string} uriOrUrl
   * @returns {Promise<string|null>}
   */
  async getUrl(uriOrUrl) {
    if (!uriOrUrl) return null;

    // Prüfen, ob es sich um eine private Base44 URI handelt
    if (uriOrUrl.startsWith('private://')) {
      try {
        return await base44.integrations.Core.CreateFileSignedUrl(uriOrUrl);
      } catch (error) {
        console.error('[StorageService] Signierte URL konnte nicht generiert werden:', error);
        return null;
      }
    }

    // Wenn es bereits eine public URL ist, einfach durchreichen
    return uriOrUrl;
  },
};