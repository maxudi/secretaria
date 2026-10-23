import React, { useEffect, useMemo, useState } from 'react';
import {
  BalaustreSupabaseRow,
  converterRowParaFormData,
  DEFAULT_LOJA_ALPHA_OMEGA_ID,
  excluirBalaustreSupabase,
  listarBalaustresSalvosSupabase,
} from '../lib/supabase';
import {
  BalaustreFormData,
  obterPermissoesUsuario,
  PapelUsuarioCim,
} from '../types/balaustre';

interface HistoricoBalaustresModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojaId?: string;
  papelUsuario?: PapelUsuarioCim;
  onCarregarBalaustre: (
    dados: BalaustreFormData,
    abrirPreviewDireto?: boolean
  ) => void;
  onNovoBalaustre: (proximoNumeroSugerido: number) => void;
}

const LABELS_GRAU: Record<string, string> = {
  aprendiz: '1º Grau — Aprendiz Maçom',
  companheiro: '2º Grau — Companheiro Maçom',
  mestre: '3º Grau — Mestre Maçom',
};

const LABELS_SESSAO: Record<string, string> = {
  ordinaria: 'Sessão Ordinária',
  magna_iniciacao: 'Sessão Magna de Iniciação',
  magna_elevacao: 'Sessão Magna de Elevação',
  magna_exaltacao: 'Sessão Magna de Exaltação',
  magna_instalacao_posse: 'Sessão Magna de Instalação e Posse',
  magna_outra: 'Sessão Magna',
  extraordinaria: 'Sessão Extraordinária',
  funebre: 'Sessão Fúnebre',
};

export const HistoricoBalaustresModal: React.FC<
  HistoricoBalaustresModalProps
> = ({
  isOpen,
  onClose,
  lojaId = DEFAULT_LOJA_ALPHA_OMEGA_ID,
  papelUsuario = 'secretario',
  onCarregarBalaustre,
  onNovoBalaustre,
}) => {
  const [lista, setLista] = useState<BalaustreSupabaseRow[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [busca, setBusca] = useState<string>('');
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const ITENS_POR_PAGINA = 5;
  const permissoes = obterPermissoesUsuario(papelUsuario);

  const recarregarLista = async () => {
    setCarregando(true);
    try {
      const dados = await listarBalaustresSalvosSupabase(lojaId);
      setLista(dados);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPaginaAtual(1);
      recarregarLista();
    }
  }, [isOpen, lojaId]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca]);

  const listaFiltrada = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return lista;
    return lista.filter((r) => {
      const numStr = `${r.numero_balaustre}-${r.periodo_gestao || '2025-2027'}`;
      const dataStr = r.data_sessao || '';
      const grauStr = LABELS_GRAU[r.grau_trabalhos] || r.grau_trabalhos || '';
      const tipoStr = LABELS_SESSAO[r.tipo_sessao] || r.tipo_sessao || '';
      const textoStr = r.texto_liturgico_gerado || '';
      return (
        numStr.toLowerCase().includes(t) ||
        dataStr.toLowerCase().includes(t) ||
        grauStr.toLowerCase().includes(t) ||
        tipoStr.toLowerCase().includes(t) ||
        textoStr.toLowerCase().includes(t)
      );
    });
  }, [lista, busca]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(listaFiltrada.length / ITENS_POR_PAGINA)
  );
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const indiceInicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
  const listaPaginada = listaFiltrada.slice(
    indiceInicio,
    indiceInicio + ITENS_POR_PAGINA
  );

  if (!isOpen) return null;

  const proximoNumero =
    lista.length > 0
      ? Math.max(...lista.map((r) => Number(r.numero_balaustre) || 0)) + 1
      : 142;

  const formatarDataBR = (iso: string) => {
    if (!iso || !iso.includes('-')) return iso;
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  };

  const handleExcluir = async (row: BalaustreSupabaseRow) => {
    if (
      !window.confirm(
        `Deseja realmente excluir o Balaústre Nº ${row.numero_balaustre}-${row.periodo_gestao || '2025-2027'} (${formatarDataBR(row.data_sessao)})?`
      )
    ) {
      return;
    }
    await excluirBalaustreSupabase(row);
    await recarregarLista();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="relative my-8 w-full max-w-4xl rounded-2xl border-2 border-[#D4AF37] bg-[#F9F8F6] dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden animate-fadeIn">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between bg-[#0B192C] px-6 py-4 text-white border-b-2 border-[#D4AF37]">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-[#D4AF37]">📚</span>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-wide text-white">
                Histórico de Balaústres Lavrados (Supabase & Arquivo Local)
              </h3>
              <p className="text-xs text-slate-300">
                Consulte, reabra para edição ou reimprima qualquer Balaústre
                anterior da Loja
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Barra de Busca e Novo Balaústre */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="🔍 Buscar por número (ex: 142), data, grau, irmão ou assunto na ata..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={recarregarLista}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
            >
              🔄 Atualizar
            </button>
            {permissoes.podeEditarBalaustre && (
              <button
                type="button"
                onClick={() => {
                  onNovoBalaustre(proximoNumero);
                  onClose();
                }}
                className="rounded-xl bg-[#1a365d] px-4 py-2 text-xs font-extrabold text-[#D4AF37] border border-[#D4AF37] hover:bg-[#0B192C] transition-colors whitespace-nowrap"
              >
                ＋ Novo Balaústre (Nº {proximoNumero})
              </button>
            )}
          </div>
        </div>

        {/* Lista de Balaústres */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-3">
          {carregando ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-500">
              Consultando arquivo de Balaústres no Supabase...
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-10 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Nenhum Balaústre encontrado no histórico.
              </p>
              <p className="text-xs text-slate-500">
                Ao clicar em <strong>"3. Salvar no Supabase"</strong> no final do
                formulário, o Balaústre ficará arquivado aqui para consulta e
                reimpressão a qualquer momento.
              </p>
            </div>
          ) : (
            listaPaginada.map((row) => {
              const gestao = row.periodo_gestao || '2025-2027';
              return (
                <div
                  key={`${row.numero_balaustre}-${gestao}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:border-[#D4AF37] transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-[#0B192C] px-3 py-1 text-xs font-extrabold text-[#D4AF37] border border-[#D4AF37]/50">
                        Balaústre Nº {row.numero_balaustre}-{gestao}
                      </span>
                      <span className="rounded-md bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                        📅 {formatarDataBR(row.data_sessao)}
                      </span>
                      <span className="rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                        {LABELS_SESSAO[row.tipo_sessao] || row.tipo_sessao} •{' '}
                        {LABELS_GRAU[row.grau_trabalhos] || row.grau_trabalhos}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Quórum:{' '}
                      <strong>{row.qtd_quadro_presentes} do Quadro</strong> e{' '}
                      <strong>{row.qtd_visitantes_presentes} Visitantes</strong>{' '}
                      • Tronco: <strong>{row.tronco_valor_apurado}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {permissoes.podeEditarBalaustre && (
                      <button
                        type="button"
                        onClick={() => {
                          const formData = converterRowParaFormData(row);
                          onCarregarBalaustre(formData, false);
                          onClose();
                        }}
                        className="rounded-lg bg-[#1a365d] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0B192C] transition-colors"
                      >
                        📂 Carregar / Editar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const formData = converterRowParaFormData(row);
                        onCarregarBalaustre(formData, true);
                        onClose();
                      }}
                      className="rounded-lg border border-[#D4AF37] bg-[#D4AF37]/15 px-3.5 py-2 text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-colors"
                    >
                      📜 Ver / Imprimir
                    </button>

                    {permissoes.podeExcluirBalaustre && (
                      <button
                        type="button"
                        onClick={() => handleExcluir(row)}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                        title="Excluir Balaústre"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Paginação (5 em 5) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-100 dark:bg-slate-950 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div>
            {listaFiltrada.length > 0 ? (
              <span>
                Mostrando{' '}
                <strong>
                  {indiceInicio + 1}–
                  {Math.min(
                    indiceInicio + ITENS_POR_PAGINA,
                    listaFiltrada.length
                  )}
                </strong>{' '}
                de <strong>{listaFiltrada.length}</strong> Balaústre(s) (5 por
                página)
              </span>
            ) : (
              <span>Total arquivado: {lista.length} Balaústre(s)</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  type="button"
                  disabled={paginaSegura <= 1}
                  onClick={() =>
                    setPaginaAtual((p) => Math.max(1, Math.min(p, totalPaginas) - 1))
                  }
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ◀ Anterior
                </button>

                {Array.from({ length: totalPaginas }, (_, idx) => idx + 1).map(
                  (numPag) => (
                    <button
                      key={numPag}
                      type="button"
                      onClick={() => setPaginaAtual(numPag)}
                      className={`min-w-[28px] rounded-lg px-2 py-1 text-xs font-bold transition-colors ${
                        numPag === paginaSegura
                          ? 'bg-[#0B192C] text-[#D4AF37] border border-[#D4AF37]'
                          : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {numPag}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={paginaSegura >= totalPaginas}
                  onClick={() =>
                    setPaginaAtual((p) =>
                      Math.min(totalPaginas, Math.min(p, totalPaginas) + 1)
                    )
                  }
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima ▶
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white dark:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

