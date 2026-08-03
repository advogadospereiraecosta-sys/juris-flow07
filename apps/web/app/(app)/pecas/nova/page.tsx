'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from '@juris-flow/ui';
import { ArrowLeft, ArrowRight, Save, Loader2, Sparkles } from 'lucide-react';
import { PIECE_TEMPLATES, type FieldSchema } from '@/lib/ai/pieces-templates';

type PieceType = (typeof PIECE_TEMPLATES)[number]['type'];

type ContextClient = {
  id: string;
  type?: string;
  name?: string;
  fullName?: string | null;
  legalName?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type ContextCase = {
  id: string;
  title: string;
  cnjNumber?: string | null;
  clientId?: string | null;
  court?: string | null;
  district?: string | null;
  opposingPartyName?: string | null;
  opposingPartyCpf?: string | null;
  opposingPartyCnpj?: string | null;
  opposingLawyerName?: string | null;
  opposingLawyerOab?: string | null;
};

export default function NovaPecaPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<PieceType | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [clients, setClients] = useState<ContextClient[]>([]);
  const [cases, setCases] = useState<ContextCase[]>([]);
  const [autoFilled, setAutoFilled] = useState(false);

  // Carrega clientes + processos quando entra no step 2
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/pieces/context', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { clients: ContextClient[]; cases: ContextCase[] };
        if (cancelled) return;
        setClients(data.clients);
        setCases(data.cases);
      } catch {
        /* noop — usuário pode preencher sem vincular */
      }
    })();
    return () => { cancelled = true; };
  }, [step]);

  // Auto-fill dos inputs quando escolhe cliente (não sobrescreve o que o usuário já digitou)
  function handleClientChange(id: string) {
    setClientId(id);
    setAutoFilled(false);
    if (!id) return;
    const c = clients.find((x) => x.id === id);
    if (!c || !template) return;

    const fillers: Record<string, string | undefined> = {
      // Chaves comuns de Petição Inicial / Contestação / Apelação
      autorNome: c.fullName ?? c.legalName ?? undefined,
      reuNome: c.fullName ?? c.legalName ?? undefined,
      clienteNome: c.fullName ?? c.legalName ?? undefined,
      parteNome: c.fullName ?? c.legalName ?? undefined,
      autorCpfCnpj: c.cpf ?? c.cnpj ?? undefined,
      reuCpfCnpj: c.cpf ?? c.cnpj ?? undefined,
      clienteCpfCnpj: c.cpf ?? c.cnpj ?? undefined,
      parteCpfCnpj: c.cpf ?? c.cnpj ?? undefined,
      autorEmail: c.email ?? undefined,
      autorTelefone: c.phone ?? undefined,
      autorEndereco: c.address ?? undefined,
      reuEndereco: c.address ?? undefined,
      clienteEndereco: c.address ?? undefined,
      parteEndereco: c.address ?? undefined,
    };

    // Só preenche campos que o template declara e que ainda estão vazios
    const fieldKeys = new Set<string>([
      ...(template.requiredFields ?? []).map((f) => f.key),
      ...(template.optionalFields ?? []).map((f) => f.key),
    ]);
    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(fillers)) {
      if (fieldKeys.has(key) && value && !inputs[key]) updates[key] = value;
    }
    if (Object.keys(updates).length > 0) {
      setInputs((prev) => ({ ...prev, ...updates }));
      setAutoFilled(true);
    }
  }

  // Quando escolhe processo, filtra cases e puxa partes contrárias como contexto opcional
  function handleCaseChange(id: string) {
    setCaseId(id);
    if (!id || !template) return;
    const c = cases.find((x) => x.id === id);
    if (!c) return;

    // Auto-vincular cliente se o processo tem um
    if (c.clientId && !clientId) {
      handleClientChange(c.clientId);
    }

    // Auto-fill de dados do processo / parte contrária
    const fillers: Record<string, string | undefined> = {
      cnjNumero: c.cnjNumber ?? undefined,
      cnjNumber: c.cnjNumber ?? undefined,
      vara: c.court ?? undefined,
      comarca: c.district ?? undefined,
      reuNome: c.opposingPartyName ?? undefined,
      reuCpfCnpj: c.opposingPartyCnpj ?? c.opposingPartyCpf ?? undefined,
      reuAdvogado: c.opposingLawyerName ?? undefined,
      reuOab: c.opposingLawyerOab ?? undefined,
      reu: c.opposingPartyName ?? undefined,
    };
    const fieldKeys = new Set<string>([
      ...(template.requiredFields ?? []).map((f) => f.key),
      ...(template.optionalFields ?? []).map((f) => f.key),
    ]);
    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(fillers)) {
      if (fieldKeys.has(key) && value && !inputs[key]) updates[key] = value;
    }
    if (Object.keys(updates).length > 0) {
      setInputs((prev) => ({ ...prev, ...updates }));
      setAutoFilled(true);
    }
  }

  const template = selectedType ? PIECE_TEMPLATES.find((t) => t.type === selectedType) ?? null : null;

  function handleInput(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  // Auto-fill CNPJ mask
  function maskCnpj(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
  }
  function maskCpf(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
  }
  function maskCpfCnpj(v: string) {
    const d = v.replace(/\D/g, '');
    return d.length > 11 ? maskCnpj(v) : maskCpf(v);
  }
  function maskMoney(v: string) {
    const n = v.replace(/\D/g, '');
    if (!n) return '';
    const cents = parseInt(n, 10);
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(cents / 100);
  }

  function renderField(field: FieldSchema) {
    const val = inputs[field.key] ?? '';
    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      let v = e.target.value;
      if (field.type === 'cpf-cnpj') v = maskCpfCnpj(v);
      else if (field.type === 'money') v = maskMoney(v);
      handleInput(field.key, v);
    };
    if (field.type === 'textarea') {
      return (
        <textarea
          name={field.key}
          value={val}
          required={field.required}
          minLength={field.minLength}
          onChange={onChange}
          placeholder={field.placeholder}
          rows={5}
          className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
        />
      );
    }
    if (field.type === 'select') {
      return (
        <select
          name={field.key}
          value={val}
          required={field.required}
          onChange={onChange}
          className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none"
        >
          <option value="">Selecione...</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    const inputType = field.type === 'date' ? 'date' : 'text';
    return (
      <Input
        name={field.key}
        type={inputType}
        value={val}
        required={field.required}
        minLength={field.minLength}
        onChange={onChange}
        placeholder={field.placeholder}
      />
    );
  }

  async function handleGenerate() {
    if (!selectedType || !template) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/pieces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          inputs,
          caseId: caseId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao gerar peça');
        setSubmitting(false);
        return;
      }
      const newId = data.generationId ?? data.id;
      if (!newId) {
        setError('API não retornou ID da peça');
        setSubmitting(false);
        return;
      }
      router.push(`/pecas/${newId}`);
    } catch {
      setError('Erro de conexão');
      setSubmitting(false);
    }
  }

  // Step 1: escolher tipo
  if (step === 1) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-ink-400 hover:text-ink-200" type="button">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="vf-display-md text-2xl font-bold text-ink-50">Gerar Peça com IA</h1>
            <p className="vf-caption text-ink-400 mt-0.5">Escolha o tipo de peça para começar</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PIECE_TEMPLATES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => { setSelectedType(t.type); setStep(2); }}
              className="text-left rounded-lg border border-ink-800 bg-ink-900/40 p-4 hover:border-vara-600 hover:bg-ink-900 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-vara-400" />
                <h3 className="text-sm font-semibold text-ink-100">{t.name}</h3>
              </div>
              <p className="text-xs text-ink-400">{t.description}</p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink-500">
                <span className="bg-ink-800 px-1.5 py-0.5 rounded">{t.legalArea ?? '—'}</span>
                <span className="bg-ink-800 px-1.5 py-0.5 rounded">{t.defaultModel.replace('CLAUDE_', '')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: preencher dados
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(1)} className="text-ink-400 hover:text-ink-200" type="button">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">{template?.name}</h1>
          <p className="vf-caption text-ink-400 mt-0.5">{template?.description}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-prazo-700 bg-prazo-950/40 px-4 py-2 text-sm text-prazo-300">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do caso</CardTitle>
          <CardDescription>Preencha os campos obrigatórios. Quanto mais contexto, melhor a peça.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {template?.requiredFields.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">
                {f.label} {f.required && <span className="text-prazo-400">*</span>}
              </label>
              {renderField(f)}
              {f.help && <p className="text-[10px] text-ink-500 mt-1">{f.help}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      {template?.optionalFields && template.optionalFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campos opcionais</CardTitle>
            <CardDescription>Personalize a peça com informações adicionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.optionalFields.map((f) => (
              <div key={f.key}>
                <label className="mb-1.5 block text-sm font-medium text-ink-200">
                  {f.label} {f.required && <span className="text-prazo-400">*</span>}
                </label>
                {renderField(f)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vincular ao contexto do escritório */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vincular ao contexto</CardTitle>
          <CardDescription>
            Selecione um cliente e/ou processo para preencher automaticamente os dados da peça.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-200">
              Cliente
            </label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
            >
              <option value="">Avulso (não vincular a cliente)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.cpf ? `· CPF ${c.cpf}` : c.cnpj ? `· CNPJ ${c.cnpj}` : ''}
                </option>
              ))}
            </select>
            {autoFilled && (
              <p className="mt-1 text-[10px] text-improcede-400">
                ✓ Campos preenchidos automaticamente. Confira e ajuste o que precisar.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-200">
              Processo
            </label>
            <select
              value={caseId}
              onChange={(e) => handleCaseChange(e.target.value)}
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
            >
              <option value="">Não vincular a processo</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.cnjNumber ? ` · ${c.cnjNumber}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-ink-500">
              Vincular a um processo puxa CNJ, vara e parte contrária (se houver).
            </p>
          </div>

          {clients.length === 0 && (
            <p className="text-[10px] text-ink-500">
              Nenhum cliente cadastrado. Crie um em "Clientes" primeiro.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleGenerate} disabled={submitting} rightIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>
          {submitting ? 'Iniciando geração...' : 'Gerar peça com IA'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setStep(1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    </div>
  );
}