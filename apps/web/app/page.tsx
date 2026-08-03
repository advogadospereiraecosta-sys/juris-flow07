import Link from 'next/link';
import {
  LogoLockup,
  LinkButton,
  Badge,
} from '@juris-flow/ui';
import { Scale, Sparkles, Bell, FileCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ink-950 text-ink-50">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <BackgroundGrid />

        <div className="container relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-20 lg:pt-32">
          <Badge variant="info" dot className="mb-6">
            <Sparkles className="h-3 w-3" />
            Sprint 0 — Pré-lançamento
          </Badge>

          <h1 className="vf-display-lg max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            O software jurídico brasileiro que{' '}
            <span className="text-vara-400">entende do Direito</span>
            {' '}&mdash; não só de softwares.
          </h1>

          <p className="mt-6 max-w-2xl text-balance text-lg text-ink-200">
            Petições geradas por IA em 30 segundos. DJEN monitorado oficialmente em
            tempo real. Cálculos jurídicos fundamentados. Tudo num único SaaS feito
            para advogados autônomos.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton href="/signup" size="lg">
              Começar grátis por 14 dias
            </LinkButton>
            <LinkButton href="#features" variant="ghost" size="lg">
              Ver como funciona →
            </LinkButton>
          </div>

          <p className="mt-4 text-sm text-ink-400">
            Sem cartão. Sem promessa. Cancele quando quiser.
          </p>

          <div className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink-300">
            <span className="text-ink-400">Em construção:</span>
            <span className="font-semibold text-ink-200">Ana Pereira</span>
            <span className="text-ink-400">·</span>
            <span>Fundadora & PM</span>
            <span className="text-ink-400">·</span>
            <span>2 devs · 1 designer</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16">
          <Badge variant="muted" className="mb-4">
            O que vem por aí
          </Badge>
          <h2 className="vf-display-md max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
            Quatro coisas que vão mudar a rotina do seu escritório.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FeatureCard
            icon={<Sparkles className="h-6 w-6" />}
            title="IA que entende do Direito"
            description="47 peças processuais com modelos treinados em leis, súmulas e teses vinculantes. Cada citação verificada antes da peça finalizar."
            badge="47 peças"
            status="em desenvolvimento"
          />
          <FeatureCard
            icon={<Bell className="h-6 w-6" />}
            title="Monitor DJEN oficial"
            description="Push em tempo real quando uma publicação do seu interesse entra no Diário de Justiça. Integração direta com a API do CNJ (Res 455/2022)."
            badge="oficial CNJ"
            status="planejado"
          />
          <FeatureCard
            icon={<Scale className="h-6 w-6" />}
            title="Calculadoras fundamentadas"
            description="TRCT, atualização SELIC/IPCA, pensão alimentícia (binômio), prescrição. Cálculos com memória PDF exportável."
            badge="16 calculadoras"
            status="em desenvolvimento"
          />
          <FeatureCard
            icon={<FileCheck className="h-6 w-6" />}
            title="CRM + Pipeline"
            description="Lead entra, oportunidade classificada pela IA, proposta enviada, contrato assinado. Funil com taxa de conversão por advogado."
            badge="em breve"
            status="planejado"
          />
        </div>
      </section>

      {/* COMPARAÇÃO */}
      <section className="border-t border-ink-800 bg-ink-900/50">
        <div className="container mx-auto max-w-6xl px-6 py-24">
          <h2 className="vf-display-md mb-12 max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
            Mesma profundidade. Preço diferente.
          </h2>

          <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-800">
            <table className="w-full text-sm">
              <thead className="bg-ink-900 text-left text-xs uppercase tracking-wider text-ink-300">
                <tr>
                  <th className="px-6 py-4"></th>
                  <th className="px-6 py-4 text-vara-400">Juris-Flow</th>
                  <th className="px-6 py-4 text-ink-400">Concorrente A</th>
                  <th className="px-6 py-4 text-ink-400">Concorrente B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                <Row label="Plano advogado solo" juris="R$ 69" a="R$ 199" b="R$ 149" />
                <Row label="Peça IA" juris="R$ 0,40" a="R$ 1,50" b="R$ 0,80" />
                <Row label="DJEN oficial" juris="✓" a="✗" b="✓" highlight />
                <Row label="Calculadoras" juris="16" a="4" b="6" />
                <Row label="LGPD auditada" juris="✓" a="✗" b="parcial" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="vf-display-md text-balance text-3xl font-bold sm:text-4xl">
          Pronto para acabar com a planilha corrida?
        </h2>
        <p className="mt-4 text-ink-300">
          14 dias. Sem cartão. Sem promessa. Veja no que dá.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <LinkButton href="/signup" size="lg">
            Criar conta grátis
          </LinkButton>
          <LinkButton href="/login" variant="outline" size="lg">
            Já tenho conta
          </LinkButton>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="container relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/" aria-label="Juris-Flow">
        <LogoLockup />
      </Link>
      <nav className="flex items-center gap-3">
        <LinkButton href="/login" variant="ghost" size="sm">
          Entrar
        </LinkButton>
        <LinkButton href="/signup" size="sm">
          Começar grátis
        </LinkButton>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-800">
      <div className="container mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <LogoLockup variant="compact" />
          <div className="text-xs text-ink-400">
            © {new Date().getFullYear()} Juris-Flow · Advogado no tempo. Cliente no centro.
          </div>
          <div className="flex gap-4 text-xs text-ink-400">
            <Link href="/privacidade" className="hover:text-ink-200">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-ink-200">
              Termos
            </Link>
            <Link href="mailto:ola@juris-flow.com.br" className="hover:text-ink-200">
              Contato
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  badge,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  status: 'em desenvolvimento' | 'planejado';
}) {
  return (
    <article className="group rounded-lg border border-ink-700 bg-ink-800 p-6 transition-colors hover:border-vara-700">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-vara-700/30 text-vara-300">
          {icon}
        </div>
        <Badge variant="muted">{badge}</Badge>
      </div>
      <h3 className="vf-heading mb-2 text-lg text-ink-50">{title}</h3>
      <p className="text-sm text-ink-300">{description}</p>
      <div className="mt-4 text-xs uppercase tracking-wider text-ink-500">
        {status}
      </div>
    </article>
  );
}

function Row({
  label,
  juris,
  a,
  b,
  highlight,
}: {
  label: string;
  juris: string;
  a: string;
  b: string;
  highlight?: boolean;
}) {
  return (
    <tr>
      <td className="px-6 py-3 text-ink-200">{label}</td>
      <td
        className={`px-6 py-3 font-semibold ${
          highlight && juris === '✓' ? 'text-procede-400' : 'text-vara-300'
        }`}
      >
        {juris}
      </td>
      <td className="px-6 py-3 text-ink-400">{a}</td>
      <td className="px-6 py-3 text-ink-400">{b}</td>
    </tr>
  );
}

function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
    />
  );
}
