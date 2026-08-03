/**
 * RBAC (Role-Based Access Control) — Juris-Flow
 *
 * Mapeamento de capabilities por role. O backend consulta `can(user, capability)`
 * antes de qualquer operação sensível.
 *
 * Roles (do mais poderoso ao menos):
 * - OWNER     — billing, deletar tenant, configurar escritório
 * - PARTNER   — ver tudo, editar honorários
 * - LAWYER    — opera casos próprios, edita peças
 * - ASSISTANT — vê casos designados, edita tarefas
 * - READONLY  — apenas leitura
 */

import type { UserRole } from '@prisma/client';

export type Capability =
  // === Escritório ===
  | 'tenant:configure'
  | 'tenant:delete'
  | 'billing:manage'
  | 'team:invite'
  | 'team:remove'

  // === Clientes ===
  | 'clients:read'
  | 'clients:create'
  | 'clients:update'
  | 'clients:delete'
  | 'clients:export'

  // === Processos ===
  | 'cases:read-all'
  | 'cases:read-own'
  | 'cases:create'
  | 'cases:update'
  | 'cases:delete'

  // === Tarefas ===
  | 'tasks:read'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:delete'

  // === Documentos / Peças ===
  | 'documents:read'
  | 'documents:create'
  | 'documents:approve'
  | 'documents:export'

  // === Honorários ===
  | 'fees:read'
  | 'fees:manage'

  // === Auditoria ===
  | 'audit:read'
  | 'lgpd:export';

/**
 * Matriz de permissões. Use apenas com a função `can()`.
 */
const ROLE_CAPABILITIES: Record<UserRole, ReadonlyArray<Capability>> = {
  OWNER: [
    'tenant:configure',
    'tenant:delete',
    'billing:manage',
    'team:invite',
    'team:remove',
    'clients:read',
    'clients:create',
    'clients:update',
    'clients:delete',
    'clients:export',
    'cases:read-all',
    'cases:read-own',
    'cases:create',
    'cases:update',
    'cases:delete',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'documents:read',
    'documents:create',
    'documents:approve',
    'documents:export',
    'fees:read',
    'fees:manage',
    'audit:read',
    'lgpd:export',
  ],

  PARTNER: [
    'tenant:configure',
    'team:invite',
    'clients:read',
    'clients:create',
    'clients:update',
    'clients:delete',
    'cases:read-all',
    'cases:read-own',
    'cases:create',
    'cases:update',
    'cases:delete',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'documents:read',
    'documents:create',
    'documents:approve',
    'documents:export',
    'fees:read',
    'fees:manage',
    'audit:read',
  ],

  LAWYER: [
    'clients:read',
    'clients:create',
    'clients:update',
    'cases:read-own',
    'cases:create',
    'cases:update',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'documents:read',
    'documents:create',
    'documents:approve',
    'documents:export',
    'fees:read',
  ],

  ASSISTANT: [
    'clients:read',
    'clients:create',
    'clients:update',
    'cases:read-own',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'documents:read',
    'documents:create',
    'documents:export',
  ],

  READONLY: [
    'clients:read',
    'cases:read-own',
    'tasks:read',
    'documents:read',
  ],
};

/**
 * Verifica se um role tem uma capability.
 */
export function can(role: UserRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

/**
 * Verifica múltiplas capabilities (todas devem ser satisfeitas — lógica AND).
 */
export function canAll(role: UserRole, capabilities: Capability[]): boolean {
  return capabilities.every((c) => can(role, c));
}

/**
 * Verifica múltiplas capabilities (ao menos uma — lógica OR).
 */
export function canAny(role: UserRole, capabilities: Capability[]): boolean {
  return capabilities.some((c) => can(role, c));
}

/**
 * Lança erro se usuário não tiver a capability.
 * Use em tRPC procedures.
 */
export function assertCan(role: UserRole, capability: Capability): void {
  if (!can(role, capability)) {
    throw new Error(
      `Acesso negado: role '${role}' não tem permissão '${capability}'. Entre em contato com o administrador do escritório.`,
    );
  }
}

/**
 * Helpers de role para UI.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Proprietário',
  PARTNER: 'Sócio',
  LAWYER: 'Advogado',
  ASSISTANT: 'Assistente',
  READONLY: 'Somente leitura',
};

export function isAdminRole(role: UserRole): boolean {
  return role === 'OWNER' || role === 'PARTNER';
}
