/**
 * Detecta se um email é de provedor pessoal (gmail, hotmail, etc).
 *
 * O Juris-Flow recomenda uso de email institucional do escritório
 * (ex.: contato@seumescritorio.com.br) para evitar perda de acesso
 * caso o titular saia da empresa.
 */

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.com.br',
  'outlook.com',
  'outlook.com.br',
  'live.com',
  'live.com.br',
  'yahoo.com',
  'yahoo.com.br',
  'icloud.com',
  'me.com',
  'bol.com.br',
  'uol.com.br',
  'terra.com.br',
  'ig.com.br',
  'globo.com',
]);

export function isPersonalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return PERSONAL_EMAIL_DOMAINS.has(domain);
}

/** Categoriza o domínio para exibir mensagem apropriada. */
export function classifyEmail(email: string | null | undefined): {
  kind: 'institutional' | 'personal' | 'unknown';
  domain: string | null;
} {
  if (!email) return { kind: 'unknown', domain: null };
  const at = email.lastIndexOf('@');
  if (at < 0) return { kind: 'unknown', domain: null };
  const domain = email.slice(at + 1).toLowerCase().trim();
  return {
    kind: PERSONAL_EMAIL_DOMAINS.has(domain) ? 'personal' : 'institutional',
    domain,
  };
}