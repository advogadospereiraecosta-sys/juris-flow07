'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@juris-flow/ui';
import { ArrowLeft, ArrowRight, Loader2, Check, AlertCircle, Building2 } from 'lucide-react';
import { saveOnboardingStep2Action } from '@/lib/actions/onboarding';

function maskCnpj(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
}
function maskCep(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2').slice(0, 9);
}
function maskPhone(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
}

export function OnboardingStep2() {
  const router = useRouter();
  const [pending, start] = useTransition();
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
        return;
      }
      setCnpjStatus('ok');
      const f = formRef.current;
      if (f) {
        (f.elements.namedItem('legalName') as HTMLInputElement).value = data.legalName ?? '';
        (f.elements.namedItem('tradeName') as HTMLInputElement).value = data.tradeName ?? '';
        (f.elements.namedItem('address.cep') as HTMLInputElement).value = data.address?.cep ? maskCep(data.address.cep) : '';
        (f.elements.namedItem('address.logradouro') as HTMLInputElement).value = data.address?.logradouro ?? '';
        (f.elements.namedItem('address.numero') as HTMLInputElement).value = data.address?.numero ?? '';
        (f.elements.namedItem('address.bairro') as HTMLInputElement).value = data.address?.bairro ?? '';
        (f.elements.namedItem('address.cidade') as HTMLInputElement).value = data.address?.cidade ?? '';
        (f.elements.namedItem('address.uf') as HTMLInputElement).value = data.address?.uf ?? '';
      }
    } catch {
      setCnpjStatus('err');
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function fetchCep(cep: string) {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    try {
      const res = await fetch(`/api/cep/${cleaned}`);
      const data = await res.json();
      if (!res.ok) return;
      const f = formRef.current;
      if (f) {
        (f.elements.namedItem('address.logradouro') as HTMLInputElement).value = data.logradouro ?? '';
        (f.elements.namedItem('address.bairro') as HTMLInputElement).value = data.bairro ?? '';
        (f.elements.namedItem('address.cidade') as HTMLInputElement).value = data.cidade ?? '';
        (f.elements.namedItem('address.uf') as HTMLInputElement).value = data.uf ?? '';
      }
    } catch { /* noop */ }
  }

  function handleSubmit(formData: FormData) {
    setError('');
    start(async () => {
      const result = await saveOnboardingStep2Action(formData);
      if (!result.success) {
        setError(result.error ?? 'Erro ao salvar');
        return;
      }
      router.push('/onboarding?step=3');
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-50 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-vara-400" />
          Dados do Escritório
        </h2>
        <p className="text-sm text-ink-400 mt-1">
          Confirme ou preencha os dados cadastrais do seu escritório.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-prazo-700 bg-prazo-950/40 px-3 py-2 text-xs text-prazo-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
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
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-200">Telefone</label>
          <Input name="phone" placeholder="(11) 99999-9999" onChange={(e) => (e.target.value = maskPhone(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-200">
            Razão social <span className="text-prazo-400">*</span>
          </label>
          <Input name="legalName" required placeholder="Razão social" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-200">Nome fantasia</label>
          <Input name="tradeName" placeholder="Nome fantasia (opcional)" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-200">E-mail principal</label>
        <Input name="email" type="email" placeholder="contato@seuescritorio.com.br" />
      </div>

      {/* Endereço */}
      <div className="border-t border-ink-800 pt-5">
        <p className="text-sm font-semibold text-ink-100 mb-3">Endereço</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-ink-300">CEP</label>
            <Input
              name="address.cep"
              placeholder="00000-000"
              maxLength={9}
              onChange={(e) => (e.target.value = maskCep(e.target.value))}
              onBlur={(e) => fetchCep(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs text-ink-300">Logradouro</label>
            <Input name="address.logradouro" placeholder="Rua, Av, etc." />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="col-span-1">
            <label className="mb-1.5 block text-xs text-ink-300">Número</label>
            <Input name="address.numero" placeholder="123" />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs text-ink-300">Bairro</label>
            <Input name="address.bairro" placeholder="Centro" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="col-span-2">
            <label className="mb-1.5 block text-xs text-ink-300">Cidade</label>
            <Input name="address.cidade" placeholder="Cidade" />
          </div>
          <div className="col-span-1">
            <label className="mb-1.5 block text-xs text-ink-300">UF</label>
            <Input name="address.uf" maxLength={2} placeholder="SP" className="uppercase" />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-3">
        <Button type="button" variant="ghost" onClick={() => router.push('/onboarding?step=1')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Button type="submit" disabled={pending} rightIcon={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}>
          {pending ? 'Salvando...' : 'Continuar'}
        </Button>
      </div>
    </form>
  );
}