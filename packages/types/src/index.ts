/**
 * Tipos compartilhados da Juris-Flow.
 *
 * Sprint 0: vazio intencionalmente — tipos serão adicionados conforme módulos
 * específicos precisarem (ex: tipos de peças jurídicas, schemas de integração).
 */

export type ISODateString = string;
export type Cents = number;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
