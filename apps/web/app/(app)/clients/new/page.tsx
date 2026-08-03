'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Input } from '@juris-flow/ui';
import { ArrowLeft, User, Building2, Save, Loader2, Check, AlertCircle } from 'lucide-react';

export default function NewClientPage() {
  const router = useRouter();
  const [kind, setKind] = useState<'PF' | 'PJ'>('PF');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [loadingCep, setLoadingCep] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // === Máscaras simples ===
  function maskCnpj(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
  }
  function maskCpf(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
  }
  function maskCep(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2').slice(0, 9);
  }
  function maskPhone(v: string) {
    return v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
  }

  // === Busca CNPJ (PJ) ===
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
      if (!f) return;
      (f.elements.namedItem('legalName') as HTMLInputElement).value = data.legalName ?? '';
      (f.elements.namedItem('tradeName') as HTMLInputElement).value = data.tradeName ?? '';
      (f.elements.namedItem('cep') as HTMLInputElement).value = data.address?.cep ? maskCep(data.address.cep) : '';
      (f.elements.namedItem('logradouro') as HTMLInputElement).value = data.address?.logradouro ?? '';
      (f.elements.namedItem('numero') as HTMLInputElement).value = data.address?.numero ?? '';
      (f.elements.namedItem('bairro') as HTMLInputElement).value = data.address?.bairro ?? '';
      (f.elements.namedItem('cidade') as HTMLInputElement).value = data.address?.cidade ?? '';
      (f.elements.namedItem('uf') as HTMLInputElement).value = data.address?.uf ?? '';
    } catch {
      setCnpjStatus('err');
      setError('Erro de rede ao consultar CNPJ');
    } finally {
      setLoadingCnpj(false);
    }
  }

  // === Busca CEP (PF e PJ) ===
  async function fetchCep(cep: string) {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setLoadingCep(true);
    setError('');
    try {
      const res = await fetch(`/api/cep/${cleaned}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'CEP não encontrado');
        return;
      }
      const f = formRef.current;
      if (!f) return;
      (f.elements.namedItem('logradouro') as HTMLInputElement).value = data.logradouro ?? '';
      (f.elements.namedItem('bairro') as HTMLInputElement).value = data.bairro ?? '';
      (f.elements.namedItem('cidade') as HTMLInputElement).value = data.cidade ?? '';
      (f.elements.namedItem('uf') as HTMLInputElement).value = data.uf ?? '';
    } catch {
      setError('Erro de rede ao consultar CEP');
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    fd.set('kind', kind);
    // Address como JSON (para o backend gravar no campo Json)
    const address = {
      cep: (fd.get('cep') as string) || undefined,
      logradouro: (fd.get('logradouro') as string) || undefined,
      numero: (fd.get('numero') as string) || undefined,
      complemento: (fd.get('complemento') as string) || undefined,
      bairro: (fd.get('bairro') as string) || undefined,
      cidade: (fd.get('cidade') as string) || undefined,
      uf: (fd.get('uf') as string) || undefined,
    };
    // Remove keys com string vazia
    Object.keys(address).forEach((k) => {
      if (!address[k as keyof typeof address]) delete address[k as keyof typeof address];
    });
    fd.set('address', Object.keys(address).length ? JSON.stringify(address) : '');

    try {
      const res = await fetch('/api/clients', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setSaving(false);
        return;
      }
      router.push(`/clients/${data.id}`);
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
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">Novo Cliente</h1>
          <p className="vf-caption text-ink-400 mt-0.5">Cadastre uma pessoa física ou jurídica</p>
        </div>
      </div>

      {/* Toggle PF/PJ */}
      <div className="flex rounded-md border border-ink-700 p-1 w-fit">
        <button
          type="button"
          onClick={() => setKind('PF')}
          className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${kind === 'PF' ? 'bg-vara-700 text-ink-50' : 'text-ink-400 hover:text-ink-200'}`}
        >
          <User className="h-4 w-4" /> Pessoa Física
        </button>
        <button
          type="button"
          onClick={() => setKind('PJ')}
          className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${kind === 'PJ' ? 'bg-vara-700 text-ink-50' : 'text-ink-400 hover:text-ink-200'}`}
        >
          <Building2 className="h-4 w-4" /> Pessoa Jurídica
        </button>
      </div>

      <Card>
        <CardContent className="p-6">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md border border-prazo-700 bg-prazo-950/40 px-4 py-2 text-sm text-prazo-300">
                {error}
              </div>
            )}

            {kind === 'PF' ? (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">
                    Nome completo <span className="text-prazo-400">*</span>
                  </label>
                  <Input name="fullName" required placeholder="Maria da Silva" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-200">CPF</label>
                    <Input
                      name="cpf"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      onChange={(e) => (e.target.value = maskCpf(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-200">Nascimento</label>
                    <Input name="birthDate" type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-200">E-mail</label>
                    <Input name="email" type="email" placeholder="cliente@email.com" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-200">Telefone</label>
                    <Input
                      name="phone"
                      placeholder="(11) 99999-9999"
                      onChange={(e) => (e.target.value = maskPhone(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">WhatsApp</label>
                  <Input
                    name="whatsapp"
                    placeholder="(11) 99999-9999"
                    onChange={(e) => (e.target.value = maskPhone(e.target.value))}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-ink-200">
                      CNPJ <span className="text-prazo-400">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        name="cnpj"
                        required
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
                      {!loadingCnpj && cnpjStatus === 'err' && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-prazo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-ink-500 mt-1">
                      {cnpjStatus === 'ok' ? '✓ Dados preenchidos automaticamente' : 'Digite para buscar na Receita Federal'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">
                    Razão social <span className="text-prazo-400">*</span>
                  </label>
                  <Input name="legalName" required placeholder="Empresa ABC Ltda." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-200">Nome fantasia</label>
                    <Input name="tradeName" placeholder="ABC Soluções" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-200">Inscrição estadual</label>
                    <Input name="stateRegistration" placeholder="000.000.000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-200">E-mail</label>
                    <Input name="email" type="email" placeholder="contato@empresa.com" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-200">Telefone</label>
                    <Input
                      name="phone"
                      placeholder="(11) 99999-9999"
                      onChange={(e) => (e.target.value = maskPhone(e.target.value))}
                    />
                  </div>
                </div>
              </>
            )}

            {/* === Endereço === */}
            <div className="border-t border-ink-800 pt-5 mt-2">
              <h2 className="vf-heading text-sm text-ink-100 mb-3">Endereço</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">CEP</label>
                  <div className="relative">
                    <Input
                      name="cep"
                      placeholder="00000-000"
                      maxLength={9}
                      onChange={(e) => (e.target.value = maskCep(e.target.value))}
                      onBlur={(e) => fetchCep(e.target.value)}
                    />
                    {loadingCep && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-ink-400" />
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">Logradouro</label>
                  <Input name="logradouro" placeholder="Rua, Avenida, etc." />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-3">
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">Número</label>
                  <Input name="numero" placeholder="123" />
                </div>
                <div className="col-span-3">
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">Complemento</label>
                  <Input name="complemento" placeholder="Sala 101, Bloco A, etc." />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">Bairro</label>
                  <Input name="bairro" placeholder="Centro" />
                </div>
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">Cidade</label>
                  <Input name="cidade" placeholder="São Paulo" />
                </div>
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-ink-200">UF</label>
                  <Input name="uf" maxLength={2} placeholder="SP" className="uppercase" />
                </div>
              </div>
            </div>

            {/* === Observações + Tags === */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Observações</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Anotações sobre o cliente..."
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-200">Tags</label>
              <Input name="tags" placeholder="Separadas por vírgula: VIP, Corporativo, Urgente" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} rightIcon={<Save className="h-4 w-4" />}>
                {saving ? 'Salvando...' : 'Salvar cliente'}
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