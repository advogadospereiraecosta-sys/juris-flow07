'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { maskCNJ } from '@/lib/integrations/cnj-parser';

type CnjInfo = {
  cnj: string;
  tribunal: string;
  ramo: string;
  uf?: string | null;
  segmento?: string | null;
};

const inputRef = { current: null as HTMLInputElement | null };

const setFormValue = (name: string, value: string) => {
  // Pega o form direto do input do CNJ (evita pegar forms errados)
  const form = inputRef.current?.form ?? document.querySelector('form');
  if (!form) return false;
  const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
  if (el && 'value' in el && value) {
    el.value = value;
    return true;
  }
  return false;
};

/**
 * DataJud retorna `dataAjuizamento` em 2 formatos:
 * - `20220531110047` (YYYYMMDDHHmmss) — formato comum
 * - `2022-05-31T11:00:47.000Z` (ISO com tempo) — outros tribunais
 * Converte ambos para `YYYY-MM-DD` pro input[type=date].
 */
function parseDataJudDate(raw: string): string | null {
  if (/^\d{14}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

type DataJudData = {
  classe: { nome: string; codigo: number } | null;
  orgaoJulgador: { nome: string } | null;
  valorCausa: number | null;
  dataAjuizamento: string | null;
  partes: {
    autor: Array<{ nome: string; cpfCnpj?: string }>;
    reu: Array<{ nome: string; cpfCnpj?: string }>;
  };
};

export function CnjInput() {
  const [cnj, setCnj] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDatajud, setLoadingDatajud] = useState(false);
  const [info, setInfo] = useState<CnjInfo | null>(null);
  const [datajud, setDatajud] = useState<DataJudData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchData(digits: string) {
    if (digits.length !== 20) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    setDatajud(null);
    try {
      // 1. Parse CNJ local (tribunal + UF)
      const res = await fetch(`/api/cnj/${digits}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'CNJ inválido');
        setLoading(false);
        return;
      }
      setInfo(data);
      applyToForm({ info: data, datajud: null });

      // 2. Tenta DataJud (sem bloquear UI)
      setLoadingDatajud(true);
      try {
        const djRes = await fetch('/api/datajud/consultar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cnj: digits, tribunal: data.tribunal }),
        });
        const djData = await djRes.json();
        console.log('[datajud]', { status: djRes.status, ok: djRes.ok, djData });
        if (!djRes.ok) {
          setError(`DataJud (${djRes.status}): ${djData.error ?? 'falha na consulta'}`);
        } else if (!djData.ok) {
          setError(`DataJud: ${djData.error ?? 'sem dados'}`);
        } else {
          setDatajud(djData.data);
          applyToForm({ info: data, datajud: djData.data, areaJuridica: djData.areaJuridica });
        }
      } catch (e) {
        console.error('[datajud fetch]', e);
        setError('Erro de rede ao consultar DataJud');
      } finally {
        setLoadingDatajud(false);
      }
    } catch {
      setError('Erro de rede ao consultar CNJ');
    } finally {
      setLoading(false);
    }
  }

  function applyToForm({
    info,
    datajud,
    areaJuridica,
  }: {
    info: CnjInfo;
    datajud: DataJudData | null;
    areaJuridica?: string | null;
  }) {
    if (info) {
      setFormValue('court', info.tribunal);
      setFormValue('state', info.uf ?? '');
      setFormValue('district', info.segmento ?? '');
    }

    if (datajud) {
      setFormValue('courtUnit', datajud.orgaoJulgador?.nome ?? '');
      setFormValue('legalArea', areaJuridica ?? '');
      if (datajud.valorCausa != null) {
        const formatted = (datajud.valorCausa / 100).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        setFormValue('caseValue', formatted);
      }
      if (datajud.dataAjuizamento) {
        setFormValue('filingDate', parseDataJudDate(datajud.dataAjuizamento) ?? '');
      }

      const reu = datajud.partes?.reu?.[0];
      if (reu?.nome) {
        const form = inputRef.current?.form;
        const opName = form?.elements.namedItem('opposingPartyName') as HTMLInputElement | null;
        if (opName && !opName.value) opName.value = reu.nome;
      }
    }
  }

  const icon =
    loading ? <Loader2 className="h-4 w-4 animate-spin text-vara-400" /> :
    loadingDatajud ? <Loader2 className="h-4 w-4 animate-spin text-blue-400" /> :
    info ? <CheckCircle2 className="h-4 w-4 text-improcede-400" /> :
    error ? <AlertCircle className="h-4 w-4 text-prazo-400" /> :
    null;

  return (
    <div>
      <div className="relative">
        <input
          name="cnjNumber"
          type="text"
          ref={(el) => { inputRef.current = el; }}
          value={cnj}
          onChange={(e) => {
            const masked = maskCNJ(e.target.value);
            setCnj(masked);
            const digits = masked.replace(/\D/g, '');
            if (digits.length === 20) fetchData(digits);
          }}
          placeholder="0000000-00.0000.0.00.0000"
          className={clsx(
            'w-full rounded-md border bg-ink-900 px-3 py-2 pr-9 text-sm text-ink-100 placeholder:text-ink-600 focus:outline-none focus:ring-1 font-mono',
            error ? 'border-prazo-700 focus:border-prazo-600 focus:ring-prazo-600' :
            info ? 'border-improcede-700 focus:border-improcede-600 focus:ring-improcede-600' :
            'border-ink-700 focus:border-vara-600 focus:ring-vara-600',
          )}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{icon}</div>
      </div>

      {info && (
        <div className="mt-2 rounded-md border border-improcede-800/40 bg-improcede-950/20 px-3 py-2 text-xs text-improcede-200">
          <p className="font-medium flex items-center gap-1.5">
            ✓ {info.tribunal}
            {info.uf && ` (${info.uf})`}
          </p>
          {info.segmento && <p className="text-improcede-300/80 mt-0.5">{info.segmento}</p>}

          {loadingDatajud && (
            <p className="text-blue-300/80 mt-1.5 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando dados no DataJud...
            </p>
          )}

          {datajud && (
            <div className="mt-2 pt-2 border-t border-improcede-800/40 space-y-0.5">
              {datajud.classe && (
                <p>
                  <span className="text-improcede-400">Classe:</span>{' '}
                  <span className="text-improcede-100 font-medium">{datajud.classe.nome}</span>
                </p>
              )}
              {datajud.orgaoJulgador && (
                <p>
                  <span className="text-improcede-400">Órgão:</span> {datajud.orgaoJulgador.nome}
                </p>
              )}
              {datajud.valorCausa != null && (
                <p>
                  <span className="text-improcede-400">Valor da causa:</span>{' '}
                  R$ {(datajud.valorCausa / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
              {datajud.dataAjuizamento && (() => {
                const formatted = parseDataJudDate(datajud.dataAjuizamento);
                return formatted ? (
                  <p>
                    <span className="text-improcede-400">Distribuído em:</span>{' '}
                    {new Date(formatted).toLocaleDateString('pt-BR')}
                  </p>
                ) : null;
              })()}
              {datajud.partes?.reu?.[0] && (
                <p>
                  <span className="text-improcede-400">Réu:</span> {datajud.partes.reu[0].nome}
                </p>
              )}
              <p className="text-improcede-400/70 mt-1 pt-1 border-t border-improcede-800/40">
                ✓ Tribunal, UF, comarca, vara, área, valor, data e parte contrária preenchidos automaticamente.
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-[10px] text-prazo-400">{error}</p>}
    </div>
  );
}
