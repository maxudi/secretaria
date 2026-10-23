import React, { useMemo, useState } from 'react';
import {
  LojaCatalogoItem,
  normalizarSiglaArls,
  obterCatalogoCompletoLojas,
  salvarNovaLojaCustomizada,
  TODAS_UFS_BRASIL,
} from '../data/lojasCatalogo';

interface SeletorLojaVisitanteProps {
  nomeVisitante?: string;
  onChangeNomeVisitante?: (novoNome: string) => void;
  ocultarNomeVisitante?: boolean;
  lojaSelecionada: string;
  onChangeLoja: (novaLoja: string) => void;
  orienteSelecionado: string;
  onChangeOriente: (novoOriente: string) => void;
}

export const SeletorLojaVisitante: React.FC<SeletorLojaVisitanteProps> = ({
  nomeVisitante = '',
  onChangeNomeVisitante,
  ocultarNomeVisitante = false,
  lojaSelecionada,
  onChangeLoja,
  orienteSelecionado,
  onChangeOriente,
}) => {
  const [catalogo, setCatalogo] = useState<LojaCatalogoItem[]>(() =>
    obterCatalogoCompletoLojas()
  );

  // Estado dos filtros em cascata: UF -> Oriente -> Loja
  const [ufFiltro, setUfFiltro] = useState<string>('MG');
  const [orienteFiltro, setOrienteFiltro] = useState<string>('UBERLÂNDIA');

  // Estado para cadastrar nova Loja com Oriente e UF
  const [mostrarFormNovaLoja, setMostrarFormNovaLoja] =
    useState<boolean>(false);
  const [novaUf, setNovaUf] = useState<string>('MG');
  const [novoOriente, setNovoOriente] = useState<string>('');
  const [novoNomeLoja, setNovoNomeLoja] = useState<string>('');

  // Lista de UFs que possuem Lojas cadastradas (garantindo MG sempre visível)
  const ufsDisponiveis = useMemo(() => {
    const setUfs = new Set<string>(['MG']);
    catalogo.forEach((item) => {
      if (item.uf) setUfs.add(item.uf);
    });
    return Array.from(setUfs).sort();
  }, [catalogo]);

  // Lista de Orientes filtrados pela UF selecionada (colocando UBERLÂNDIA em destaque no topo se MG)
  const orientesDaUf = useMemo(() => {
    const setOrientes = new Set<string>();
    catalogo.forEach((item) => {
      if (item.uf === ufFiltro && item.oriente) {
        setOrientes.add(item.oriente);
      }
    });
    const lista = Array.from(setOrientes).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
    if (ufFiltro === 'MG' && lista.includes('UBERLÂNDIA')) {
      return ['UBERLÂNDIA', ...lista.filter((o) => o !== 'UBERLÂNDIA')];
    }
    return lista;
  }, [catalogo, ufFiltro]);

  // Lista de Lojas filtradas pela UF + Oriente selecionados
  const lojasDoOriente = useMemo(() => {
    return catalogo
      .filter((item) => item.uf === ufFiltro && item.oriente === orienteFiltro)
      .sort((a, b) => a.nomeExibicao.localeCompare(b.nomeExibicao, 'pt-BR'));
  }, [catalogo, ufFiltro, orienteFiltro]);

  // Quando muda a UF no select cascata
  const handleSelectUf = (novaUfSel: string) => {
    setUfFiltro(novaUfSel);
    const orientesDessaUf = catalogo
      .filter((i) => i.uf === novaUfSel)
      .map((i) => i.oriente);
    const primeiroOriente =
      novaUfSel === 'MG' && orientesDessaUf.includes('UBERLÂNDIA')
        ? 'UBERLÂNDIA'
        : orientesDessaUf[0] || '';
    setOrienteFiltro(primeiroOriente);
    if (primeiroOriente) {
      onChangeOriente(`${primeiroOriente}-${novaUfSel}`);
    }
    onChangeLoja('');
  };

  // Quando muda o Oriente no select cascata
  const handleSelectOriente = (novoOrienteSel: string) => {
    setOrienteFiltro(novoOrienteSel);
    onChangeOriente(novoOrienteSel ? `${novoOrienteSel}-${ufFiltro}` : '');
    onChangeLoja('');
  };

  // Quando seleciona a Loja no select cascata
  const handleSelectLoja = (nomeLojaSel: string) => {
    onChangeLoja(nomeLojaSel);
    if (orienteFiltro && ufFiltro) {
      onChangeOriente(`${orienteFiltro}-${ufFiltro}`);
    }
  };

  // Cadastrar nova Loja com Oriente e UF no catálogo
  const handleSalvarNovaLoja = () => {
    const ufLimpa = novaUf.trim().toUpperCase();
    const orienteLimpo = novoOriente.trim().toUpperCase();
    const lojaLimpa = novoNomeLoja.trim();

    if (!ufLimpa || !orienteLimpo || !lojaLimpa) return;

    const nomeFinal = normalizarSiglaArls(lojaLimpa);

    const criada = salvarNovaLojaCustomizada({
      uf: ufLimpa,
      oriente: orienteLimpo,
      nomeExibicao: nomeFinal,
    });

    const novoCat = obterCatalogoCompletoLojas();
    setCatalogo(novoCat);

    // Seleciona automaticamente a UF, Oriente e Loja recém-cadastrados
    setUfFiltro(criada.uf);
    setOrienteFiltro(criada.oriente);
    onChangeOriente(`${criada.oriente}-${criada.uf}`);
    onChangeLoja(criada.nomeExibicao);

    setNovoOriente('');
    setNovoNomeLoja('');
    setMostrarFormNovaLoja(false);
  };

  return (
    <div className="rounded-xl border border-[#D4AF37] bg-amber-50/40 dark:bg-slate-800/90 p-3.5 space-y-3 animate-fadeIn">
      {/* 1. Nome do Irmão Visitante (Opcional, oculto quando usado apenas para selecionar Loja em Expedientes) */}
      {!ocultarNomeVisitante && (
        <div>
          <label className="block text-[11px] font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
            Nome do Irmão Visitante *
          </label>
          <div className="flex items-center">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-[#D4AF37] bg-amber-100/80 px-2.5 py-1.5 text-xs font-bold text-[#1a365d]">
              Ir∴
            </span>
            <input
              type="text"
              value={nomeVisitante}
              onChange={(e) => onChangeNomeVisitante?.(e.target.value)}
              placeholder="Digite o nome completo do Irmão visitante..."
              className="w-full rounded-r-md border border-[#D4AF37] bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* 2. Filtro em Cascata: UF -> Oriente -> Loja */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        {/* Select UF */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
            1. UF
          </label>
          <select
            value={ufFiltro}
            onChange={(e) => handleSelectUf(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-bold"
          >
            {ufsDisponiveis.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        {/* Select Oriente (Cidade) */}
        <div className="sm:col-span-4">
          <label className="block text-[11px] font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
            2. Oriente ({orientesDaUf.length} cidades)
          </label>
          <select
            value={orienteFiltro}
            onChange={(e) => handleSelectOriente(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs"
          >
            <option value="">-- Selecione o Oriente --</option>
            {orientesDaUf.map((oriente) => (
              <option key={oriente} value={oriente}>
                {oriente}
              </option>
            ))}
          </select>
        </div>

        {/* Select Loja daquele Oriente */}
        <div className="sm:col-span-6">
          <label className="block text-[11px] font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
            3. Loja do Visitante ({lojasDoOriente.length} encontradas)
          </label>
          <select
            value={lojaSelecionada}
            onChange={(e) => handleSelectLoja(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium"
          >
            <option value="">-- Selecione a Loja --</option>
            {lojasDoOriente.map((lj) => (
              <option key={lj.id} value={lj.nomeExibicao}>
                {lj.nomeExibicao}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Campos de texto editáveis (caso queira ajustar manualmente a Loja ou Oriente selecionado) + Botão de Nova Loja */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pt-1">
        <div className="sm:col-span-6">
          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
            Loja selecionada (Editável):
          </label>
          <input
            type="text"
            value={lojaSelecionada}
            onChange={(e) => onChangeLoja(e.target.value)}
            placeholder="Ex: A∴R∴L∴S∴ Luz e Caridade Nº 525"
            className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
            Oriente (Editável):
          </label>
          <input
            type="text"
            value={orienteSelecionado}
            onChange={(e) => onChangeOriente(e.target.value)}
            placeholder="Ex: UBERLÂNDIA-MG"
            className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <button
            type="button"
            onClick={() => {
              setNovaUf(ufFiltro || 'MG');
              setNovoOriente(orienteFiltro || '');
              setMostrarFormNovaLoja(!mostrarFormNovaLoja);
            }}
            className="w-full rounded-md border border-[#1a365d] bg-[#1a365d] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#0B192C] transition-colors"
          >
            {mostrarFormNovaLoja ? '✕ Fechar Cadastro' : '＋ Nova Loja / UF'}
          </button>
        </div>
      </div>

      {/* Mini-formulário para inserir Nova Loja com Oriente e UF no catálogo */}
      {mostrarFormNovaLoja && (
        <div className="rounded-lg border-2 border-[#1a365d]/40 bg-white dark:bg-slate-900 p-3 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1a365d] dark:text-[#D4AF37]">
              Cadastrar Nova Loja no Catálogo (Ficará salva para próximas atas)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                UF *
              </label>
              <select
                value={novaUf}
                onChange={(e) => setNovaUf(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-bold"
              >
                {TODAS_UFS_BRASIL.map((sigla) => (
                  <option key={sigla} value={sigla}>
                    {sigla}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                Oriente (Cidade) *
              </label>
              <input
                type="text"
                value={novoOriente}
                onChange={(e) => setNovoOriente(e.target.value)}
                placeholder="Ex: UBERLÂNDIA / GOIÂNIA"
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs uppercase"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                Nome e Número da Nova Loja *
              </label>
              <input
                type="text"
                value={novoNomeLoja}
                onChange={(e) => setNovoNomeLoja(e.target.value)}
                placeholder="Ex: A∴R∴L∴S∴ Acácia do Triângulo Nº 123"
                className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMostrarFormNovaLoja(false)}
              className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvarNovaLoja}
              className="rounded bg-[#D4AF37] px-3.5 py-1 text-xs font-extrabold text-[#0B192C] hover:bg-[#c5a02e]"
            >
              ✓ Salvar Loja no Catálogo e Selecionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

