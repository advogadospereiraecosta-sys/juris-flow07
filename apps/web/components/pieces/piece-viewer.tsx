'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge } from '@juris-flow/ui';
import { Loader2, Download, Copy, CheckCircle2, AlertTriangle, Save, FileText, Wifi } from 'lucide-react';

type Status = 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

type Piece = {
  id: string;
  status: Status;
  outputText: string | null;
  errorMessage: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costCents: number | null;
  updatedAt: string;
};

type Props = { pieceId: string; initial: Piece; type: string };

export function PieceViewer({ pieceId, initial, type }: Props) {
  const router = useRouter();
  const [piece, setPiece] = useState<Piece>(initial);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [text, setText] = useState(initial.outputText ?? '');
  const [streamDone, setStreamDone] = useState(initial.status === 'COMPLETED');
  const esRef = useRef<EventSource | null>(null);
  const streamTextRef = useRef('');

  // Streaming SSE em vez de polling
  useEffect(() => {
    if (initial.status === 'GENERATING' || initial.status === 'DRAFT') {
      const es = new EventSource(`/api/pieces/${pieceId}/stream`);
      esRef.current = es;

      es.addEventListener('text', (ev) => {
        // Servidor envia payload como JSON-string (ex.: "Excelentíssimo...") — faz unquote
        const raw = (ev as MessageEvent).data as string;
        let fragment: string;
        try {
          fragment = JSON.parse(raw);
        } catch {
          fragment = raw;
        }
        streamTextRef.current += fragment;
        setText(streamTextRef.current);
      });

      es.addEventListener('done', (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data ?? '{}');
          setStreamDone(true);
          setPiece((p) => ({
            ...p,
            status: 'COMPLETED',
            outputText: streamTextRef.current,
            inputTokens: data.inputTokens ?? null,
            outputTokens: data.outputTokens ?? null,
            costCents: data.costCents ?? null,
          }));
        } catch {
          setStreamDone(true);
          setPiece((p) => ({ ...p, status: 'COMPLETED', outputText: streamTextRef.current }));
        }
        es.close();
      });

    es.addEventListener('error', (e) => {
      const err = (e as MessageEvent).data ?? 'Erro na conexão com streaming';
      setPiece((p) => ({ ...p, status: 'FAILED', errorMessage: err }));
      setStreamDone(true);
      es.close();
    });

    return () => {
      es.close();
      esRef.current = null;
    };
    }
  }, [pieceId, initial.status, initial.outputText]);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type.toLowerCase()}-${pieceId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/pieces/${pieceId}/text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  if (piece.status === 'GENERATING' || piece.status === 'DRAFT') {
    const hasText = streamTextRef.current.length > 0;
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 text-vara-400 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-ink-100">Gerando peça com IA...</h3>
          <p className="text-sm text-ink-400 mt-1 max-w-sm text-center">
            {hasText
              ? 'Texto sendo gerado em tempo real. Aguarde a conclusão.'
              : 'Claude está redigindo a peça. Pode levar 15-60 segundos.'}
          </p>
          {hasText && (
            <div className="mt-4 w-full max-w-lg">
              <div className="flex items-center gap-1.5 text-xs text-vara-400 mb-1.5">
                <Wifi className="h-3 w-3" />
                Streaming em tempo real
              </div>
              <div className="w-full bg-ink-800 rounded-full h-1">
                <div
                  className="h-1 bg-vara-500 rounded-full animate-pulse"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-ink-600 mt-4">A página atualiza sozinha.</p>
        </CardContent>
      </Card>
    );
  }

  if (piece.status === 'FAILED') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="h-12 w-12 text-prazo-400 mb-4" />
          <h3 className="text-lg font-semibold text-ink-100">Falha na geração</h3>
          <p className="text-sm text-prazo-300 mt-2 max-w-md text-center">
            {piece.errorMessage ?? 'Erro desconhecido'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.refresh()}
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // COMPLETED
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluída
          </Badge>
          {piece.inputTokens && (
            <span className="text-xs text-ink-500">
              {piece.inputTokens.toLocaleString('pt-BR')} → {piece.outputTokens?.toLocaleString('pt-BR')} tokens
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-improcede-400" /> Copiado!</>
            ) : (
              <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1" /> Baixar .md
          </Button>
          <Button variant="primary" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            {saving ? 'Salvando' : 'Salvar edição'}
          </Button>
          {savedAt && <span className="text-xs text-improcede-400">Salvo!</span>}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-md border border-prazo-700/40 bg-prazo-950/20 px-3 py-2 text-xs text-prazo-300 flex items-start gap-2">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Esta peça foi gerada por IA e <strong>DEVE ser revisada</strong> por advogado habilitado antes do protocolo.</span>
      </div>

      {/* Editor + Preview split */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[600px] resize-y bg-ink-950 border border-ink-800 rounded-md p-4 text-sm text-ink-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-vara-600"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="vf-heading text-sm font-semibold text-ink-100 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-vara-400" />
              Preview renderizado
            </h3>
            <MarkdownPreview text={text} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MarkdownPreview({ text }: { text: string }) {
  const html = renderMarkdown(text);
  return (
    <div
      className="prose prose-invert max-w-none text-sm text-ink-200 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-ink-50 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink-100 [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:text-ink-100 [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_p]:leading-relaxed [&_strong]:text-ink-50 [&_em]:text-ink-300 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-vara-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-ink-300 [&_hr]:my-4 [&_hr]:border-ink-700 [&_code]:bg-ink-800 [&_code]:px-1 [&_code]:rounded [&_code]:text-vara-300"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  );
}

function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const line = raw.replace(/\s+$/, '');

    if (/^#{1,3}\s+/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      const m = line.match(/^(#{1,3})\s+(.*)$/);
      const level = m?.[1]?.length ?? 1;
      const content = m?.[2] ?? '';
      out.push(`<h${level}>${inlineMd(content)}</h${level}>`);
      continue;
    }
    if (/^---+$/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      out.push('<hr />');
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineMd(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${inlineMd(line.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }
    if (!line.trim()) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  if (inOl) out.push('</ol>');
  return out.join('\n');
}

function inlineMd(s: string): string {
  let v = escapeHtml(s);
  v = v.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  v = v.replace(/\*(.+?)\*/g, '<em>$1</em>');
  v = v.replace(/`([^`]+)`/g, '<code>$1</code>');
  return v;
}
