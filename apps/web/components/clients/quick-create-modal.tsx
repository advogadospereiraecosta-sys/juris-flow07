'use client';

import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, User, Building2, Search } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (client: { id: string; name: string }) => void;
};

type Kind = 'PF' | 'PJ';

export function QuickCreateClientModal({ open, onClose, onCreated }: Props) {
  const [kind, setKind] = useState<Kind>('PF');
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [error, setError] = useState<string | null>(null);

  function maskCpf(v: string) {
    return v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  function maskCnpj(v: string) {
    return v.replace(/\D/g, '').slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  function maskPhone(v: string) {
    return v.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  function reset() {
    setName('');
    setDoc('');
    setEmail('');
    setPhone('');
    setError(null);
    setKind('PF');
    setCnpjStatus('idle');
  }

  async function fetchCnpj(cnpj: string) {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return;
    setLoadingCnpj(true);
    setCnpjStatus('idle');
    setError(null);
    try {
      const res = await fetch(`/api/cnpj/${cleaned}`);
      const data = await res.json();
      if (!res.ok) {
        setCnpjStatus('err');
        setError(data.error ?? 'CNPJ não encontrado');
        setLoadingCnpj(false);
        return;
      }
      setCnpjStatus('ok');
      // Auto-preenche com dados do CNPJ
      if (data.legalName) setName(data.legalName);
    } catch {
      setCnpjStatus('err');
      setError('Erro de rede ao consultar CNPJ');
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/clients/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          name,
          cpfCnpj: doc.replace(/\D/g, '') || undefined,
          email: email || undefined,
          phone: phone.replace(/\D/g, '') || undefined,
        }),
      });

      const data = await res.json();
      console.log('[quick-create] response:', res.status, data);
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Erro ao criar cliente');
        setSubmitting(false);
        return;
      }

      console.log('[quick-create] cliente criado:', data.client);
      onCreated(data.client);
      reset();
      onClose();
    } catch {
      setError('Erro de rede');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-ink-950 border border-ink-700 rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-800">
          <h3 className="text-sm font-semibold text-ink-100 flex items-center gap-2">
            <User className="h-4 w-4 text-vara-400" />
            Cadastro rápido de cliente
          </h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo */}
          <div className="flex gap-2 rounded-md border border-ink-800 p-1 bg-ink-900/40">
            <button
              type="button"
              onClick={() => { setKind('PF'); setDoc(''); setCnpjStatus('idle'); }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 rounded px-3 py-2 text-xs font-medium transition-colors',
                kind === 'PF' ? 'bg-vara-700 text-ink-50' : 'text-ink-400 hover:text-ink-200',
              )}
            >
              <User className="h-3.5 w-3.5" />
              Pessoa Física
            </button>
            <button
              type="button"
              onClick={() => { setKind('PJ'); setDoc(''); setCnpjStatus('idle'); }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 rounded px-3 py-2 text-xs font-medium transition-colors',
                kind === 'PJ' ? 'bg-vara-700 text-ink-50' : 'text-ink-400 hover:text-ink-200',
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              Pessoa Jurídica
            </button>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1.5">
              {kind === 'PF' ? 'Nome completo' : 'Razão social'} <span className="text-rede-500">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === 'PF' ? 'Ex: Maria Silva' : 'Ex: Banco XYZ S.A.'}
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
            />
          </div>

          {/* CPF/CNPJ */}
          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1.5">
              {kind === 'PF' ? 'CPF' : 'CNPJ'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={doc}
                onChange={(e) => {
                  const masked = kind === 'PF' ? maskCpf(e.target.value) : maskCnpj(e.target.value);
                  setDoc(masked);
                  // Auto-busca CNPJ quando completa
                  if (kind === 'PJ' && masked.replace(/\D/g, '').length === 14) {
                    fetchCnpj(masked);
                  }
                }}
                placeholder={kind === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                className={clsx(
                  'w-full rounded-md border bg-ink-900 px-3 py-2 pr-9 text-sm text-ink-100 placeholder:text-ink-600 focus:outline-none focus:ring-1 font-mono',
                  cnpjStatus === 'err'
                    ? 'border-prazo-700 focus:border-prazo-600 focus:ring-prazo-600'
                    : cnpjStatus === 'ok'
                    ? 'border-improcede-700 focus:border-improcede-600 focus:ring-improcede-600'
                    : 'border-ink-700 focus:border-vara-600 focus:ring-vara-600',
                )}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {loadingCnpj && kind === 'PJ' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-vara-400" />
                ) : cnpjStatus === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 text-improcede-400" />
                ) : cnpjStatus === 'err' ? (
                  <AlertCircle className="h-4 w-4 text-prazo-400" />
                ) : (
                  kind === 'PJ' && <Search className="h-3.5 w-3.5 text-ink-500" />
                )}
              </div>
            </div>
            {cnpjStatus === 'ok' && (
              <p className="mt-1 text-[10px] text-improcede-400">✓ Dados importados da Receita Federal</p>
            )}
          </div>

          {/* Email + Telefone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-1.5">Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-prazo-700/40 bg-prazo-950/20 px-3 py-2 text-xs text-prazo-300 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-md border border-ink-800 bg-ink-900/40 px-3 py-2 text-[10px] text-ink-500">
            <CheckCircle2 className="h-3 w-3 inline mr-1 text-improcede-400" />
            Você pode complementar dados completos (endereço, observações) depois em "Clientes".
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-ink-300 hover:text-ink-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="rounded-md bg-vara-700 px-5 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? 'Criando...' : 'Cadastrar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
