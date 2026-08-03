'use client';

import { useEffect, useState } from 'react';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';

type DriveFile = {
  id: string;
  name: string;
  mimeType: string | null;
  webViewLink?: string | null;
  thumbnailLink?: string | null;
};

type Props = {
  file: DriveFile | null;
  onClose: () => void;
};

/**
 * Modal de preview inline. Suporta:
 * - PDF / imagem → <iframe> apontando para o proxy do Drive (/api/drive/files?fileId=...)
 * - Outros tipos → iframe do Google Viewer (webViewLink)
 */
export function PreviewModal({ file, onClose }: Props) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [file, onClose]);

  if (!file) return null;

  const mime = file.mimeType ?? '';
  const isPdf = mime === 'application/pdf';
  const isImage = mime.startsWith('image/');
  const proxyUrl = `/api/drive/files?fileId=${encodeURIComponent(file.id)}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full h-full max-w-6xl flex flex-col bg-ink-950 border border-ink-700 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-800 bg-ink-900/80">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="text-sm font-semibold text-ink-100 truncate">{file.name}</h3>
            <p className="text-[10px] text-ink-500">{mime || 'arquivo'}</p>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={proxyUrl}
              download={file.name}
              className="p-2 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800"
              title="Baixar"
            >
              <Download className="h-4 w-4" />
            </a>
            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800"
                title="Abrir no Google Drive"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800"
              title="Fechar (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 relative bg-ink-950">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-ink-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {isPdf || isImage ? (
            isPdf ? (
              <iframe
                key={file.id}
                src={proxyUrl}
                title={file.name}
                className="w-full h-full"
                onLoad={() => setLoading(false)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxyUrl}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain"
                  onLoad={() => setLoading(false)}
                />
              </div>
            )
          ) : file.webViewLink ? (
            <iframe
              key={file.id}
              src={file.webViewLink}
              title={file.name}
              className="w-full h-full bg-white"
              onLoad={() => setLoading(false)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6">
              <p className="text-sm text-ink-400">Preview não disponível para este tipo de arquivo.</p>
              <a href={proxyUrl} download={file.name} className="text-sm text-vara-400 underline">
                Baixar arquivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}