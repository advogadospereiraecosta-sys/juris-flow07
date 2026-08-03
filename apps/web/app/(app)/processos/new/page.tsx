import { auth } from '@/lib/auth';
import { prisma } from '@juris-flow/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@juris-flow/ui';
import { ArrowLeft } from 'lucide-react';
import { createCaseAction } from '@/lib/actions/cases';
import { CnjInput } from '@/components/processes/cnj-input';
import { ClientSelect } from '@/components/clients/client-select';

export const metadata = { title: 'Novo Processo — Juris-Flow' };

const LEGAL_AREAS = [
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

const PROCEDURE_TYPES = [
  { value: 'CONHECIMENTO', label: 'Conhecimento (rito comum)' },
  { value: 'CAUTELAR', label: 'Cautelar' },
  { value: 'EXECUCAO', label: 'Execução' },
  { value: 'INJUNCAO', label: 'Injunção' },
  { value: 'MANDADO_SEGURANCA', label: 'Mandado de Segurança' },
  { value: 'HABEAS_CORPUS', label: 'Habeas Corpus' },
  { value: 'JUIZADO_ESPECIAL', label: 'Juizado Especial' },
  { value: 'RECURSAL', label: 'Recursal' },
  { value: 'OUTRO', label: 'Outro' },
];

const PARTY_ROLES = [
  { value: 'AUTOR', label: 'Autor (estamos ajuizando)' },
  { value: 'REU', label: 'Réu (estamos nos defendendo)' },
  { value: 'LITISCONSORTE', label: 'Litisconsorte' },
  { value: 'ASSISTENTE', label: 'Assistente (intervenção)' },
  { value: 'TERCEIRO', label: 'Terceiro interessado' },
  { value: 'OPOENTE', label: 'Opoente (oposição)' },
];

export default async function NovoProcessoPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) redirect('/login');

  const clients = await prisma.client.findMany({
    where: { tenantId },
    select: {
      // O case.clientId no schema aponta pra Person (FK antiga)
      personId: true,
      person: { select: { fullName: true, legalName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/processos" className="rounded-md p-1.5 hover:bg-ink-800 transition-colors">
          <ArrowLeft className="h-4 w-4 text-ink-400" />
        </Link>
        <div>
          <h1 className="vf-display-md text-2xl font-bold text-ink-50">Novo Processo</h1>
          <p className="vf-caption text-ink-400 mt-0.5">Cadastre um novo processo no escritório.</p>
        </div>
      </div>

      <form
        action={async (formData) => {
          'use server';
          const valueStr = formData.get('caseValue') as string;
          const valueCents = valueStr
            ? Math.round(parseFloat(valueStr.replace(/\./g, '').replace(',', '.')) * 100)
            : undefined;

          // Debug temporário
          console.log('[submit novos processo]', {
            title: formData.get('title'),
            cnjNumber: formData.get('cnjNumber'),
            clientId: formData.get('clientId'),
            legalArea: formData.get('legalArea'),
            filingDate: formData.get('filingDate'),
            court: formData.get('court'),
            state: formData.get('state'),
          });

          const result = await createCaseAction({
            title: formData.get('title') as string,
            description: (formData.get('description') as string) || undefined,
            cnjNumber: (formData.get('cnjNumber') as string)?.replace(/\D/g, '') || undefined,
            court: (formData.get('court') as string) || undefined,
            courtUnit: (formData.get('courtUnit') as string) || undefined,
            district: (formData.get('district') as string) || undefined,
            state: (formData.get('state') as string) || undefined,
            legalArea: formData.get('legalArea') as string,
            procedureType: (formData.get('procedureType') as string) || undefined,
            clientId: ((formData.get('clientId') as string) || '').trim() || undefined,
            clientPartyRole: (formData.get('clientPartyRole') as 'AUTOR' | 'REU' | 'LITISCONSORTE' | 'ASSISTENTE' | 'TERCEIRO' | 'OPOENTE') || undefined,
            opposingPartyName: (formData.get('opposingPartyName') as string) || undefined,
            opposingPartyCpf: (formData.get('opposingPartyCpf') as string)?.replace(/\D/g, '') || undefined,
            opposingPartyCnpj: (formData.get('opposingPartyCnpj') as string)?.replace(/\D/g, '') || undefined,
            opposingLawyerName: (formData.get('opposingLawyerName') as string) || undefined,
            opposingLawyerOab: (formData.get('opposingLawyerOab') as string) || undefined,
            caseValueCents: valueCents,
            filingDate: (formData.get('filingDate') as string) || undefined,
            tags: [] as string[],
            status: 'ACTIVE',
            phase: 'INTAKE',
          });

          // Se sucesso, redirect (lança NEXT_REDIRECT)
          if (result.success && result.data) {
            redirect(`/processos/${result.data.id}`);
          }
          // Se falhou, redireciona para a página de novo processo de volta com query de erro
          const errorMsg = result.error ?? 'Erro desconhecido';
          redirect(`/processos/new?error=${encodeURIComponent(errorMsg)}`);
        }}
        className="space-y-6"
      >
        {/* Identificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação</CardTitle>
            <CardDescription>Título, área e número CNJ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-xs font-medium text-ink-300 mb-1.5">
                Título do caso <span className="text-rede-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                minLength={3}
                maxLength={200}
                placeholder="Ex: Ação de cobrança — Banco XYZ"
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cnjNumber" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Número CNJ
                </label>
                <CnjInput />
              </div>
              <div>
                <label htmlFor="filingDate" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Data de distribuição
                </label>
                <input
                  id="filingDate"
                  name="filingDate"
                  type="date"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="legalArea" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Área jurídica <span className="text-rede-500">*</span>
                </label>
                <select
                  id="legalArea"
                  name="legalArea"
                  required
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                >
                  {LEGAL_AREAS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="procedureType" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Tipo de procedimento
                </label>
                <select
                  id="procedureType"
                  name="procedureType"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                >
                  <option value="">Selecione...</option>
                  {PROCEDURE_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cliente + Tribunal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente e Tribunal</CardTitle>
            <CardDescription>Vincule ao cliente do escritório e informe o juízo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <ClientSelect
                  initialClients={clients.map((c) => ({
                    id: c.personId,
                    name: c.person.legalName ?? c.person.fullName,
                  }))}
                />
              </div>

              <div>
                <label htmlFor="clientPartyRole" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Polo do cliente
                </label>
                <select
                  id="clientPartyRole"
                  name="clientPartyRole"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                >
                  <option value="">Selecione...</option>
                  {PARTY_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="court" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Tribunal
                </label>
                <input
                  id="court"
                  name="court"
                  type="text"
                  placeholder="Ex: TJSP, TRF1"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
              <div>
                <label htmlFor="courtUnit" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Vara
                </label>
                <input
                  id="courtUnit"
                  name="courtUnit"
                  type="text"
                  placeholder="Ex: 2ª Vara Cível"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
              <div>
                <label htmlFor="district" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Comarca
                </label>
                <input
                  id="district"
                  name="district"
                  type="text"
                  placeholder="Ex: São Paulo"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="state" className="block text-xs font-medium text-ink-300 mb-1.5">
                  UF
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600 uppercase"
                />
              </div>
              <div>
                <label htmlFor="caseValue" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Valor da causa (R$)
                </label>
                <input
                  id="caseValue"
                  name="caseValue"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parte contrária */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parte contrária</CardTitle>
            <CardDescription>Adversário e seu advogado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="opposingPartyName" className="block text-xs font-medium text-ink-300 mb-1.5">
                Nome da parte contrária
              </label>
              <input
                id="opposingPartyName"
                name="opposingPartyName"
                type="text"
                placeholder="Razão social ou nome completo"
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="opposingPartyCpf" className="block text-xs font-medium text-ink-300 mb-1.5">
                  CPF (se PF)
                </label>
                <input
                  id="opposingPartyCpf"
                  name="opposingPartyCpf"
                  type="text"
                  placeholder="000.000.000-00"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
              <div>
                <label htmlFor="opposingPartyCnpj" className="block text-xs font-medium text-ink-300 mb-1.5">
                  CNPJ (se PJ)
                </label>
                <input
                  id="opposingPartyCnpj"
                  name="opposingPartyCnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="opposingLawyerName" className="block text-xs font-medium text-ink-300 mb-1.5">
                  Advogado adversário
                </label>
                <input
                  id="opposingLawyerName"
                  name="opposingLawyerName"
                  type="text"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
              <div>
                <label htmlFor="opposingLawyerOab" className="block text-xs font-medium text-ink-300 mb-1.5">
                  OAB
                </label>
                <input
                  id="opposingLawyerOab"
                  name="opposingLawyerOab"
                  type="text"
                  placeholder="000000"
                  className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Descrição */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descrição</CardTitle>
            <CardDescription>Resumo do caso para referência interna</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={5000}
              placeholder="Contexto do caso, fatos relevantes, histórico..."
              className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-vara-600 focus:outline-none focus:ring-1 focus:ring-vara-600 resize-none"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/processos"
            className="rounded-md px-4 py-2 text-sm font-medium text-ink-300 hover:text-ink-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-md bg-vara-700 px-5 py-2 text-sm font-medium text-ink-50 hover:bg-vara-600 transition-colors"
          >
            Criar processo
          </button>
        </div>
      </form>
    </div>
  );
}
