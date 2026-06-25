import { useMemo, useEffect } from 'react';

/**
 * Rendert HTML-Code in einem iframe via Blob-URL.
 * Blob-URL ermöglicht externe Script-Anfragen (GeoGebra CDN etc.),
 * was mit srcDoc nicht möglich ist.
 */
export default function HtmlIframePreview({ htmlCode, style, className }) {
  const blobUrl = useMemo(() => {
    if (!htmlCode) return null;
    const blob = new Blob([htmlCode], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [htmlCode]);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  if (!blobUrl) return null;

  return (
    <iframe
      src={blobUrl}
      className={`w-full border-0 ${className || ''}`}
      style={style}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
      title="HTML-Vorschau"
    />
  );
}