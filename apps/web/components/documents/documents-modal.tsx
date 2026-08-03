'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Upload, FileText, Folder, Trash2, Download, ChevronRight, Loader2, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { useUploads, type UploadItem } from '@/components/uploads/upload-context';
import { PreviewModal } from './preview-modal';

type DriveFile = {
  id: string;
  name: string;
  mimeType: string | null;
  size?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
  webViewLink?: string | null;
  thumbnailLink?: string | null;
  iconLink?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Path inicial dentro do Drive (relativo à raiz do tenant) */
  initialPath?: string;
  /** Label exibido no breadcrumb (ex.: "Marina Costa Lima") */
  scopeLabel?: string;
};

const FOLDER_MIME = 'application/vnd.google-apps.folder';

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/': '🖼️',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.ms-excel': '📊',
  'text/': '📄',
};

function fileIcon(mt: string | null | undefined): string {
  if (!mt) return '📎';
  for (const [k, v] of Object.entries(FILE_ICONS)) {
    if (mt.startsWith(k)) return v;
  }
  return '📎';
}

function formatSize(s: string | null | undefined): string {
  if (!s) return '—';
  const n = parseInt(s, 10);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * Faz o upload via XHR para ter acesso a progresso real.
 * Atualiza o item no store conforme o upload avança.
 */
function runUpload(
  item: UploadItem,
  update: (patch: Partial<UploadItem>) => void,
  folderPath: string,
  onDone: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('folderPath', folderPath);
    fd.append('file', item.file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/drive/files', true);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) update({ bytesSent: e.loaded });
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        update({ status: 'done', bytesSent: item.file.size });
        onDone();
        resolve();
      } else {
        let msg = `HTTP ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.error) msg = body.error;
        } catch { /* noop */ }
        update({ status: 'error', error: msg });
        reject(new Error(msg));
      }
    });
    xhr.addEventListener('error', () => {
      update({ status: 'error', error: 'Erro de rede' });
      reject(new Error('Erro de rede'));
    });
    xhr.addEventListener('abort', () => {
      update({ status: 'cancelled' });
      reject(new Error('Cancelado'));
    });
    xhr.send(fd);
  });
}

export function DocumentsModal({ open, onClose, initialPath = '', scopeLabel }: Props) {
  const { enqueueAndStart, totalInProgress, registerModal, clearDone } = useUploads();
  const [path, setPath] = useState<string[]>(initialPath ? initialPath.split('/').filter(Boolean) : []);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pathStr = path.join('/');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/drive/folders?path=${encodeURIComponent(pathStr)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao listar');
        setFiles([]);
        return;
      }
      setFiles(data.files ?? []);
    } catch {
      setError('Erro de rede');
    } finally {
      setLoading(false);
    }
  }, [pathStr]);

  useEffect(() => {
    if (open) fetchFiles();
  }, [open, fetchFiles]);

  // Registra/desregistra modal aberto para esconder o upload sheet.
  // Também limpa uploads concluídos ao abrir, para que o sheet não cubra o botão Upload.
  useEffect(() => {
    if (!open) return;
    const unregister = registerModal();
    clearDone();
    return unregister;
  }, [open, registerModal, clearDone]);

  // Bloqueia scroll do body quando modal aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function uploadFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    enqueueAndStart(arr, (item, update) => runUpload(item, update, pathStr, fetchFiles));
  }

  function openFolder(fileId: string) {
    const target = files.find((f) => f.id === fileId);
    if (!target) return;
    setPath((p) => [...p, target.name]);
  }

  function goToCrumb(idx: number) {
    if (idx === -1) setPath([]);
    else setPath((p) => p.slice(0, idx + 1));
  }

  async function deleteFile(fileId: string, name: string) {
    if (!confirm(`Apagar "${name}"?`)) return;
    try {
      await fetch(`/api/drive/files?fileId=${encodeURIComponent(fileId)}`, { method: 'DELETE' });
      fetchFiles();
    } catch {
      setError('Erro ao apagar');
    }
  }

  function downloadFile(fileId: string, name: string) {
    const a = document.createElement('a');
    a.href = `/api/drive/files?fileId=${encodeURIComponent(fileId)}`;
    a.download = name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (!open) return null;

  const folders = files.filter((f) => f.mimeType === FOLDER_MIME);
  const docs = files.filter((f) => f.mimeType !== FOLDER_MIME);
  const filtered = (kind: 'folders' | 'docs', list: DriveFile[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((f) => f.name.toLowerCase().includes(q));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl h-[80vh] flex flex-col bg-ink-950 border border-ink-700 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-800">
          <div className="flex items-center gap-2">
            <h2 className="vf-heading text-base font-semibold text-ink-50">
              Documentos {scopeLabel ? `· ${scopeLabel}` : ''}
            </h2>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-ink-800 bg-ink-900/40">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs text-ink-400 flex-1 min-w-0">
            <button onClick={() => goToCrumb(-1)} className="hover:text-ink-100 shrink-0">
              Juris-Flow
            </button>
            {path.map((seg, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3 w-3 shrink-0" />
                <button
                  onClick={() => goToCrumb(i)}
                  className="hover:text-ink-100 truncate"
                  title={seg}
                >
                  {seg}
                </button>
              </span>
            ))}
          </nav>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="rounded-md border border-ink-700 bg-ink-900 pl-7 pr-2 py-1 text-xs text-ink-200 w-40 focus:border-vara-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Body (drop zone) */}
        <div
          className={clsx(
            'flex-1 overflow-y-auto px-5 py-4 transition-colors',
            isDragOver && 'bg-vara-950/40',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
          }}
        >
          {error && (
            <div className="mb-3 rounded-md border border-prazo-700 bg-prazo-950/40 px-3 py-2 text-xs text-prazo-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-40 text-ink-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Upload className="h-10 w-10 text-ink-700 mb-3" />
              <p className="text-sm text-ink-400">Arraste arquivos aqui ou</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-sm text-vara-400 hover:text-vara-300 underline"
              >
                clique para selecionar
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered('folders', folders).map((f) => (
                <FolderRow key={f.id} file={f} onOpen={() => openFolder(f.id)} />
              ))}
              {filtered('docs', docs).map((f) => (
                <FileRow
                  key={f.id}
                  file={f}
                  onPreview={() => setPreviewFile(f)}
                  onDownload={() => downloadFile(f.id, f.name)}
                  onDelete={() => deleteFile(f.id, f.name)}
                />
              ))}
              {search && folders.length === 0 && docs.length === 0 && (
                <p className="text-center text-ink-500 text-sm py-6">Nada encontrado para "{search}".</p>
              )}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-ink-800 bg-ink-900/40 text-xs text-ink-400">
          <span>
            {docs.length} arquivo(s), {folders.length} pasta(s)
            {totalInProgress > 0 && ` · enviando ${totalInProgress} (veja após fechar)`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md bg-vara-700 px-3 py-1.5 text-xs font-medium text-ink-50 hover:bg-vara-600"
            >
              <Upload className="h-3.5 w-3.5 inline mr-1" />
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* Único input file compartilhado pelos botões — fora do footer para evitar sobreposição com o sheet */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
          // permite selecionar o mesmo arquivo novamente
          e.target.value = '';
        }}
      />

      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

function FolderRow({ file, onOpen }: { file: DriveFile; onOpen: () => void }) {
  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-3 rounded-md border border-ink-800 px-3 py-2 hover:border-ink-600 hover:bg-ink-900/50 transition-colors text-left"
      >
        <Folder className="h-5 w-5 text-vara-400 shrink-0" />
        <span className="text-sm text-ink-100 flex-1 truncate">{file.name}</span>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500 shrink-0" />
      </button>
    </li>
  );
}

function FileRow({ file, onPreview, onDownload, onDelete }: {
  file: DriveFile;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <li>
      <div className="w-full flex items-center gap-3 rounded-md border border-ink-800 px-3 py-2 hover:border-ink-600 transition-colors">
        <span className="text-lg shrink-0 w-6 text-center" title={file.mimeType ?? ''}>
          {fileIcon(file.mimeType)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-100 truncate">{file.name}</p>
          <p className="text-[10px] text-ink-500">
            {formatSize(file.size)}
            {file.modifiedTime && ` · ${format(new Date(file.modifiedTime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onPreview}
            className="p-1.5 text-ink-400 hover:text-vara-300"
            title="Visualizar"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onDownload}
            className="p-1.5 text-ink-400 hover:text-vara-300"
            title="Baixar"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-ink-400 hover:text-prazo-400"
            title="Apagar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}