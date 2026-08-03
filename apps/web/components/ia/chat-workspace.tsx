'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Plus, Send, FileText, Briefcase, Loader2, Wrench, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

type Thread = {
  id: string;
  title: string;
  caseId: string | null;
  agentHint: string | null;
  updatedAt: string;
  case: { id: string; title: string } | null;
  messageCount: number;
};

type CaseOption = { id: string; title: string };

type Props = {
  initialThreads: Thread[];
  recentCases: CaseOption[];
};

type Message = {
  id?: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
};

type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; name: string; input: unknown }
  | { type: 'tool_call_end'; name: string; output: unknown }
  | { type: 'tool_call_error'; name: string; error: string }
  | { type: 'done'; messageId: string }
  | { type: 'error'; message?: string };

const SUGESTOES = [
  'Preciso redigir uma petição inicial cível com base em documentos do Drive',
  'Qual o prazo fatal para contestar uma ação de cobrança?',
  'Pesquise jurisprudência do STJ sobre vício em produto',
  'Oriente um cliente que teve o carro financiado com defeito',
];

export function ChatWorkspace({ initialThreads, recentCases }: Props) {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [caseId, setCaseId] = useState<string>('');
  const [streaming, setStreaming] = useState(false);
  const [toolEvents, setToolEvents] = useState<Array<{ name: string; status: 'running' | 'done' | 'error'; input?: unknown; output?: unknown; error?: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carrega mensagens quando muda o thread
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    (async () => {
      const res = await fetch(`/api/ia/threads/${activeThreadId}/message`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.thread.messages ?? []);
        setCaseId(data.thread.caseId ?? '');
      }
    })();
  }, [activeThreadId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, toolEvents]);

  async function handleNewThread() {
    const res = await fetch('/api/ia/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: caseId || undefined }),
    });
    const data = await res.json();
    if (res.ok && data.thread) {
      setThreads((prev) => [data.thread, ...prev]);
      setActiveThreadId(data.thread.id);
      setMessages([]);
    }
  }

  async function handleSend() {
    if (!input.trim() || streaming) return;

    let threadId = activeThreadId;
    if (!threadId) {
      const created = await fetch('/api/ia/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: caseId || undefined }),
      });
      const data = await created.json();
      if (!created.ok) return;
      threadId = data.thread.id;
      setThreads((prev) => [data.thread, ...prev]);
      setActiveThreadId(threadId);
    }

    const userMsg: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setToolEvents([]);

    // Mensagem "streaming" que vai ser preenchida
    const streamingMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, streamingMsg]);

    const es = new EventSource(
      `/api/ia/threads/${threadId}/message?message=${encodeURIComponent(userMsg.content)}&caseId=${encodeURIComponent(caseId || '')}`,
    );

    es.addEventListener('text_delta', (ev) => {
      const data = JSON.parse((ev as MessageEvent).data) as { text: string };
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') last.content += data.text;
        return next;
      });
    });

    es.addEventListener('tool_call_start', (ev) => {
      const data = JSON.parse((ev as MessageEvent).data) as { name: string; input: unknown };
      setToolEvents((prev) => [...prev, { name: data.name, status: 'running', input: data.input }]);
    });

    es.addEventListener('tool_call_end', (ev) => {
      const data = JSON.parse((ev as MessageEvent).data) as { name: string; output: unknown };
      setToolEvents((prev) => prev.map((t) => (t.status === 'running' && t.name === data.name ? { ...t, status: 'done', output: data.output } : t)));
    });

    es.addEventListener('tool_call_error', (ev) => {
      const data = JSON.parse((ev as MessageEvent).data) as { name: string; error: string };
      setToolEvents((prev) => prev.map((t) => (t.status === 'running' && t.name === data.name ? { ...t, status: 'error', error: data.error } : t)));
    });

    es.addEventListener('done', () => {
      setStreaming(false);
      es.close();
      router.refresh();
    });

    es.addEventListener('error', (ev) => {
      const data = JSON.parse((ev as MessageEvent).data ?? '{}') as { message?: string };
      setStreaming(false);
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${data.message ?? 'Erro de conexão'}` }]);
      es.close();
    });
  }

  // ... (render)

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-ink-950">
      {/* Sidebar de threads */}
      <aside className="w-72 border-r border-ink-800 flex flex-col">
        <div className="p-3 border-b border-ink-800">
          <button
            type="button"
            onClick={handleNewThread}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-vara-700 px-3 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova conversa
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.length === 0 && (
            <p className="text-xs text-ink-500 text-center py-8 px-3">
              Nenhuma conversa ainda. Comece uma abaixo.
            </p>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveThreadId(t.id)}
              className={clsx(
                'w-full text-left rounded-md p-2.5 text-sm transition-colors',
                activeThreadId === t.id
                  ? 'bg-ink-800 text-ink-100'
                  : 'text-ink-300 hover:bg-ink-900 hover:text-ink-100',
              )}
            >
              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 text-vara-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{t.title}</p>
                  {t.case && (
                    <p className="text-[10px] text-ink-500 mt-0.5 truncate">{t.case.title}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-ink-800 px-4 py-3 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-vara-400" />
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-ink-100">Juris-Flow Assistant</h1>
            <p className="text-[10px] text-ink-500">Sonnet 5 · 10 ferramentas disponíveis</p>
          </div>
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200"
          >
            <option value="">Contexto: nenhum</option>
            {recentCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </header>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto py-12 space-y-6">
              <div className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-vara-950/30 mb-3">
                  <Sparkles className="h-6 w-6 text-vara-400" />
                </div>
                <h2 className="text-lg font-semibold text-ink-100">Como posso ajudar?</h2>
                <p className="text-sm text-ink-400 mt-1">
                  Use linguagem natural. Posso redigir peças, pesquisar jurisprudência, calcular prazos e mais.
                </p>
              </div>
              <div className="grid gap-2">
                {SUGESTOES.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInput(s)}
                    className="text-left rounded-md border border-ink-800 bg-ink-900/50 px-4 py-3 text-sm text-ink-300 hover:border-vara-700 hover:bg-ink-900 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {toolEvents.length > 0 && (
            <div className="space-y-1">
              {toolEvents.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-ink-500">
                  {t.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-vara-400" />}
                  {t.status === 'done' && <CheckCircle2 className="h-3 w-3 text-improcede-400" />}
                  {t.status === 'error' && <AlertCircle className="h-3 w-3 text-prazo-400" />}
                  <Wrench className="h-3 w-3 text-ink-600" />
                  <span className="font-mono">{t.name}</span>
                  {t.status === 'running' && <span>rodando...</span>}
                  {t.status === 'done' && <span>concluído</span>}
                  {t.status === 'error' && <span className="text-prazo-400">{t.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-ink-800 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 max-w-3xl mx-auto"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={streaming ? 'Aguarde...' : 'Pergunte ou peça uma peça...'}
              disabled={streaming}
              className="flex-1 rounded-md border border-ink-700 bg-ink-900 px-4 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="rounded-md bg-vara-700 px-4 py-2.5 text-sm font-medium text-ink-50 hover:bg-vara-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-2xl rounded-lg px-4 py-3 text-sm',
          isUser
            ? 'bg-vara-700 text-ink-50'
            : 'bg-ink-900 border border-ink-800 text-ink-200',
        )}
      >
        {message.content ? (
          <MarkdownMessage text={message.content} />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-vara-400" />
        )}
      </div>
    </div>
  );
}

function MarkdownMessage({ text }: { text: string }) {
  // Render minimalista: parágrafos, listas, headings, links, negrito, código inline
  const html = renderMiniMarkdown(text);
  return (
    <div
      className="prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_p]:leading-relaxed [&_strong]:text-ink-50 [&_em]:text-ink-300 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mb-1 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-ink-50 [&_h1]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_code]:bg-ink-800 [&_code]:px-1 [&_code]:rounded [&_code]:text-vara-300 [&_a]:text-vara-300 [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  );
}

function renderMiniMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inOl = false;
  for (const raw of lines) {
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
  v = v.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return v;
}
