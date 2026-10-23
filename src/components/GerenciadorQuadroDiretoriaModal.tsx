import React, { useEffect, useMemo, useState } from 'react';
import {
  carregarUsuariosCimSupabase,
  DEFAULT_LOJA_ALPHA_OMEGA_ID,
  salvarUsuariosCimSupabase,
  sincronizarDadosIniciaisSupabase,
  sincronizarIrmaoIndividualSupabase,
} from '../lib/supabase';
import {
  aplicarMascaraCim,
  aplicarMascaraTelefoneCelular,
  carregarDetalhesIrmaosQuadroLocal,
  carregarUsuariosCimLocal,
  DetalheIrmaoMapItem,
  DIRETORIA_TITULAR_PADRAO,
  DiretoriaTitularMap,
  gerarLinkWhatsApp,
  IRMAOS_QUADRO,
  LABELS_PAPEL_CIM,
  LABELS_STATUS_IRMAO,
  obterPermissoesUsuario,
  PapelUsuarioCim,
  salvarDetalhesIrmaosQuadroLocal,
  salvarIrmaosQuadroLocal,
  StatusIrmaoQuadro,
  UsuarioCim,
} from '../types/balaustre';

interface GerenciadorQuadroDiretoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojaId?: string;
  papelUsuario?: PapelUsuarioCim;
  irmaosAtuais: string[];
  diretoriaAtual: DiretoriaTitularMap;
  periodoGestaoAtual: string;
  abaInicial?: 'diretoria' | 'quadro' | 'acessos_cim';
  onSave: (dados: {
    irmaos: string[];
    diretoria: DiretoriaTitularMap;
    periodoGestao: string;
    aplicarNaSessaoAtual: boolean;
  }) => Promise<void> | void;
}

const CARGOS_CONFIG: {
  key: keyof DiretoriaTitularMap;
  label: string;
  destaque?: boolean;
}[] = [
  { key: 'veneravelMestre', label: 'Venerável Mestre', destaque: true },
  { key: 'primeiroVigilante', label: '1º Vigilante', destaque: true },
  { key: 'segundoVigilante', label: '2º Vigilante', destaque: true },
  { key: 'orador', label: 'Orador (Guarda da Lei)' },
  { key: 'secretario', label: 'Secretário' },
  { key: 'tesoureiro', label: 'Tesoureiro' },
  { key: 'chanceler', label: 'Chanceler' },
  { key: 'mestreCerimonias', label: 'Mestre de Cerimônias' },
];

export const GerenciadorQuadroDiretoriaModal: React.FC<
  GerenciadorQuadroDiretoriaModalProps
> = ({
  isOpen,
  onClose,
  lojaId = DEFAULT_LOJA_ALPHA_OMEGA_ID,
  papelUsuario = 'secretario',
  irmaosAtuais,
  diretoriaAtual,
  periodoGestaoAtual,
  abaInicial = 'diretoria',
  onSave,
}) => {
  const permissoes = obterPermissoesUsuario(papelUsuario);
  const [abaAtiva, setAbaAtiva] = useState<
    'diretoria' | 'quadro' | 'acessos_cim'
  >(abaInicial);
  const [irmaosDraft, setIrmaosDraft] = useState<string[]>(() => [
    ...irmaosAtuais,
  ]);
  const [detalhesDraft, setDetalhesDraft] = useState<
    Record<string, DetalheIrmaoMapItem>
  >(() => carregarDetalhesIrmaosQuadroLocal());
  const [diretoriaDraft, setDiretoriaDraft] = useState<DiretoriaTitularMap>(
    () => ({ ...diretoriaAtual })
  );
  const [gestaoDraft, setGestaoDraft] = useState<string>(
    periodoGestaoAtual || '2025-2027'
  );
  const [aplicarNaSessaoAtual, setAplicarNaSessaoAtual] =
    useState<boolean>(true);

  // Estados para adição e edição de Irmãos do Quadro (Nome, CIM, Telefone, Status e Honorário)
  const [novoIrmaoNome, setNovoIrmaoNome] = useState<string>('');
  const [novoIrmaoCim, setNovoIrmaoCim] = useState<string>('');
  const [novoIrmaoTelefone, setNovoIrmaoTelefone] = useState<string>('');
  const [novoIrmaoStatus, setNovoIrmaoStatus] =
    useState<StatusIrmaoQuadro>('regular');
  const [novoIrmaoHonorario, setNovoIrmaoHonorario] = useState<boolean>(false);

  const [buscaIrmao, setBuscaIrmao] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const [indiceEditando, setIndiceEditando] = useState<number | null>(null);
  const [textoEditando, setTextoEditando] = useState<string>('');
  const [cimEditando, setCimEditando] = useState<string>('');
  const [telefoneEditando, setTelefoneEditando] = useState<string>('');
  const [statusEditando, setStatusEditando] =
    useState<StatusIrmaoQuadro>('regular');
  const [honorarioEditando, setHonorarioEditando] = useState<boolean>(false);
  const [salvando, setSalvando] = useState<boolean>(false);

  // Estados para Gestão de Acessos por CIM (Aba 3)
  const [usuariosCimDraft, setUsuariosCimDraft] = useState<UsuarioCim[]>(() =>
    carregarUsuariosCimLocal()
  );
  const [novoCimNumero, setNovoCimNumero] = useState<string>('');
  const [novoCimIrmao, setNovoCimIrmao] = useState<string>('');
  const [novoCimPapel, setNovoCimPapel] =
    useState<PapelUsuarioCim>('secretario');
  const [novoCimSenha, setNovoCimSenha] = useState<string>('');
  const [cimEditandoSenhaIdx, setCimEditandoSenhaIdx] = useState<number | null>(
    null
  );
  const [novaSenhaEditando, setNovaSenhaEditando] = useState<string>('');
  const [feedbackBanco, setFeedbackBanco] = useState<{
    tipo: 'ok' | 'pendente';
    texto: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const abaSegura =
        abaInicial === 'acessos_cim' && !permissoes.podeGerenciarAcessosCim
          ? 'quadro'
          : !permissoes.podeEditarQuadroDiretoria
            ? 'quadro'
            : abaInicial;
      setAbaAtiva(abaSegura);
      setIrmaosDraft([...irmaosAtuais]);
      setDetalhesDraft(carregarDetalhesIrmaosQuadroLocal());
      setDiretoriaDraft({ ...diretoriaAtual });
      setGestaoDraft(periodoGestaoAtual || '2025-2027');
      setFeedbackBanco(null);

      sincronizarDadosIniciaisSupabase(lojaId).then((res) => {
        if (res.sincronizadoNuvem) {
          setIrmaosDraft(res.irmaos);
          setDetalhesDraft(carregarDetalhesIrmaosQuadroLocal());
          setFeedbackBanco({
            tipo: 'ok',
            texto:
              '🟢 Conectado ao banco Supabase (`public.irmaos_quadro` e `public.gestoes_diretoria`).',
          });
        } else {
          setFeedbackBanco({
            tipo: 'pendente',
            texto:
              '⚠️ Para liberar a gravação direta no Supabase, execute as Migrations 005 e 006 no SQL Editor do Supabase.',
          });
        }
      });

      if (permissoes.podeGerenciarAcessosCim) {
        carregarUsuariosCimSupabase(lojaId).then((lista) => {
          setUsuariosCimDraft(lista);
        });
      }
    }
  }, [
    isOpen,
    abaInicial,
    lojaId,
    irmaosAtuais,
    diretoriaAtual,
    periodoGestaoAtual,
    permissoes.podeGerenciarAcessosCim,
    permissoes.podeEditarQuadroDiretoria,
  ]);

  const irmaosFiltrados = useMemo(() => {
    const termo = buscaIrmao.trim().toLowerCase();
    return irmaosDraft
      .map((nome, indexOriginal) => {
        const det = detalhesDraft[nome];
        return {
          nome,
          cim: det?.cim || '',
          telefone: det?.telefone || '',
          status: (det?.status || 'regular') as StatusIrmaoQuadro,
          membroHonorario: Boolean(det?.membroHonorario),
          indexOriginal,
        };
      })
      .filter((item) => {
        if (filtroStatus === 'honorario' && !item.membroHonorario) {
          return false;
        }
        if (
          (filtroStatus === 'regular' ||
            filtroStatus === 'licenciado' ||
            filtroStatus === 'irregular') &&
          item.status !== filtroStatus
        ) {
          return false;
        }
        if (!termo) return true;
        return (
          item.nome.toLowerCase().includes(termo) ||
          item.cim.toLowerCase().includes(termo) ||
          item.telefone.toLowerCase().includes(termo)
        );
      });
  }, [irmaosDraft, detalhesDraft, buscaIrmao, filtroStatus]);

  if (!isOpen) return null;

  const normalizarNomeIrmao = (raw: string): string => {
    const limpo = raw
      .trim()
      .replace(/^(Ir∴|Ir\.|Irmão)\s*/i, '')
      .trim()
      .toUpperCase();
    return limpo ? `Ir∴ ${limpo}` : '';
  };

  const handleAdicionarIrmao = async () => {
    const formatado = normalizarNomeIrmao(novoIrmaoNome);
    if (!formatado) return;

    if (irmaosDraft.some((i) => i.toUpperCase() === formatado.toUpperCase())) {
      window.alert(`O Irmão "${formatado}" já consta no Quadro de Obreiros.`);
      return;
    }

    const cimFinal = aplicarMascaraCim(novoIrmaoCim);
    const telFinal = aplicarMascaraTelefoneCelular(novoIrmaoTelefone);
    const novaLista = [...irmaosDraft, formatado].sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
    const novosDetalhes = {
      ...detalhesDraft,
      [formatado]: {
        cim: cimFinal,
        telefone: telFinal,
        status: novoIrmaoStatus,
        membroHonorario: novoIrmaoHonorario,
      },
    };

    setIrmaosDraft(novaLista);
    setDetalhesDraft(novosDetalhes);
    salvarIrmaosQuadroLocal(novaLista);
    salvarDetalhesIrmaosQuadroLocal(novosDetalhes);

    setNovoIrmaoNome('');
    setNovoIrmaoCim('');
    setNovoIrmaoTelefone('');
    setNovoIrmaoStatus('regular');
    setNovoIrmaoHonorario(false);

    const sync = await sincronizarIrmaoIndividualSupabase({
      nomeExibicao: formatado,
      cim: cimFinal,
      telefone: telFinal,
      status: novoIrmaoStatus,
      membroHonorario: novoIrmaoHonorario,
      lojaId,
    });
    if (sync.salvouNuvem) {
      setFeedbackBanco({
        tipo: 'ok',
        texto: `🟢 ${formatado} gravado com sucesso na tabela public.irmaos_quadro do Supabase!`,
      });
    } else {
      setFeedbackBanco({
        tipo: 'pendente',
        texto: `⚠️ Salvo localmente. Para gravar na tabela public.irmaos_quadro do Supabase, execute a Migration 005 no SQL Editor (${sync.erro || 'RLS'}).`,
      });
    }
  };

  const handleConfirmarEdicaoIrmao = async (idxOriginal: number) => {
    const nomeAntigo = irmaosDraft[idxOriginal];
    const formatado = normalizarNomeIrmao(textoEditando);
    if (!formatado) return;

    const cimFinal = aplicarMascaraCim(cimEditando);
    const telFinal = aplicarMascaraTelefoneCelular(telefoneEditando);

    const novaLista = [...irmaosDraft];
    novaLista[idxOriginal] = formatado;
    novaLista.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    setIrmaosDraft(novaLista);

    // Atualiza CIM, Telefone, Status e Membro Honorário vinculados ao Irmão
    const novosDetalhes = { ...detalhesDraft };
    if (nomeAntigo !== formatado) {
      delete novosDetalhes[nomeAntigo];
    }
    novosDetalhes[formatado] = {
      cim: cimFinal,
      telefone: telFinal,
      status: statusEditando,
      membroHonorario: honorarioEditando,
    };
    setDetalhesDraft(novosDetalhes);
    salvarIrmaosQuadroLocal(novaLista);
    salvarDetalhesIrmaosQuadroLocal(novosDetalhes);

    // Se o Irmão editado ocupava algum cargo na Diretoria Titular, atualiza o nome lá também
    const novaDiretoria = { ...diretoriaDraft };
    (Object.keys(novaDiretoria) as (keyof DiretoriaTitularMap)[]).forEach(
      (cargoKey) => {
        if (novaDiretoria[cargoKey] === nomeAntigo) {
          novaDiretoria[cargoKey] = formatado;
        }
      }
    );
    setDiretoriaDraft(novaDiretoria);
    setIndiceEditando(null);
    setTextoEditando('');
    setCimEditando('');
    setTelefoneEditando('');

    const sync = await sincronizarIrmaoIndividualSupabase({
      nomeExibicao: formatado,
      nomeAntigo,
      cim: cimFinal,
      telefone: telFinal,
      status: statusEditando,
      membroHonorario: honorarioEditando,
      lojaId,
    });
    if (sync.salvouNuvem) {
      setFeedbackBanco({
        tipo: 'ok',
        texto: `🟢 Dados de ${formatado} (CIM, Telefone, Status e Membro Honorário) atualizados no Supabase!`,
      });
    } else {
      setFeedbackBanco({
        tipo: 'pendente',
        texto: `⚠️ Salvo localmente. Para gravar na tabela public.irmaos_quadro do Supabase, execute a Migration 005 no SQL Editor (${sync.erro || 'RLS'}).`,
      });
    }
  };

  const handleRemoverIrmao = (idxOriginal: number) => {
    const nome = irmaosDraft[idxOriginal];
    if (
      !window.confirm(`Deseja remover "${nome}" da lista do Quadro de Obreiros?`)
    ) {
      return;
    }
    setIrmaosDraft((prev) => prev.filter((_, i) => i !== idxOriginal));
  };

  const handleAdicionarAcessoCim = () => {
    const cimLimpo = aplicarMascaraCim(novoCimNumero);
    const senhaLimpa = novoCimSenha.trim();
    const irmaoEscolhido =
      novoCimIrmao.trim() || diretoriaDraft.secretario || irmaosDraft[0] || '';

    if (!cimLimpo || !senhaLimpa || !irmaoEscolhido) {
      window.alert(
        'Preencha o Número do CIM, selecione o Irmão e defina a Senha de Acesso.'
      );
      return;
    }

    if (usuariosCimDraft.some((u) => u.cim.trim() === cimLimpo)) {
      window.alert(
        `O CIM "${cimLimpo}" já está cadastrado na lista de acessos.`
      );
      return;
    }

    setUsuariosCimDraft((prev) => [
      ...prev,
      {
        cim: cimLimpo,
        irmaoNome: irmaoEscolhido,
        papel: novoCimPapel,
        senhaAcesso: senhaLimpa,
        ativo: true,
      },
    ]);
    // Também sincroniza o CIM no cadastro do Irmão no Quadro
    setDetalhesDraft((prev) => ({
      ...prev,
      [irmaoEscolhido]: {
        cim: cimLimpo,
        telefone: prev[irmaoEscolhido]?.telefone || '',
        status: prev[irmaoEscolhido]?.status || 'regular',
        membroHonorario: Boolean(prev[irmaoEscolhido]?.membroHonorario),
      },
    }));
    setNovoCimNumero('');
    setNovoCimSenha('');
  };

  const handleRemoverAcessoCim = (idx: number) => {
    if (usuariosCimDraft.length <= 1) {
      window.alert(
        'É necessário manter pelo menos 1 CIM ativo para acesso ao sistema.'
      );
      return;
    }
    const alvo = usuariosCimDraft[idx];
    if (
      !window.confirm(
        `Deseja remover o acesso do CIM ${alvo.cim} (${alvo.irmaoNome})?`
      )
    ) {
      return;
    }
    setUsuariosCimDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRestaurarPadrao = () => {
    if (
      !window.confirm(
        'Deseja restaurar o Quadro de Obreiros (30 Irmãos) e a Diretoria Titular padrão da Loja Alpha e Ômega Nº 3402?'
      )
    ) {
      return;
    }
    setIrmaosDraft([...IRMAOS_QUADRO]);
    setDiretoriaDraft({ ...DIRETORIA_TITULAR_PADRAO });
    setGestaoDraft('2025-2027');
  };

  const handleSalvarTudo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissoes.podeEditarQuadroDiretoria) {
      onClose();
      return;
    }
    setSalvando(true);
    try {
      salvarDetalhesIrmaosQuadroLocal(detalhesDraft);
      if (permissoes.podeGerenciarAcessosCim) {
        await salvarUsuariosCimSupabase(usuariosCimDraft, lojaId);
      }
      await onSave({
        irmaos: irmaosDraft,
        diretoria: diretoriaDraft,
        periodoGestao: gestaoDraft.trim() || '2025-2027',
        aplicarNaSessaoAtual,
      });
      onClose();
    } finally {
      setSalvando(false);
    }
  };

  const renderBadgeStatus = (status: StatusIrmaoQuadro) => {
    if (status === 'licenciado') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-400/20 dark:bg-amber-400/15 dark:border-amber-600/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200">
          Licenciado
        </span>
      );
    }
    if (status === 'irregular') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-300/80 bg-red-500/15 dark:bg-red-500/20 dark:border-red-700/60 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">
          Irregular
        </span>
      );
    }
    // Irmão Regular não exibe marca extra (padrão limpo)
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="relative my-8 w-full max-w-4xl rounded-2xl border-2 border-[#D4AF37] bg-[#F9F8F6] dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden animate-fadeIn">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between bg-[#0B192C] px-6 py-4 text-white border-b-2 border-[#D4AF37]">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-[#D4AF37]">👥</span>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-wide text-white">
                {permissoes.podeEditarQuadroDiretoria
                  ? 'Quadro de Obreiros, Diretoria Titular & Acessos por CIM'
                  : 'Consulta do Quadro de Obreiros & Diretoria da Loja'}
              </h3>
              <p className="text-xs text-slate-300">
                {permissoes.podeEditarQuadroDiretoria
                  ? 'Gerencie os Irmãos do Quadro (com CIM, WhatsApp, Status e Membro Honorário), Diretoria Titular e Login por CIM'
                  : 'Consulte a lista de Irmãos do Quadro, Membros Honorários, Diretoria e acione o WhatsApp diretamente'}
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

        {/* Abas Internas */}
        <div
          className={`grid grid-cols-1 ${
            permissoes.podeGerenciarAcessosCim
              ? 'sm:grid-cols-3'
              : 'sm:grid-cols-2'
          } border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}
        >
          <button
            type="button"
            onClick={() => setAbaAtiva('diretoria')}
            className={`py-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              abaAtiva === 'diretoria'
                ? 'border-[#D4AF37] bg-[#1a365d]/5 text-[#1a365d] dark:text-[#D4AF37]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🏛</span> 1. Diretoria Titular ({gestaoDraft})
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('quadro')}
            className={`py-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              abaAtiva === 'quadro'
                ? 'border-[#D4AF37] bg-[#1a365d]/5 text-[#1a365d] dark:text-[#D4AF37]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📜</span> 2. Quadro de Obreiros ({irmaosDraft.length})
          </button>

          {permissoes.podeGerenciarAcessosCim && (
            <button
              type="button"
              onClick={() => setAbaAtiva('acessos_cim')}
              className={`py-3.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                abaAtiva === 'acessos_cim'
                  ? 'border-[#D4AF37] bg-[#1a365d]/5 text-[#1a365d] dark:text-[#D4AF37]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🔐</span> 3. Acessos CIM ({usuariosCimDraft.length})
            </button>
          )}
        </div>

        <form onSubmit={handleSalvarTudo}>
          <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
            {feedbackBanco && (
              <div
                className={`rounded-xl border px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 ${
                  feedbackBanco.tipo === 'ok'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
                    : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200'
                }`}
              >
                <span>{feedbackBanco.texto}</span>
                <button
                  type="button"
                  onClick={() => setFeedbackBanco(null)}
                  className="text-[11px] font-bold underline shrink-0"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* ==============================================================
                ABA 1: DIRETORIA TITULAR DA GESTÃO
               ============================================================== */}
            {abaAtiva === 'diretoria' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center rounded-xl border border-[#D4AF37]/60 bg-white dark:bg-slate-800 p-4 shadow-sm">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37] mb-1">
                      Período da Gestão Atual *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!permissoes.podeEditarQuadroDiretoria}
                      value={gestaoDraft}
                      onChange={(e) => setGestaoDraft(e.target.value)}
                      placeholder="Ex: 2025-2027"
                      className="w-full rounded-lg border-2 border-[#1a365d] dark:border-[#D4AF37] bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm font-extrabold text-[#1a365d] dark:text-white disabled:opacity-70"
                    />
                  </div>

                  <div className="sm:col-span-8 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <p className="font-semibold text-[#1a365d] dark:text-amber-300">
                      Como funciona a Diretoria Titular:
                    </p>
                    <p>
                      Os Irmãos selecionados abaixo são os{' '}
                      <strong>Titulares oficiais da Gestão {gestaoDraft}</strong>
                      . Na sessão, sempre que outro Irmão for escolhido em um
                      cargo, o sistema o marcará automaticamente como{' '}
                      <strong>Substituto / Ad-hoc</strong>.
                    </p>
                  </div>
                </div>

                {/* Grid dos 10 Cargos Titulares */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CARGOS_CONFIG.map((cargo) => (
                    <div
                      key={cargo.key}
                      className={`rounded-xl border p-3.5 shadow-sm ${
                        cargo.destaque
                          ? 'border-[#D4AF37]/80 bg-amber-50/30 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70'
                      }`}
                    >
                      <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1.5">
                        {cargo.label} (Titular)
                      </label>
                      <select
                        disabled={!permissoes.podeEditarQuadroDiretoria}
                        value={diretoriaDraft[cargo.key]}
                        onChange={(e) =>
                          setDiretoriaDraft((prev) => ({
                            ...prev,
                            [cargo.key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 disabled:opacity-80"
                      >
                        {irmaosDraft.map((nome) => (
                          <option key={nome} value={nome}>
                            {nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {permissoes.podeEditarQuadroDiretoria && (
                  <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aplicarNaSessaoAtual}
                      onChange={(e) =>
                        setAplicarNaSessaoAtual(e.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#1a365d]"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Preencher também os cargos da sessão atual no formulário
                      com esta Diretoria Titular
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* ==============================================================
                ABA 2: QUADRO DE OBREIROS DA LOJA (NOME, CIM, WHATSAPP, STATUS E HONORÁRIO)
               ============================================================== */}
            {abaAtiva === 'quadro' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Barra de Adição de Novo Irmão (Exibida apenas para quem pode editar) */}
                {permissoes.podeEditarQuadroDiretoria && (
                  <div className="rounded-xl border-2 border-[#1a365d]/20 dark:border-[#D4AF37]/40 bg-white dark:bg-slate-800 p-4 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
                      ＋ Cadastrar Novo Irmão no Quadro da Loja
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      {/* Nome do Irmão */}
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                          Nome do Irmão *
                        </label>
                        <div className="flex items-center">
                          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-[#D4AF37] bg-amber-50 dark:bg-amber-950/50 px-2.5 py-2 text-xs font-bold text-[#1a365d] dark:text-[#D4AF37]">
                            Ir∴
                          </span>
                          <input
                            type="text"
                            value={novoIrmaoNome}
                            onChange={(e) => setNovoIrmaoNome(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdicionarIrmao();
                              }
                            }}
                            placeholder="NOME COMPLETO DO IRMÃO"
                            className="w-full rounded-r-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm uppercase font-semibold"
                          />
                        </div>
                      </div>

                      {/* Número CIM (Máscara 99999) */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                          Nº CIM (99999)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={novoIrmaoCim}
                          onChange={(e) =>
                            setNovoIrmaoCim(aplicarMascaraCim(e.target.value))
                          }
                          placeholder="99999"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-mono font-bold tracking-wider"
                        />
                      </div>

                      {/* Telefone Celular com DDD ((99) 99999-9999) */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                          Telefone / WhatsApp
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={15}
                          value={novoIrmaoTelefone}
                          onChange={(e) =>
                            setNovoIrmaoTelefone(
                              aplicarMascaraTelefoneCelular(e.target.value)
                            )
                          }
                          placeholder="(34) 99999-9999"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-mono font-semibold"
                        />
                      </div>

                      {/* Status do Irmão */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                          Situação / Status
                        </label>
                        <select
                          value={novoIrmaoStatus}
                          onChange={(e) =>
                            setNovoIrmaoStatus(
                              e.target.value as StatusIrmaoQuadro
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-2.5 py-2 text-xs font-bold"
                        >
                          <option value="regular">● Regular</option>
                          <option value="licenciado">◐ Licenciado</option>
                          <option value="irregular">○ Irregular</option>
                        </select>
                      </div>
                    </div>

                    {/* Linha inferior do cadastro: Membro Honorário + Botão Adicionar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none rounded-lg border border-sky-300 bg-sky-500/10 dark:bg-sky-500/15 dark:border-sky-700 px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={novoIrmaoHonorario}
                          onChange={(e) =>
                            setNovoIrmaoHonorario(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-sky-400 text-sky-700"
                        />
                        <span className="text-xs font-bold text-sky-800 dark:text-sky-200">
                          🎖️ Marcar como Membro Honorário da Loja (Destaque
                          Azul)
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={handleAdicionarIrmao}
                        className="rounded-lg bg-[#1a365d] px-5 py-2 text-xs font-bold text-white hover:bg-[#0B192C] transition-colors whitespace-nowrap"
                      >
                        ＋ Adicionar Irmão ao Quadro
                      </button>
                    </div>
                  </div>
                )}

                {/* Busca, Filtro de Status, Legenda Pastel e Listagem de Irmãos */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Irmãos Cadastrados ({irmaosFiltrados.length} de{' '}
                        {irmaosDraft.length})
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5">
                          Sem marca = Regular
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/80 bg-sky-500/15 px-2 py-0.5 text-sky-800 dark:text-sky-200">
                          🎖️ Azul = Membro Honorário
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-400/20 px-2 py-0.5 text-amber-800 dark:text-amber-200">
                          Amarelo = Licenciado
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-300/80 bg-red-500/15 px-2 py-0.5 text-red-700 dark:text-red-300">
                          Vermelho = Irregular
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <option value="todos">Todos os Irmãos</option>
                        <option value="regular">Apenas Regulares</option>
                        <option value="licenciado">Apenas Licenciados</option>
                        <option value="irregular">Apenas Irregulares</option>
                        <option value="honorario">
                          🎖️ Apenas Membros Honorários
                        </option>
                      </select>

                      <input
                        type="text"
                        value={buscaIrmao}
                        onChange={(e) => setBuscaIrmao(e.target.value)}
                        placeholder="🔍 Filtrar por nome, CIM ou telefone..."
                        className="w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 max-h-96 overflow-y-auto">
                    {irmaosFiltrados.map(
                      ({
                        nome,
                        cim,
                        telefone,
                        status,
                        membroHonorario,
                        indexOriginal,
                      }) => {
                        const estaEditando = indiceEditando === indexOriginal;
                        const linkWhatsApp = gerarLinkWhatsApp(telefone);

                        // Define o fundo pastel transparente conforme status ou Membro Honorário
                        const classeFundoLinha =
                          status === 'irregular'
                            ? 'bg-red-500/10 dark:bg-red-500/15 border-l-4 border-l-red-400 hover:bg-red-500/15'
                            : status === 'licenciado'
                              ? 'bg-amber-400/15 dark:bg-amber-400/15 border-l-4 border-l-amber-400 hover:bg-amber-400/25'
                              : membroHonorario
                                ? 'bg-sky-500/10 dark:bg-sky-500/15 border-l-4 border-l-sky-500 hover:bg-sky-500/15'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/40';

                        return (
                          <div
                            key={`${nome}-${indexOriginal}`}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 transition-colors ${classeFundoLinha}`}
                          >
                            {estaEditando ? (
                              <div className="w-full space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                  <div className="sm:col-span-4">
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                                      Nome do Irmão
                                    </label>
                                    <input
                                      type="text"
                                      value={textoEditando}
                                      onChange={(e) =>
                                        setTextoEditando(e.target.value)
                                      }
                                      placeholder="NOME DO IRMÃO"
                                      className="w-full rounded border border-[#1a365d] bg-[#F9F8F6] dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold uppercase"
                                    />
                                  </div>

                                  <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                                      Nº CIM (99999)
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={6}
                                      value={cimEditando}
                                      onChange={(e) =>
                                        setCimEditando(
                                          aplicarMascaraCim(e.target.value)
                                        )
                                      }
                                      placeholder="99999"
                                      className="w-full rounded border border-[#1a365d] bg-[#F9F8F6] dark:bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-bold tracking-wider"
                                    />
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                                      Telefone (DDD + Celular)
                                    </label>
                                    <input
                                      type="tel"
                                      inputMode="numeric"
                                      maxLength={15}
                                      value={telefoneEditando}
                                      onChange={(e) =>
                                        setTelefoneEditando(
                                          aplicarMascaraTelefoneCelular(
                                            e.target.value
                                          )
                                        )
                                      }
                                      placeholder="(34) 99999-9999"
                                      className="w-full rounded border border-[#1a365d] bg-[#F9F8F6] dark:bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-semibold"
                                    />
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                                      Situação / Status
                                    </label>
                                    <select
                                      value={statusEditando}
                                      onChange={(e) =>
                                        setStatusEditando(
                                          e.target.value as StatusIrmaoQuadro
                                        )
                                      }
                                      className="w-full rounded border border-[#1a365d] bg-[#F9F8F6] dark:bg-slate-900 px-2 py-1.5 text-xs font-bold"
                                    >
                                      <option value="regular">Regular</option>
                                      <option value="licenciado">
                                        Licenciado (Amarelo)
                                      </option>
                                      <option value="irregular">
                                        Irregular (Vermelho)
                                      </option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <label className="inline-flex items-center gap-2 cursor-pointer select-none rounded-md border border-sky-300 bg-sky-500/10 dark:bg-sky-500/20 px-2.5 py-1">
                                    <input
                                      type="checkbox"
                                      checked={honorarioEditando}
                                      onChange={(e) =>
                                        setHonorarioEditando(e.target.checked)
                                      }
                                      className="h-3.5 w-3.5 rounded border-sky-400 text-sky-700"
                                    />
                                    <span className="text-xs font-bold text-sky-800 dark:text-sky-200">
                                      🎖️ Membro Honorário (Azul)
                                    </span>
                                  </label>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleConfirmarEdicaoIrmao(
                                          indexOriginal
                                        )
                                      }
                                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                                    >
                                      ✓ Confirmar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIndiceEditando(null)}
                                      className="rounded border border-slate-300 px-2.5 py-1 text-xs"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`text-xs sm:text-sm font-bold ${
                                      status === 'irregular'
                                        ? 'text-red-800 dark:text-red-300'
                                        : status === 'licenciado'
                                          ? 'text-amber-900 dark:text-amber-200'
                                          : membroHonorario
                                            ? 'text-sky-800 dark:text-sky-200'
                                            : 'text-slate-800 dark:text-slate-100'
                                    }`}
                                  >
                                    {nome}
                                  </span>

                                  {/* Marca discreta Azul de Membro Honorário */}
                                  {membroHonorario && (
                                    <span
                                      title="Membro Honorário da Loja"
                                      className="inline-flex items-center gap-1 rounded-full border border-sky-300/80 bg-sky-500/15 dark:bg-sky-500/20 dark:border-sky-600/60 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 dark:text-sky-200"
                                    >
                                      🎖️ Honorário
                                    </span>
                                  )}

                                  {/* Badge de Status apenas quando NÃO for Regular (Licenciado = Amarelo, Irregular = Vermelho) */}
                                  {renderBadgeStatus(status)}

                                  {/* Badge de CIM (exibido quando preenchido) */}
                                  {cim && (
                                    <span className="inline-flex items-center rounded-md bg-[#0B192C] px-2 py-0.5 text-[11px] font-mono font-bold text-[#D4AF37]">
                                      CIM: {cim}
                                    </span>
                                  )}

                                  {/* Apenas o Ícone do WhatsApp quando o Irmão possui telefone cadastrado */}
                                  {telefone && linkWhatsApp && (
                                    <a
                                      href={linkWhatsApp}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={`Conversar no WhatsApp com ${nome}`}
                                      aria-label={`Conversar no WhatsApp com ${nome}`}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/80 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors shadow-2xs"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="h-4 w-4"
                                      >
                                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.625.846 5.059 2.284 7.033l-1.492 4.455 4.614-1.466c1.911 1.253 4.197 1.978 6.594 1.978 6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
                                      </svg>
                                    </a>
                                  )}
                                </div>

                                {permissoes.podeEditarQuadroDiretoria && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIndiceEditando(indexOriginal);
                                        setTextoEditando(
                                          nome.replace(/^Ir∴\s*/i, '')
                                        );
                                        setCimEditando(cim);
                                        setTelefoneEditando(telefone);
                                        setStatusEditando(status || 'regular');
                                        setHonorarioEditando(
                                          Boolean(membroHonorario)
                                        );
                                      }}
                                      className="rounded border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                                    >
                                      ✎ Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoverIrmao(indexOriginal)
                                      }
                                      className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                ABA 3: ACESSOS E SENHAS POR NÚMERO CIM
               ============================================================== */}
            {abaAtiva === 'acessos_cim' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="rounded-xl border border-[#D4AF37]/60 bg-amber-50/40 dark:bg-slate-800 p-4 text-xs text-slate-700 dark:text-slate-200 space-y-1">
                  <p className="font-bold text-[#1a365d] dark:text-[#D4AF37]">
                    🔐 Controle de Login por Número CIM (Cadastro de
                    Identificação Maçônica)
                  </p>
                  <p>
                    Cadastre abaixo os números CIM dos Irmãos autorizados a
                    acessar o sistema da Secretaria (ex: Secretário, Venerável
                    Mestre, Orador) e defina ou altere suas senhas.
                  </p>
                </div>

                {/* Formulário de Novo Acesso CIM */}
                <div className="rounded-xl border-2 border-[#1a365d]/20 dark:border-[#D4AF37]/40 bg-white dark:bg-slate-800 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
                    ＋ Autorizar Novo Número CIM para Login
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Irmão do Quadro *
                      </label>
                      <select
                        value={
                          novoCimIrmao ||
                          diretoriaDraft.secretario ||
                          irmaosDraft[0] ||
                          ''
                        }
                        onChange={(e) => {
                          const irmaoSel = e.target.value;
                          setNovoCimIrmao(irmaoSel);
                          const cimDoQuadro = detalhesDraft[irmaoSel]?.cim;
                          if (cimDoQuadro) {
                            setNovoCimNumero(cimDoQuadro);
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
                      >
                        {irmaosDraft.map((nome) => {
                          const det = detalhesDraft[nome];
                          const sufixos = [
                            det?.cim ? `CIM: ${det.cim}` : '',
                            det?.membroHonorario ? '🎖️ Honorário' : '',
                            det?.status && det.status !== 'regular'
                              ? LABELS_STATUS_IRMAO[det.status]
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' • ');
                          return (
                            <option key={nome} value={nome}>
                              {nome} {sufixos ? `(${sufixos})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Número CIM (99999) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={novoCimNumero}
                        onChange={(e) =>
                          setNovoCimNumero(aplicarMascaraCim(e.target.value))
                        }
                        placeholder="99999"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs font-mono font-bold tracking-wider"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Perfil / Cargo
                      </label>
                      <select
                        value={novoCimPapel}
                        onChange={(e) =>
                          setNovoCimPapel(e.target.value as PapelUsuarioCim)
                        }
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold"
                      >
                        <option value="secretario">Secretário</option>
                        <option value="veneravel">Venerável Mestre</option>
                        <option value="orador">Orador</option>
                        <option value="obreiro">Obreiro / Consulta</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                        Senha *
                      </label>
                      <input
                        type="text"
                        value={novoCimSenha}
                        onChange={(e) => setNovoCimSenha(e.target.value)}
                        placeholder="Senha..."
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAdicionarAcessoCim}
                      className="rounded-lg bg-[#1a365d] px-4 py-2 text-xs font-bold text-white hover:bg-[#0B192C] transition-colors"
                    >
                      ＋ Incluir CIM Autorizado
                    </button>
                  </div>
                </div>

                {/* Lista de CIMs Cadastrados */}
                <div className="divide-y divide-slate-200 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                  {usuariosCimDraft.map((u, idx) => (
                    <div
                      key={`${u.cim}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#0B192C] px-2.5 py-0.5 text-xs font-extrabold text-[#D4AF37]">
                            CIM: {u.cim}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                            {u.irmaoNome}
                          </span>
                          <span className="rounded-full border border-slate-300 dark:border-slate-600 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {LABELS_PAPEL_CIM[u.papel] || u.papel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Senha atual:{' '}
                          <code className="rounded bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 font-mono font-bold text-slate-700 dark:text-amber-300">
                            {u.senhaAcesso}
                          </code>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {cimEditandoSenhaIdx === idx ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={novaSenhaEditando}
                              onChange={(e) =>
                                setNovaSenhaEditando(e.target.value)
                              }
                              placeholder="Nova senha..."
                              className="w-28 rounded border border-[#1a365d] bg-[#F9F8F6] dark:bg-slate-900 px-2 py-1 text-xs font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!novaSenhaEditando.trim()) return;
                                setUsuariosCimDraft((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          senhaAcesso: novaSenhaEditando.trim(),
                                        }
                                      : item
                                  )
                                );
                                setCimEditandoSenhaIdx(null);
                                setNovaSenhaEditando('');
                              }}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white"
                            >
                              ✓ OK
                            </button>
                            <button
                              type="button"
                              onClick={() => setCimEditandoSenhaIdx(null)}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setCimEditandoSenhaIdx(idx);
                                setNovaSenhaEditando(u.senhaAcesso);
                              }}
                              className="rounded border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                            >
                              🔑 Alterar Senha
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoverAcessoCim(idx)}
                              className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rodapé de Ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-950 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            {permissoes.podeEditarQuadroDiretoria ? (
              <button
                type="button"
                onClick={handleRestaurarPadrao}
                className="rounded-lg border border-slate-300 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                ↺ Restaurar Quadro & Diretoria Padrão
              </button>
            ) : (
              <span className="text-xs text-slate-500">
                🔒 Modo Consulta ({LABELS_PAPEL_CIM[papelUsuario]})
              </span>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                {permissoes.podeEditarQuadroDiretoria ? 'Cancelar' : 'Fechar'}
              </button>
              {permissoes.podeEditarQuadroDiretoria && (
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-lg bg-[#D4AF37] px-5 py-2.5 text-xs font-extrabold text-[#0B192C] shadow hover:bg-[#c5a02e] transition-colors disabled:opacity-50"
                >
                  {salvando
                    ? 'Salvando no Supabase...'
                    : '✓ Salvar Alterações'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
