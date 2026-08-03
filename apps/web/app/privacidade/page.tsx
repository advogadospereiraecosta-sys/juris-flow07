import { LogoLockup } from '@juris-flow/ui';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade',
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-ink-950 text-ink-50">
      <header className="container mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" aria-label="Juris-Flow">
          <LogoLockup />
        </Link>
        <Link href="/" className="text-sm text-ink-300 hover:text-ink-50">
          ← voltar
        </Link>
      </header>

      <article className="container mx-auto max-w-3xl px-6 py-10">
        <h1 className="vf-display-md text-3xl font-bold">Política de Privacidade</h1>
        <p className="vf-caption mt-2">Versão 1.0 · Vigência: 2026</p>

        <section className="mt-8 space-y-4 text-sm text-ink-200">
          <p>
            A Juris-Flow está comprometida com a privacidade e proteção dos dados
            pessoais dos seus usuários, em conformidade com a{' '}
            <strong>Lei nº 13.709/2018 (LGPD)</strong> e o{' '}
            <strong>Provimento OAB nº 188/2018</strong>.
          </p>

          <h2 className="vf-heading mt-6 text-xl text-ink-50">1. Dados que coletamos</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>Dados cadastrais (nome, email, OAB, telefone)</li>
            <li>Dados de clientes e partes (que você cadastra)</li>
            <li>Logs de acesso (LGPD art. 37)</li>
            <li>Metadados de uso (para cobrança e melhoria do serviço)</li>
          </ul>

          <h2 className="vf-heading mt-6 text-xl text-ink-50">2. Base legal</h2>
          <p>
            Tratamos dados pessoais com fundamento no <strong>art. 7º, V e VI</strong>{' '}
            da LGPD (execução de contrato e exercício regular de direitos) e, quando
            aplicável, no <strong>art. 11º</strong> (dados sensíveis).
          </p>

          <h2 className="vf-heading mt-6 text-xl text-ink-50">3. Seus direitos (art. 18)</h2>
          <p>
            Você pode exercer a qualquer momento os direitos de acesso, correção,
            anonimização, portabilidade, eliminação e revogação de consentimento.
            Para isso, acesse <em>Configurações → LGPD</em> ou envie email para{' '}
            <a
              href="mailto:[email protected]"
              className="text-vara-400 hover:underline"
            >
              [email protected]
            </a>
            .
          </p>

          <h2 className="vf-heading mt-6 text-xl text-ink-50">4. Segurança</h2>
          <p>
            Aplicamos criptografia em repouso (AES-256) e em trânsito (TLS 1.3),
            autenticação multifator para advogados, controle de acesso por roles
            (RBAC) e auditoria de todas as ações sensíveis.
          </p>

          <h2 className="vf-heading mt-6 text-xl text-ink-50">5. DPO</h2>
          <p>
            Encarregado de Proteção de Dados: Ana Pereira ·{' '}
            <a href="mailto:[email protected]" className="text-vara-400 hover:underline">
              [email protected]
            </a>
          </p>

          <h2 className="vf-heading mt-6 text-xl text-ink-50">6. Retenção</h2>
          <p>
            Mantemos os dados pelo período necessário ao cumprimento das obrigações
            legais e contratuais (mínimo 5 anos após o encerramento da relação,
            conforme CPC art. 224 §3º e Provimento OAB 188/2018).
          </p>
        </section>
      </article>
    </main>
  );
}
