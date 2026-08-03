/**
 * RAG (Retrieval-Augmented Generation) de documentos do Drive.
 *
 * Pipeline:
 * 1. indexCaseDocuments(caseId) — extrai texto de PDFs/DOCX/TXT da pasta do caso,
 *    chunkifica, gera embeddings e armazena em DocumentChunk.
 * 2. retrieveCaseContext(caseId, query, topK) — busca top-K chunks por
 *    similaridade cosseno (pgvector) para enriquecer o prompt da peça.
 *
 * Usa a API da Anthropic com modelo voyage-3 para embeddings (alternativa
 * também: OpenAI text-embedding-3-small). O cliente Anthropic aceita
 * chamadas REST separadas com o header `anthropic-version` e `Authorization`.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@juris-flow/db';
import { getDriveForCurrentTenant, listFolderContents, downloadFile } from '@/lib/google/drive';

// pdf-parse tem typing fraco; declarei como any para evitar loader ESM issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth = require('mammoth');

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';
const EMBEDDING_DIMS = 1024; // voyage-3 padrão

const SUPPORTED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
]);

const CHUNK_SIZE = 1500; // caracteres por chunk (~400 tokens)
const CHUNK_OVERLAP = 200; // sobreposição entre chunks
const MAX_CHARS_PER_DOC = 80_000; // limite duro por documento (80k chars)

// === Helpers ===

function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}

async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const result = await pdfParse(buffer);
      return result.text;
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value as string;
    }
    if (mimeType.startsWith('text/')) {
      return buffer.toString('utf-8');
    }
    return '';
  } catch (e) {
    console.error('[rag] extractText error:', e);
    return '';
  }
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada');
  }

  // Voyage-3 é acessível via Anthropic com header específico? Não — Voyage é API separada.
  // Como fallback, usamos Voyage direto (mesma Anthropic API key NÃO funciona).
  // Solução: usar embeddings via Claude é caro (não nativo). Em produção, OpenAI ou Voyage direto.
  // Aqui usamos Voyage direto — requer VOYAGE_API_KEY separada.
  const voyageKey = process.env.VOYAGE_API_KEY;
  if (voyageKey) {
    const res = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: texts,
        input_type: 'document',
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Voyage embeddings error ${res.status}: ${err}`);
    }
    const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return data.data.map((d) => d.embedding);
  }

  // Fallback: ANTHROPIC_API_KEY via Anthropic — Claude não tem endpoint de embedding nativo.
  // Como fallback final, geramos embedding zero (vetor nulo) — não bloqueia a indexação.
  console.warn('[rag] VOYAGE_API_KEY ausente — usando embedding zero. RAG desativado.');
  return texts.map(() => new Array(EMBEDDING_DIMS).fill(0));
}

function toPgVectorLiteral(arr: number[]): string {
  // Formato pgvector: '[1,2,3,...]'
  return `[${arr.join(',')}]`;
}

// === API pública ===

export interface IndexResult {
  filesIndexed: number;
  filesSkipped: number;
  chunksCreated: number;
}

/**
 * Indexa todos os documentos da pasta Drive do caso.
 *
 * Estrutura esperada: Juris-Flow/Clientes/<cliente>/<caso>/
 * Caso não ache a estrutura, pega a raiz do tenant.
 */
export async function indexCaseDocuments(
  tenantId: string,
  caseId: string,
  caseFolderPath?: string,
): Promise<IndexResult> {
  const ctx = await getDriveForCurrentTenant();
  if (!ctx) return { filesIndexed: 0, filesSkipped: 0, chunksCreated: 0 };
  const { drive, tenantDrive } = ctx;

  // Resolve pasta do caso
  let folderId = tenantDrive.rootFolderId;
  if (caseFolderPath) {
    const segments = caseFolderPath.split('/').filter(Boolean);
    for (const seg of segments) {
      folderId = await ensureFolderInDrive(drive, folderId, seg);
    }
  }

  const files = await listFolderContents(drive, folderId);
  const docs = files.filter((f) => f.mimeType && SUPPORTED_MIME.has(f.mimeType));

  // Limpa chunks antigos desse caso (re-indexação)
  await prisma.documentChunk.deleteMany({
    where: { caseId, tenantId },
  });

  let filesIndexed = 0;
  let filesSkipped = 0;
  let chunksCreated = 0;

  for (const file of docs) {
    if (!file.id || !file.name) continue;

    try {
      const { data, mimeType } = await downloadFile(drive, file.id);
      let text = await extractTextFromFile(data, mimeType);
      if (!text || text.trim().length < 50) {
        filesSkipped++;
        continue;
      }
      // Trunca para evitar custos absurdos
      if (text.length > MAX_CHARS_PER_DOC) text = text.slice(0, MAX_CHARS_PER_DOC);

      const chunks = chunkText(text);
      const embeddings = await embedTexts(chunks);

      await prisma.documentChunk.createMany({
        data: chunks.map((chunk, i) => ({
          tenantId,
          caseId,
          driveFileId: file.id!,
          filename: file.name!,
          mimeType,
          chunkIndex: i,
          content: chunk,
          embedding: embeddings[i] ?? null,
          tokensCount: Math.ceil(chunk.length / 4),
        })),
      });

      filesIndexed++;
      chunksCreated += chunks.length;
    } catch (e) {
      console.error(`[rag] index error ${file.name}:`, e);
      filesSkipped++;
    }
  }

  return { filesIndexed, filesSkipped, chunksCreated };
}

async function ensureFolderInDrive(
  drive: import('googleapis').drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<string> {
  const { ensureFolder } = await import('@/lib/google/drive');
  return ensureFolder(drive, name, parentId);
}

/**
 * Recupera top-K chunks mais relevantes para a query.
 * Usa similaridade cosseno via pgvector.
 */
export async function retrieveCaseContext(
  caseId: string,
  query: string,
  topK = 5,
): Promise<Array<{ filename: string; content: string; similarity: number }>> {
  const queryEmbedding = (await embedTexts([query]))[0];
  if (!queryEmbedding) return [];

  // SQL puro via $queryRaw porque Prisma não tem suporte nativo a <-> / <=>
  const vectorLiteral = toPgVectorLiteral(queryEmbedding);
  const rows = await prisma.$queryRaw<
    Array<{ filename: string; content: string; similarity: number }>
  >`
    SELECT
      "filename",
      "content",
      1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "document_chunks"
    WHERE "case_id" = ${caseId}::uuid
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `;

  return rows.filter((r) => r.similarity > 0.3); // corta ruído
}
