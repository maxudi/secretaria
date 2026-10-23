import React, { useState } from 'react';
import {
  CARGOS_MACONICOS_ITEM8,
  CATEGORIAS_INICIAIS_ITEM8,
  extrairCamposVariaveis,
  FraseManifestacao,
  FRASES_INICIAIS_ITEM8,
} from '../data/frasesPadraoItem8';
import { IRMAOS_QUADRO } from '../types/balaustre';

interface GerenciadorFrasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  frases: FraseManifestacao[];
  categorias: string[];
  onUpdateFrases: (novasFrases: FraseManifestacao[]) => void;
  onUpdateCategorias: (novasCategorias: string[]) => void;
}

export const GerenciadorFrasesModal: React.FC<GerenciadorFrasesModalProps> = ({
  isOpen,
  onClose,
  frases,
  categorias,
  onUpdateFrases,
  onUpdateCategorias,
}) => {
  const [buscaInterna, setBuscaInterna] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [palavraChave, setPalavraChave] = useState('');
  const [categoria, setCategoria] = useState(
    categorias[0] || 'Saudações e cumprimentos'
  );
  const [novaCategoriaInput, setNovaCategoriaInput] = useState('');
  const [cargo, setCargo] = useState('');
  const [irmaoId, setIrmaoId] = useState('');
  const [textoModelo, setTextoModelo] = useState('');
  const [ativo, setAtivo] = useState(true);

  if (!isOpen) return null;

  const limparFormulario = () => {
    setEditandoId(null);
    setTitulo('');
    setPalavraChave('');
    setCategoria(categorias[0] || 'Saudações e cumprimentos');
    setCargo('');
    setIrmaoId('');
    setTextoModelo('');
    setAtivo(true);
  };

  const handleSelecionarParaEdicao = (f: FraseManifestacao) => {
    setEditandoId(f.id);
    setTitulo(f.titulo);
    setPalavraChave(f.palavraChave);
    setCategoria(f.categoria);
    setCargo(f.cargo || '');
    setIrmaoId(f.irmaoId || '');
    setTextoModelo(f.textoModelo);
    setAtivo(f.ativo);
  };

  const handleAdicionarNovaCategoria = () => {
    const limpa = novaCategoriaInput.trim();
    if (!limpa) return;
    if (!categorias.includes(limpa)) {
      const atualizadas = [...categorias, limpa];
      onUpdateCategorias(atualizadas);
    }
    setCategoria(limpa);
    setNovaCategoriaInput('');
  };

  const handleSalvarFrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !textoModelo.trim()) return;

    const variaveis = extrairCamposVariaveis(textoModelo);

    if (editandoId) {
      const atualizadas = frases.map((f) =>
        f.id === editandoId
          ? {
              ...f,
              titulo: titulo.trim(),
              palavraChave: palavraChave.trim() || titulo.trim(),
              categoria,
              cargo: cargo || undefined,
              irmaoId: irmaoId || undefined,
              textoModelo: textoModelo.trim(),
              camposVariaveis: variaveis,
              ativo,
            }
          : f
      );
      onUpdateFrases(atualizadas);
    } else {
      const novaFrase: FraseManifestacao = {
        id: `frase-custom-${Date.now()}`,
        titulo: titulo.trim(),
        palavraChave: palavraChave.trim() || titulo.trim(),
        categoria,
        cargo: cargo || undefined,
        irmaoId: irmaoId || undefined,
        textoModelo: textoModelo.trim(),
        camposVariaveis: variaveis,
        ativo,
        ordem: frases.length + 1,
        personalizavel: true,
      };
      onUpdateFrases([novaFrase, ...frases]);
    }

    limparFormulario();
  };

  const handleExcluirFrase = (id: string, nome: string) => {
    if (window.confirm(`Deseja realmente excluir a frase "${nome}"?`)) {
      onUpdateFrases(frases.filter((f) => f.id !== id));
      if (editandoId === id) {
        limparFormulario();
      }
    }
  };

  const handleRestaurarBibliotecaInicial = () => {
    if (
      window.confirm(
        'Deseja restaurar todas as frases padrão iniciais? (As frases personalizadas serão mantidas junto às originais).'
      )
    ) {
      const idsAtuais = new Set(frases.map((f) => f.id));
      const faltantes = FRASES_INICIAIS_ITEM8.filter(
        (f) => !idsAtuais.has(f.id)
      );
      onUpdateFrases([...frases, ...faltantes]);
      onUpdateCategorias(
        Array.from(new Set([...CATEGORIAS_INICIAIS_ITEM8, ...categorias]))
      );
    }
  };

  const frasesFiltradas = frases.filter((f) => {
    const t = buscaInterna.toLowerCase();
    return (
      f.titulo.toLowerCase().includes(t) ||
      f.palavraChave.toLowerCase().includes(t) ||
      f.categoria.toLowerCase().includes(t) ||
      f.textoModelo.toLowerCase().includes(t) ||
      (f.cargo || '').toLowerCase().includes(t) ||
      (f.irmaoId || '').toLowerCase().includes(t)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-6 w-full max-w-4xl rounded-2xl border-2 border-[#D4AF37] bg-[#F9F8F6] dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden animate-fadeIn">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between bg-[#0B192C] px-6 py-4 text-white border-b-2 border-[#D4AF37]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-[#D4AF37]">📚</span>
            <div>
              <h3 className="text-base font-bold tracking-wide text-white">
                Gerenciador do Banco de Frases & Falas Recorrentes (Item 8)
              </h3>
              <p className="text-xs text-slate-300">
                Cadastre novas frases, associe a Cargos ou Irmãos do quadro,
                edite ou exclua frases existentes
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

        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[82vh] overflow-y-auto">
          {/* COLUNA ESQUERDA: Formulário de Criação / Edição */}
          <form
            onSubmit={handleSalvarFrase}
            className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 p-5 space-y-4 bg-white dark:bg-slate-800/60"
          >
            <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-2">
              <h4 className="text-sm font-bold text-[#1a365d] dark:text-[#D4AF37]">
                {editandoId
                  ? '✎ Editando Frase Existente'
                  : '＋ Cadastrar Nova Frase Padronizada'}
              </h4>
              {editandoId && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="text-xs font-semibold text-slate-500 underline hover:text-slate-800"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Título Curto da Manifestação *
              </label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: TFA do Venerável Mestre / Elogio à Iniciação"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Palavras-chave para Busca (separadas por vírgula)
              </label>
              <input
                type="text"
                value={palavraChave}
                onChange={(e) => setPalavraChave(e.target.value)}
                placeholder="Ex: TFA, abraço, visita, agradecimento"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  value={novaCategoriaInput}
                  onChange={(e) => setNovaCategoriaInput(e.target.value)}
                  placeholder="Criar nova categoria..."
                  className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAdicionarNovaCategoria}
                  className="rounded-md bg-slate-200 dark:bg-slate-700 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                >
                  + Categoria
                </button>
              </div>
            </div>

            {/* Associação Opcional: Recorrente por Cargo ou Irmão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-lg border border-[#D4AF37]/40 bg-amber-50/30 dark:bg-slate-900/50 p-3">
              <div>
                <label className="block text-[11px] font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                  Recorrente de Cargo (Opcional)
                </label>
                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                >
                  <option value="">-- Qualquer Cargo --</option>
                  {CARGOS_MACONICOS_ITEM8.map((cg) => (
                    <option key={cg} value={cg}>
                      {cg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                  Recorrente de Irmão (Opcional)
                </label>
                <select
                  value={irmaoId}
                  onChange={(e) => setIrmaoId(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs"
                >
                  <option value="">-- Qualquer Irmão --</option>
                  {IRMAOS_QUADRO.map((ir) => (
                    <option key={ir} value={ir}>
                      {ir}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Texto Modelo da Frase *
              </label>
              <p className="text-[11px] text-slate-500 mb-1">
                Dica: use <code>{'{IRMAO}'}</code>, <code>{'{LOJA}'}</code>,{' '}
                <code>{'{DATA}'}</code> ou <code>{'{VALOR}'}</code> se quiser
                campos preenchíveis na hora de inserir.
              </p>
              <textarea
                rows={4}
                required
                value={textoModelo}
                onChange={(e) => setTextoModelo(e.target.value)}
                placeholder="Digite o texto formal que será inserido na ata..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 p-2.5 text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Frase ativa nas buscas</span>
              </label>

              <button
                type="submit"
                className="rounded-lg bg-[#1a365d] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#0B192C] transition-colors"
              >
                {editandoId ? '✓ Salvar Alterações' : '＋ Salvar Nova Frase'}
              </button>
            </div>
          </form>

          {/* COLUNA DIREITA: Lista de Frases Cadastradas com Busca, Editar e Excluir */}
          <div className="lg:col-span-7 p-5 flex flex-col h-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-[#1a365d] dark:text-white">
                Frases Cadastradas ({frasesFiltradas.length})
              </h4>
              <button
                type="button"
                onClick={handleRestaurarBibliotecaInicial}
                className="text-xs font-semibold text-[#1a365d] dark:text-[#D4AF37] underline"
              >
                ↺ Restaurar Frases Padrão
              </button>
            </div>

            <input
              type="text"
              value={buscaInterna}
              onChange={(e) => setBuscaInterna(e.target.value)}
              placeholder="Filtrar frases cadastradas por título, palavra-chave, cargo ou texto..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            />

            <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
              {frasesFiltradas.map((f) => (
                <div
                  key={f.id}
                  className={`rounded-lg border p-3 transition-all ${
                    f.ativo
                      ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      : 'border-slate-200 bg-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-[#1a365d] dark:text-white">
                          {f.titulo}
                        </span>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {f.categoria}
                        </span>
                        {f.cargo && (
                          <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
                            Cargo: {f.cargo}
                          </span>
                        )}
                        {f.irmaoId && (
                          <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-bold">
                            {f.irmaoId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        "{f.textoModelo}"
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSelecionarParaEdicao(f)}
                        className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluirFrase(f.id, f.titulo)}
                        className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

