import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12; // ~250ms em CPU moderna — seguro contra força bruta

/**
 * Hash de senha com bcrypt.
 * Use ao criar/atualizar senha de usuário.
 */
export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 8) {
    throw new Error('Senha deve ter no mínimo 8 caracteres');
  }
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Verifica senha contra hash.
 * Use na verificação de login.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Política de senhas — LGPD art. 46 + boas práticas.
 *
 * - Mínimo 8 caracteres
 * - 1 letra maiúscula, 1 minúscula, 1 número
 * - Recomendado (não obrigatório): 1 caractere especial
 */
export function validatePasswordPolicy(plain: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (plain.length < 8) {
    errors.push('Senha deve ter no mínimo 8 caracteres');
  }
  if (!/[a-z]/.test(plain)) {
    errors.push('Senha deve ter pelo menos 1 letra minúscula');
  }
  if (!/[A-Z]/.test(plain)) {
    errors.push('Senha deve ter pelo menos 1 letra maiúscula');
  }
  if (!/[0-9]/.test(plain)) {
    errors.push('Senha deve ter pelo menos 1 número');
  }

  return { ok: errors.length === 0, errors };
}
