'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Input } from '@juris-flow/ui';
import { ArrowLeft, Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { createLeadAction } from '@/lib/actions/leads';

const SOURCE_OPTIONS = [
  { value: 'ORGANIC', label: 'Orgânico' },
  { value: 'REFERRAL', label: 'Indicação' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'GOOGLE_ADS', label: 'Google Ads' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'EVENT', label: 'Evento' },
  { value: 'OTHER', label: 'Outro' },
];

const LEGAL_AREAS = [
  { value: '', label: 'Selecione...' },
  { value: 'CIVEL', label: 'Cível' },
  { value: 'TRABALHISTA', label: 'Trabalhista' },
  { value: 'CRIMINAL', label: 'Criminal' },
  { value: 'FAMILIA', label: 'Família' },
  { value: 'TRIBUTARIO', label: 'Tributário' },
  { value: 'PREVIDENCIARIO', label: 'Previdenciário' },
  { value: 'EMPRESARIAL', label: 'Empresarial' },
  { value: 'CONSUMIDOR', label: 'Consumidor' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
  { value: 'IMOBILIARIO', label: 'Imobiliário' },
  { value: 'OUTRO', label: 'Outro' },
];

function maskCnpj(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
}
function maskCpf(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
}
function maskPhone(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
}
function maskMoney(v: string) {
  const n = v.replace(/\D/g, '');
  if (!n) return '';
  const cents = parseInt(n, 10);
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(cents / 100);
}

export default function NewLeadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const formRef = useRef<HTMLFormElement>(null);

  async function fetchCnpj(cnpj: string) {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return;
    setLoadingCnpj(true);
    setCnpjStatus('idle');
    setError('');
    try {
      const res = await fetch(`/api/cnpj/${cleaned}`);
      const data = await res.json();
      if (!res.ok) {
        setCnpjStatus('err');
        setError(data.error ?? 'Erro ao buscar CNPJ');
        return;
      }
      setCnpjStatus('ok');
      const f = formRef.current;
      if (f) {
        (f.elements.namedItem('fullName') as HTMLInputElement).value = data.tradeName || data.legalName || '';
      }
    } catch {
      setCnpjStatus('err');
      setError('Erro de rede ao consultar CNPJ');
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const valueStr = (fd.get('estimatedValue') as string) || '';
    const cents = valueStr.replace(/\D/g, '');
    const payload = {
      fullName: (fd.get('fullName') as string) ?? '',
      email: (fd.get('email') as string) || undefined,
      phone: (fd.get('phone') as string) || undefined,
      whatsapp: (fd.get('whatsapp') as string) || undefined,
      source: (fd.get('source') as string) || 'ORGANIC',
      legalArea: (fd.get('legalArea') as string) || undefined,
      estimatedValueCents: cents ? parseInt(cents, 10) : undefined,
      probability: parseInt((fd.get('probability') as string) || '10', 10),
      notes: (fd.get('notes') as string) || undefined,
      nextActionAt: (fd.get('nextActionAt') as string) || undefined,
      nextAction: (fd.get('nextAction') as string) || undefined,
      tags: ((fd.get('tags') as string) ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      status: 'NEW',
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar lead');
        setSaving(false);
        return;
      }
      router.push(`/leads/${data.id}`);
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-ink-400 hover:text-ink-200" type="button">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">Novo Lead</h1>
          <p className="vf-caption text-ink-400 mt-0.5">Capture um novo interessado em contratar serviços jurídicos</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md border border-prazo-700 bg-prazo-950/40 px-4 py-2 text-sm text-prazo-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-ink-200">
                  Nome completo <span className="text-prazo-400">*</span>
                </label>
                <Input name="fullName" required placeholder="Nome do lead" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-200">CNPJ</label>
                <div className="relative">
                  <Input
                    name="cnpj"
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    onChange={(e) => {
                      e.target.value = maskCnpj(e.target.value);
                      setCnpjStatus('idle');
                    }}
                    onBlur={(e) => fetchCnpj(e.target.value)}
                  />
                  {loadingCnpj && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-ink-400" />
                  )}
                  {!loadingCnpj && cnpjStatus === 'ok' && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-improcede-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-200">CPF</label>
                <Input name="cpf" placeholder="000.000.000-00" maxLength={14} onChange={(e) => (e.target.value = maskCpf(e.target.value))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-200">Origem</label>
                <select
                  name="source"
                  defaultValue="ORGANIC"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none"
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-200">E-mail</label>
                <Input name="email" type="email" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-200">Telefone</label>
                <Input name="phone" placeholder="(11) 99999-9999" onChange={(e) => (e.target.value = maskPhone(e.target.value))} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">WhatsApp</label>
              <Input name="whatsapp" placeholder="(11) 99999-9999" onChange={(e) => (e.target.value = maskPhone(e.target.value))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-200">Área jurídica</label>
                <select
                  name="legalArea"
                  defaultValue=""
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none"
                >
                  {LEGAL_AREAS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-200">Valor estimado (R$)</label>
                <Input
                  name="estimatedValue"
                  placeholder="0,00"
                  inputMode="numeric"
                  onChange={(e) => (e.target.value = maskMoney(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">
                Probabilidade de fechamento: <span className="text-vara-400">10%</span>
              </label>
              <input
                type="range"
                name="probability"
                min="0"
                max="100"
                step="5"
                defaultValue="10"
                className="w-full accent-vara-500"
                onInput={(e) => {
                  const next = e.currentTarget.nextElementSibling as HTMLElement;
                  if (next) next.textContent = `${e.currentTarget.value}%`;
                }}
              />
              <span className="text-xs text-ink-500">10%</span>
            </div>

            <div className="border-t border-ink-800 pt-5">
              <h3 className="text-sm font-semibold text-ink-100 mb-3">Próxima ação</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">Quando</label>
                  <Input name="nextActionAt" type="datetime-local" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">O quê</label>
                  <Input name="nextAction" placeholder="Ex: Ligar para alinhamento" />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Observações</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Anotações sobre o lead..."
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Tags</label>
              <Input name="tags" placeholder="Separadas por vírgula: VIP, Família, Recorrente" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} rightIcon={<Save className="h-4 w-4" />}>
                {saving ? 'Salvando...' : 'Cadastrar lead'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}