import { useState, useEffect } from 'react';
import { storageService } from '@/services/storageService';

/**
 * Hook zur asynchronen Auflösung von privaten Base44-URIs in signierte URLs.
 *
 * - Public URLs (http/https) und Legacy-Werte (z.B. Base64) werden direkt durchgereicht.
 * - Private URIs (`private://...`) werden via storageService.getUrl in eine temporär
 *   signierte URL umgewandelt.
 *
 * @param {string|null|undefined} uriOrUrl
 * @returns {{ url: string|null, isLoading: boolean, error: Error|null }}
 */
export function useSignedUrl(uriOrUrl) {
  const [url, setUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUrl() {
      if (!uriOrUrl) {
        setUrl(null);
        return;
      }

      // Wenn es schon eine normale http/https URL oder Base64 (Legacy) ist, direkt setzen
      if (!uriOrUrl.startsWith('private://')) {
        setUrl(uriOrUrl);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const signed = await storageService.getUrl(uriOrUrl);
        if (isMounted) {
          setUrl(signed);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          setUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [uriOrUrl]);

  return { url, isLoading, error };
}