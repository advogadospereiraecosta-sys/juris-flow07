/**
 * Match automático de Publications:
 * - OAB match → procurar advogado/ofício do tenant
 * - CNPJ match → procurar Client do tenant com mesmo CNPJ → vincula ao Case
 * - PARTY_NAME match → procura Client cujo nome bate
 *
 * Retorna ações sugeridas para vincular a Case/User/Task.
 */

import { prisma } from '@juris-flow/db';

export interface MatchResult {
  matchedUserId: string | null;       // advogado correspondente (OAB)
  matchedClientId: string | null;     // cliente correspondente (CNPJ/nome)
  matchedCaseId: string | null;       // caso correspondente via cliente
  monitorHits: string[];             // monitores que "explicariam" esta publicação
}

export async function matchPublication(
  tenantId: string,
  extracted: {
    oab: string | null;
    oabState: string | null;
    cnj: string | null;
    partyNames: string[];
  },
): Promise<MatchResult> {
  const result: MatchResult = {
    matchedUserId: null,
    matchedClientId: null,
    matchedCaseId: null,
    monitorHits: [],
  };

  // 1. OAB match — procura User pelo oabNumber (sem UF) OU oab + oabState
  if (extracted.oab) {
    const oabDigits = extracted.oab.replace(/\D/g, '');
    if (oabDigits.length >= 4) {
      // Procura User com esse pedaço de OAB
      const last4 = oabDigits.slice(-4);
      const user = await prisma.user.findFirst({
        where: {
          tenantId,
          oabNumber: { contains: last4 },
        },
        select: { id: true },
      });
      if (user) result.matchedUserId = user.id;
    }

    // Procura Monitor ativo desse tipo OAB
    const monitor = await prisma.monitor.findFirst({
      where: {
        tenantId,
        active: true,
        kind: 'OAB',
        value: { contains: oabDigits },
      },
      select: { id: true },
    });
    if (monitor) result.monitorHits.push(monitor.id);
  }

  // 2. CNJ match — procura Client (com pessoa) com esse CNJ
  if (extracted.cnj) {
    const cnjDigits = extracted.cnj.replace(/\D/g, '');
    if (cnjDigits.length === 14) {
      // 1. Procura Client com esse CNPJ (via Person)
      const person = await prisma.person.findFirst({
        where: {
          tenantId,
          cnpj: cnjDigits,
        },
        include: {
          client: { select: { id: true } },
        },
      });
      const client = person?.client;
      if (client) {
        result.matchedClientId = client.id;

        // 2. Pega o caso mais recente desse cliente sem CNJ
        const recentCase = await prisma.case.findFirst({
          where: {
            tenantId,
            clientId: client.id,
            deletedAt: null,
            cnjNumber: null,
          },
          select: { id: true },
          orderBy: { updatedAt: 'desc' },
        });
        if (recentCase) result.matchedCaseId = recentCase.id;
      }
    }
    if (!result.monitorHits.length) {
      // Procura Monitor CNPJ
      const monitor = await prisma.monitor.findFirst({
        where: {
          tenantId,
          active: true,
          kind: 'CNPJ',
          value: { contains: cnjDigits },
        },
        select: { id: true },
      });
      if (monitor) result.monitorHits.push(monitor.id);
    }
  }

  // 3. PARTY_NAME match — se OAB e CNPJ não bateram, tenta nome
  if (!result.matchedClientId && extracted.partyNames.length > 0) {
    for (const name of extracted.partyNames.slice(0, 3)) {
      // Normaliza: retira pontos, troca espaços por % para LIKE
      const cleaned = name.replace(/[^\w\s]/g, '').trim();
      if (cleaned.length < 4) continue;

      const persons = await prisma.person.findMany({
        where: {
          tenantId,
          OR: [
            { fullName: { contains: cleaned, mode: 'insensitive' } },
            { legalName: { contains: cleaned, mode: 'insensitive' } },
          ],
        },
        include: {
          client: { select: { id: true } },
        },
        take: 1,
      });
      const p = persons[0];
      if (p?.client) {
        result.matchedClientId = p.client.id;
        break;
      }
    }
  }

  return result;
}
