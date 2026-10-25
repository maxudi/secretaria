import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BalaustreFormData,
  balaustreSchema,
  carregarConfiguracaoLojaSalva,
  carregarDiretoriaTitularSalva,
  carregarIrmaosQuadroSalvos,
  CenarioEscrutinioOrdemDia,
  ConfiguracaoLoja,
  DEFAULT_CONFIGURACAO_LOJA,
  DestinoOficioPrancha,
  DIRETORIA_TITULAR_PADRAO,
  DiretoriaTitularMap,
  LABELS_PAPEL_CIM,
  LojaTenant,
  obterPermissoesUsuario,
  OrigemOficioPrancha,
  ResultadoVotacaoOrdemDia,
  salvarConfiguracaoLojaLocal,
  salvarSessaoUsuarioLogado,
  SessaoUsuarioLogado,
  SubtipoConviteExpediente,
  TEXTOS_MANIFESTACAO_ORDEM_DIA,
  TipoExpedienteRecebido,
  TipoItemOrdemDia,
  TipoManifestacaoOrdemDia,
  TIPOS_CLASSIFICACAO_OFICIO,
} from '../types/balaustre';
import {
  comporRedacaoItemOrdemDia,
  comporTextoExpedienteConvite,
  comporTituloOrdemDiaDeOficio,
  dataPorExtensoLiturgica,
  ehRitoBrasileiro,
  formatarListaBalaustresLidos,
  formatarMoedaBRL,
  formatarTroncoComExtenso,
  gerarFrasePadraoSacoPropostas,
  gerarTextoLiturgico,
  valorMonetarioPorExtenso,
} from '../utils/liturgyFormatter';
import { TODAS_UFS_BRASIL } from '../data/lojasCatalogo';
import {
  DEFAULT_LOJA_ALPHA_OMEGA_ID,
  salvarBalaustreSupabase,
  salvarConfiguracaoLojaSupabase,
  salvarQuadroEDiretoriaSupabase,
  sincronizarDadosIniciaisSupabase,
} from '../lib/supabase';
import { IrmaoSelectField } from './IrmaoSelectField';
import { ColunaFalasFieldArray } from './ColunaFalasFieldArray';
import { BalaustrePreviewModal } from './BalaustrePreviewModal';
import { ConfiguracaoLojaModal } from './ConfiguracaoLojaModal';
import { GerenciadorQuadroDiretoriaModal } from './GerenciadorQuadroDiretoriaModal';
import { GerenciadorLojasMultiTenantModal } from './GerenciadorLojasMultiTenantModal';
import { HistoricoBalaustresModal } from './HistoricoBalaustresModal';
import { AssistenteManifestacoesItem8 } from './AssistenteManifestacoesItem8';
import { SeletorLojaVisitante } from './SeletorLojaVisitante';

interface BalaustreFormProps {
  ultimoBalaustreNumero?: number;
  onSuccessSave?: (data: BalaustreFormData) => void;
  sessaoLogada?: SessaoUsuarioLogado | null;
  onLogout?: () => void;
}

type AbaId = 'basicos' | 'expediente' | 'ordem_dia' | 'palavra_encerramento';

export const BalaustreForm: React.FC<BalaustreFormProps> = ({
  ultimoBalaustreNumero = 141,
  onSuccessSave,
  sessaoLogada,
  onLogout,
}) => {
  const permissoes = obterPermissoesUsuario(sessaoLogada?.papel);
  const [lojaIdAtiva, setLojaIdAtiva] = useState<string>(
    () => sessaoLogada?.lojaId || DEFAULT_LOJA_ALPHA_OMEGA_ID
  );
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('basicos');
  const [exibirTodasSecoes, setExibirTodasSecoes] = useState(false);
  const [modalPreviewAberto, setModalPreviewAberto] = useState(false);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [modalMultiLojasAberto, setModalMultiLojasAberto] = useState(false);
  const [modalQuadroDiretoriaAberto, setModalQuadroDiretoriaAberto] =
    useState(false);
  const [abaInicialQuadroModal, setAbaInicialQuadroModal] = useState<
    'diretoria' | 'quadro' | 'acessos_cim'
  >('diretoria');
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [irmaosQuadro, setIrmaosQuadro] = useState<string[]>(() =>
    carregarIrmaosQuadroSalvos()
  );
  const [diretoriaTitular, setDiretoriaTitular] =
    useState<DiretoriaTitularMap>(() => carregarDiretoriaTitularSalva());
  const [salvandoSupabase, setSalvandoSupabase] = useState(false);
  const [tipoNovoExpediente, setTipoNovoExpediente] =
    useState<TipoExpedienteRecebido>('normal');
  const [tipoNovaOrdemDia, setTipoNovaOrdemDia] =
    useState<TipoItemOrdemDia>('leitura_simples');
  const [statusFeedback, setStatusFeedback] = useState<{
    tipo: 'sucesso' | 'erro';
    mensagem: string;
  } | null>(null);

  const hojeIso = new Date().toISOString().split('T')[0];
  const configInicialLoja = carregarConfiguracaoLojaSalva();
  const diretoriaInicial = carregarDiretoriaTitularSalva();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<BalaustreFormData>({
    resolver: zodResolver(balaustreSchema) as any,
    defaultValues: {
      configuracaoLoja: configInicialLoja,
      numeroBalaustre: ultimoBalaustreNumero + 1,
      dataSessao: hojeIso,
      horarioAbertura: '20:00',
      grauTrabalhos: 'aprendiz',
      tipoSessao: 'ordinaria',
      cargos: {
        veneravelMestre: {
          irmaoSelecionado: diretoriaInicial.veneravelMestre,
          nomeOutro: '',
          isTitular: true,
        },
        primeiroVigilante: {
          irmaoSelecionado: diretoriaInicial.primeiroVigilante,
          nomeOutro: '',
          isTitular: true,
        },
        segundoVigilante: {
          irmaoSelecionado: diretoriaInicial.segundoVigilante,
          nomeOutro: '',
          isTitular: true,
        },
        orador: {
          irmaoSelecionado: diretoriaInicial.orador,
          nomeOutro: '',
          isTitular: true,
        },
        secretario: {
          irmaoSelecionado: diretoriaInicial.secretario,
          nomeOutro: '',
          isTitular: true,
        },
        tesoureiro: {
          irmaoSelecionado: diretoriaInicial.tesoureiro,
          nomeOutro: '',
          isTitular: true,
        },
        chanceler: {
          irmaoSelecionado: diretoriaInicial.chanceler,
          nomeOutro: '',
          isTitular: true,
        },
        mestreCerimonias: {
          irmaoSelecionado: diretoriaInicial.mestreCerimonias,
          nomeOutro: '',
          isTitular: true,
        },
        hospitaleiro: {
          irmaoSelecionado: diretoriaInicial.hospitaleiro,
          nomeOutro: '',
          isTitular: true,
        },
        cobridorInterno: {
          irmaoSelecionado: diretoriaInicial.cobridorInterno,
          nomeOutro: '',
          isTitular: true,
        },
      },
      quorum: {
        qtdQuadroPresentes: 21,
        qtdVisitantesPresentes: 0,
      },
      balaustresLidos: [
        {
          numero: ultimoBalaustreNumero,
          statusAprovacao: 'aprovado_sem_restricoes',
          emendasObservacao: '',
        },
      ],
      expedientesRecebidos: [],
      sacoPropostasResultadoGeral:
        'O saco de propostas e informações colheu apenas bons fluidos.',
      itensSacoPropostas: [],
      itensOrdemDia: [],
      tempoInstrucao: {
        temaTitulo: '',
        apresentadorSelecionado: '',
        apresentadorOutro: '',
        resumoInstrucao: '',
      },
      troncoBeneficencia: {
        valorApurado: 'R$ 0,00',
        valorPorExtenso: 'zero reais',
        destinoConferencia: 'A cargo e julgo da hospitalaria',
      },
      palavraBemDaOrdem: {
        textoConsolidadoAta: '',
        colunaSul: [],
        colunaNorte: [],
        colunaOriente: [],
        colunaAltar: [],
        palavraOrador:
          'Saudou os IIr∴ presentes e visitantes, atestando que os trabalhos transcorreram de forma justa, perfeita e dentro da legalidade maçônica.',
        palavraVeneravelMestre:
          'Agradeceu a presença e dedicação dos IIr∴ do Quadro e Visitantes, desejando um retorno seguro aos seus lares.',
      },
      horarioEncerramento: '21:45',
    },
  });

  // Field Arrays para listas dinâmicas
  const balaustresArray = useFieldArray({
    control,
    name: 'balaustresLidos',
  });

  const expedientesArray = useFieldArray({
    control,
    name: 'expedientesRecebidos',
  });

  const sacoItensArray = useFieldArray({
    control,
    name: 'itensSacoPropostas',
  });

  const ordemDiaArray = useFieldArray({
    control,
    name: 'itensOrdemDia',
  });

  // Observadores em tempo real para UI
  const lojaConfigWatch = watch('configuracaoLoja') || DEFAULT_CONFIGURACAO_LOJA;
  const dataSessaoWatch = watch('dataSessao');
  const qtdQuadroWatch = watch('quorum.qtdQuadroPresentes') || 0;
  const qtdVisitantesWatch = watch('quorum.qtdVisitantesPresentes') || 0;
  const totalPresentes = Number(qtdQuadroWatch) + Number(qtdVisitantesWatch);

  // Garante que o texto padrão da Hospitalaria e os novos campos do cabeçalho da Loja apareçam mesmo após Hot Reload
  useEffect(() => {
    const destinoAtual = getValues('troncoBeneficencia.destinoConferencia');
    if (
      !destinoAtual ||
      destinoAtual ===
        'Conferido e anunciado pelo Ir∴ Tesoureiro e entregue ao Ir∴ Hospitaleiro'
    ) {
      setValue(
        'troncoBeneficencia.destinoConferencia',
        'A cargo e julgo da hospitalaria'
      );
    }

    const configSalva = carregarConfiguracaoLojaSalva();
    setValue('configuracaoLoja', configSalva);

    const sacoAtual = getValues('sacoPropostasResultadoGeral');
    if (!sacoAtual || !sacoAtual.trim()) {
      const qtdItens = (getValues('itensSacoPropostas') || []).length;
      setValue(
        'sacoPropostasResultadoGeral',
        gerarFrasePadraoSacoPropostas(qtdItens)
      );
    }

    // Sincroniza Quadro de Obreiros, Diretoria Titular e Cabeçalho/Logo da Loja ativa com o Supabase
    sincronizarDadosIniciaisSupabase(lojaIdAtiva).then((res) => {
      if (res.irmaos.length > 0) {
        setIrmaosQuadro(res.irmaos);
      }
      setDiretoriaTitular(res.diretoria);
      if (res.configLoja) {
        const atual = getValues('configuracaoLoja');
        const mesclada: ConfiguracaoLoja = {
          ...atual,
          ...res.configLoja,
          logoUrl: res.configLoja.logoUrl ?? atual.logoUrl ?? '',
        };
        setValue('configuracaoLoja', mesclada);
        salvarConfiguracaoLojaLocal(mesclada);
      }
    });
  }, [getValues, setValue, lojaIdAtiva]);

  const handleSelecionarLojaMultiTenant = async (loja: LojaTenant) => {
    setLojaIdAtiva(loja.id);
    const novaConfig: ConfiguracaoLoja = {
      invocacao: loja.invocacao || DEFAULT_CONFIGURACAO_LOJA.invocacao,
      nomeLoja: loja.nomeLoja,
      numeroLoja: loja.numeroLoja,
      potenciaJurisdicao: loja.potenciaJurisdicao,
      reunioesDiaHora: loja.reunioesDiaHora,
      ritoPotencia: loja.ritoPotencia,
      enderecoTemplo: loja.enderecoTemplo,
      orienteCidadeUf: loja.orienteCidadeUf,
      emailLoja: loja.emailLoja,
      gestao: loja.gestao,
      logoUrl: loja.logoUrl || '',
    };
    setValue('configuracaoLoja', novaConfig, { shouldDirty: true });
    salvarConfiguracaoLojaLocal(novaConfig);

    if (sessaoLogada) {
      salvarSessaoUsuarioLogado({
        ...sessaoLogada,
        lojaId: loja.id,
        nomeLoja: loja.nomeLoja,
        numeroLoja: loja.numeroLoja,
      });
    }

    const res = await sincronizarDadosIniciaisSupabase(loja.id);
    if (res.irmaos.length > 0) {
      setIrmaosQuadro(res.irmaos);
    }
    setDiretoriaTitular(res.diretoria);

    setStatusFeedback({
      tipo: 'sucesso',
      mensagem: `Ambiente Multi-Tenant alternado para: ${loja.nomeLoja} Nº ${loja.numeroLoja} (${loja.orienteCidadeUf})!`,
    });
  };

  const handleSalvarConfiguracaoLoja = (novaConfig: ConfiguracaoLoja) => {
    setValue('configuracaoLoja', novaConfig, { shouldDirty: true });
    salvarConfiguracaoLojaSupabase(novaConfig, lojaIdAtiva);
    setStatusFeedback({
      tipo: 'sucesso',
      mensagem:
        'Configurações da Loja e Logomarca (bucket logomarcas) atualizadas com sucesso!',
    });
  };

  const handleSalvarQuadroEDiretoria = async (dados: {
    irmaos: string[];
    diretoria: DiretoriaTitularMap;
    periodoGestao: string;
    aplicarNaSessaoAtual: boolean;
  }) => {
    const irmaosOrdenados = [...dados.irmaos].sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
    setIrmaosQuadro(irmaosOrdenados);
    setDiretoriaTitular(dados.diretoria);

    // Atualiza também o campo gestão no cabeçalho da Loja
    const configAtual = getValues('configuracaoLoja');
    const configAtualizada: ConfiguracaoLoja = {
      ...configAtual,
      gestao: dados.periodoGestao,
    };
    setValue('configuracaoLoja', configAtualizada, { shouldDirty: true });
    salvarConfiguracaoLojaLocal(configAtualizada);

    if (dados.aplicarNaSessaoAtual) {
      (
        Object.keys(dados.diretoria) as (keyof DiretoriaTitularMap)[]
      ).forEach((cargoKey) => {
        setValue(
          `cargos.${cargoKey}.irmaoSelecionado`,
          dados.diretoria[cargoKey],
          { shouldDirty: true }
        );
        setValue(`cargos.${cargoKey}.isTitular`, true, { shouldDirty: true });
      });
    } else {
      // Recalcula automaticamente se os selecionados na sessão atual são titulares ou substitutos
      (
        Object.keys(dados.diretoria) as (keyof DiretoriaTitularMap)[]
      ).forEach((cargoKey) => {
        const selecionadoAtual =
          getValues(`cargos.${cargoKey}.irmaoSelecionado`) || '';
        const ehTitular =
          selecionadoAtual.trim() === dados.diretoria[cargoKey].trim();
        setValue(`cargos.${cargoKey}.isTitular`, ehTitular, {
          shouldDirty: true,
        });
      });
    }

    const res = await salvarQuadroEDiretoriaSupabase({
      irmaos: irmaosOrdenados,
      diretoria: dados.diretoria,
      periodoGestao: dados.periodoGestao,
      lojaId: lojaIdAtiva,
    });

    setStatusFeedback({
      tipo: 'sucesso',
      mensagem: res.mensagem,
    });
  };

  // Ação 1: Exportar Texto/Minuta (.TXT)
  const handleExportarMinutaTxt = () => {
    const valoresAtuais = getValues();
    const texto = gerarTextoLiturgico(valoresAtuais);
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Balaustre_${valoresAtuais.numeroBalaustre}_${valoresAtuais.dataSessao}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);

    setStatusFeedback({
      tipo: 'sucesso',
      mensagem: `Minuta litúrgica do Balaústre Nº ${valoresAtuais.numeroBalaustre} exportada com sucesso (.txt).`,
    });
  };

  // Ação 3: Salvar no Supabase
  const onSubmit = async (data: BalaustreFormData) => {
    if (!permissoes.podeEditarBalaustre) {
      setStatusFeedback({
        tipo: 'erro',
        mensagem:
          'Seu perfil atual é de somente consulta e não possui permissão para gravar Balaústres.',
      });
      return;
    }
    try {
      setSalvandoSupabase(true);
      setStatusFeedback(null);
      const resultado = await salvarBalaustreSupabase(data, lojaIdAtiva);
      setStatusFeedback({
        tipo: 'sucesso',
        mensagem: resultado.message,
      });
      onSuccessSave?.(data);
    } catch (err: any) {
      setStatusFeedback({
        tipo: 'erro',
        mensagem:
          err?.message || 'Ocorreu um erro ao salvar o Balaústre no Supabase.',
      });
    } finally {
      setSalvandoSupabase(false);
    }
  };

  // Carregar Balaústre salvo do Histórico para edição ou visualização
  const handleCarregarBalaustreDoHistorico = (
    dadosHistorico: BalaustreFormData,
    abrirPreviewDireto = false
  ) => {
    reset(dadosHistorico);
    setStatusFeedback({
      tipo: 'sucesso',
      mensagem: `Balaústre Nº ${dadosHistorico.numeroBalaustre}-${dadosHistorico.configuracaoLoja?.gestao || '2025-2027'} carregado com sucesso no formulário!`,
    });
    if (abrirPreviewDireto) {
      setTimeout(() => setModalPreviewAberto(true), 120);
    }
  };

  // Iniciar um Novo Balaústre limpo com o próximo número
  const handleNovoBalaustre = (proximoNumero: number) => {
    const configAtual = getValues('configuracaoLoja');
    reset({
      configuracaoLoja: configAtual,
      numeroBalaustre: proximoNumero,
      dataSessao: hojeIso,
      horarioAbertura: '20:00',
      grauTrabalhos: 'aprendiz',
      tipoSessao: 'ordinaria',
      cargos: {
        veneravelMestre: {
          irmaoSelecionado: diretoriaTitular.veneravelMestre,
          nomeOutro: '',
          isTitular: true,
        },
        primeiroVigilante: {
          irmaoSelecionado: diretoriaTitular.primeiroVigilante,
          nomeOutro: '',
          isTitular: true,
        },
        segundoVigilante: {
          irmaoSelecionado: diretoriaTitular.segundoVigilante,
          nomeOutro: '',
          isTitular: true,
        },
        orador: {
          irmaoSelecionado: diretoriaTitular.orador,
          nomeOutro: '',
          isTitular: true,
        },
        secretario: {
          irmaoSelecionado: diretoriaTitular.secretario,
          nomeOutro: '',
          isTitular: true,
        },
        tesoureiro: {
          irmaoSelecionado: diretoriaTitular.tesoureiro,
          nomeOutro: '',
          isTitular: true,
        },
        chanceler: {
          irmaoSelecionado: diretoriaTitular.chanceler,
          nomeOutro: '',
          isTitular: true,
        },
        mestreCerimonias: {
          irmaoSelecionado: diretoriaTitular.mestreCerimonias,
          nomeOutro: '',
          isTitular: true,
        },
        hospitaleiro: {
          irmaoSelecionado: diretoriaTitular.hospitaleiro,
          nomeOutro: '',
          isTitular: true,
        },
        cobridorInterno: {
          irmaoSelecionado: diretoriaTitular.cobridorInterno,
          nomeOutro: '',
          isTitular: true,
        },
      },
      quorum: {
        qtdQuadroPresentes: 21,
        qtdVisitantesPresentes: 0,
      },
      balaustresLidos: [
        {
          numero: Math.max(1, proximoNumero - 1),
          statusAprovacao: 'aprovado_sem_restricoes',
          emendasObservacao: '',
        },
      ],
      expedientesRecebidos: [],
      sacoPropostasResultadoGeral: gerarFrasePadraoSacoPropostas(0),
      itensSacoPropostas: [],
      itensOrdemDia: [],
      tempoInstrucao: {
        temaTitulo: '',
        apresentadorSelecionado: '',
        apresentadorOutro: '',
        resumoInstrucao: '',
      },
      troncoBeneficencia: {
        valorApurado: 'R$ 0,00',
        valorPorExtenso: 'zero reais',
        destinoConferencia: 'A cargo e julgo da hospitalaria',
      },
      palavraBemDaOrdem: {
        textoConsolidadoAta: '',
        colunaSul: [],
        colunaNorte: [],
        colunaOriente: [],
        colunaAltar: [],
        palavraOrador: '',
        palavraVeneravelMestre: '',
      },
      horarioEncerramento: '22:00',
    });
    setAbaAtiva('basicos');
    setStatusFeedback({
      tipo: 'sucesso',
      mensagem: `Novo Balaústre Nº ${proximoNumero} iniciado e pronto para lavratura!`,
    });
  };

  const abas: { id: AbaId; numero: string; titulo: string; subtitulo: string }[] =
    [
      {
        id: 'basicos',
        numero: '01',
        titulo: 'Dados Básicos & Cargos',
        subtitulo: 'Metadados, Oficiais e Quórum',
      },
      {
        id: 'expediente',
        numero: '02',
        titulo: 'Expediente & Saco de Propostas',
        subtitulo: 'Balaústres, Pranchas e Giro',
      },
      {
        id: 'ordem_dia',
        numero: '03',
        titulo: 'Ordem do Dia & Instruções',
        subtitulo: 'Deliberações, Estudos e Tronco',
      },
      {
        id: 'palavra_encerramento',
        numero: '04',
        titulo: 'Palavra & Encerramento',
        subtitulo: 'Colunas, Orador, V∴M∴ e Saída',
      },
    ];

  return (
    <div className="min-h-screen bg-[#F9F8F6] dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-6 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      <div className="mx-auto max-w-5xl print:hidden">
        {/* BARRA SUPERIOR DE AUTENTICAÇÃO POR CIM & MULTI-TENANT */}
        {sessaoLogada && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/60 bg-[#0B192C] px-4 py-2.5 text-xs text-white shadow-md">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#D4AF37] px-2.5 py-0.5 text-[11px] font-extrabold text-[#0B192C]">
                🔐 CIM {sessaoLogada.cim}
              </span>
              <span className="font-bold text-white">
                {sessaoLogada.irmaoNome}
              </span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="rounded-full border border-[#D4AF37]/40 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
                {LABELS_PAPEL_CIM[sessaoLogada.papel] || sessaoLogada.papel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {permissoes.podeGerenciarMultiLojas && (
                <button
                  type="button"
                  onClick={() => setModalMultiLojasAberto(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#D4AF37] bg-[#D4AF37] px-3 py-1 text-[11px] font-extrabold text-[#0B192C] hover:bg-[#e5c145] transition-colors shadow"
                >
                  🏛️ Painel Multi-Lojas (Super Admin)
                </button>
              )}

              <button
                type="button"
                onClick={() => setModalHistoricoAberto(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#D4AF37]/60 bg-[#1a365d] px-3 py-1 text-[11px] font-bold text-[#D4AF37] hover:bg-[#132847] transition-colors"
              >
                📚 Histórico de Balaústres
              </button>

              {permissoes.podeGerenciarAcessosCim && (
                <button
                  type="button"
                  onClick={() => {
                    setAbaInicialQuadroModal('acessos_cim');
                    setModalQuadroDiretoriaAberto(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/20 transition-colors"
                >
                  🔑 Senhas & CIMs
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-400/50 bg-red-950/60 px-2.5 py-1 text-[11px] font-bold text-red-200 hover:bg-red-900/70 transition-colors"
                >
                  🚪 Sair
                </button>
              )}
            </div>
          </div>
        )}

        {/* AVISO DE MODO SOMENTE CONSULTA (PARA PERFIL OBREIRO) */}
        {permissoes.somenteConsulta && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300 bg-sky-500/10 dark:bg-sky-950/50 dark:border-sky-800 px-4 py-3 text-xs text-sky-900 dark:text-sky-100">
            <div className="space-y-0.5">
              <p className="font-extrabold">
                👁️ Modo Consulta do Obreiro ({sessaoLogada?.irmaoNome})
              </p>
              <p className="text-[11px] text-sky-800/90 dark:text-sky-200/80">
                Você pode consultar e imprimir os Balaústres arquivados no
                Histórico ou consultar o Quadro de Obreiros para acionar o
                WhatsApp dos Irmãos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(true)}
                className="rounded-lg bg-[#0B192C] px-3 py-1.5 text-xs font-bold text-[#D4AF37] border border-[#D4AF37]"
              >
                📚 Ver / Imprimir Balaústres
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbaInicialQuadroModal('quadro');
                  setModalQuadroDiretoriaAberto(true);
                }}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
              >
                👥 Quadro & WhatsApp dos Irmãos
              </button>
            </div>
          </div>
        )}

        {/* CABEÇALHO DINÂMICO INSTITUCIONAL DA LOJA */}
        <header className="rounded-t-2xl bg-gradient-to-r from-[#0B192C] via-[#1a365d] to-[#0B192C] p-6 sm:p-8 text-white shadow-lg border-b-4 border-[#D4AF37]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Bloco Esquerdo: Logomarca + Dados Dinâmicos da Loja */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <button
                type="button"
                onClick={() => {
                  if (permissoes.podeConfigurarCabecalhoLoja) {
                    setModalConfigAberto(true);
                  }
                }}
                title={
                  permissoes.podeConfigurarCabecalhoLoja
                    ? 'Clique para enviar ou alterar a Logomarca da Loja no bucket logomarcas'
                    : 'Logomarca da Loja'
                }
                className="group relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-white/95 p-1.5 shadow-md transition-transform hover:scale-105 overflow-hidden"
              >
                {lojaConfigWatch.logoUrl ? (
                  <img
                    src={lojaConfigWatch.logoUrl}
                    alt="Logomarca da Loja"
                    className="h-full w-full object-contain rounded-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#1a365d]">
                    <span className="text-2xl font-bold text-[#D4AF37]">∴</span>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-600">
                      + Logo
                    </span>
                  </div>
                )}
                {permissoes.podeConfigurarCabecalhoLoja && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0B192C]/80 text-[10px] font-bold text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity">
                    Trocar Logo
                  </div>
                )}
              </button>

              <div className="space-y-0.5 font-sans font-bold">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white uppercase">
                  {(
                    lojaConfigWatch.nomeLoja || 'LOJA MAÇÔNICA ALPHA E ÔMEGA'
                  ).toUpperCase()}{' '}
                  {lojaConfigWatch.numeroLoja
                    ? `N° ${lojaConfigWatch.numeroLoja}`
                    : ''}
                </h1>

                {(lojaConfigWatch.potenciaJurisdicao ||
                  DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao) && (
                  <p className="text-xs sm:text-sm font-bold text-[#D4AF37]">
                    {lojaConfigWatch.potenciaJurisdicao ||
                      DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao}
                  </p>
                )}

                {(lojaConfigWatch.reunioesDiaHora ||
                  lojaConfigWatch.ritoPotencia) && (
                  <p className="text-xs sm:text-sm font-bold text-slate-200">
                    {[
                      lojaConfigWatch.reunioesDiaHora ||
                        DEFAULT_CONFIGURACAO_LOJA.reunioesDiaHora,
                      (
                        lojaConfigWatch.ritoPotencia ||
                        DEFAULT_CONFIGURACAO_LOJA.ritoPotencia
                      )?.toUpperCase(),
                    ]
                      .filter(Boolean)
                      .join(' – ')}
                  </p>
                )}

                <p className="text-xs sm:text-sm font-bold text-slate-200">
                  {[
                    lojaConfigWatch.enderecoTemplo,
                    lojaConfigWatch.orienteCidadeUf,
                  ]
                    .filter(Boolean)
                    .join(' – ')}
                </p>

                {(lojaConfigWatch.emailLoja ||
                  DEFAULT_CONFIGURACAO_LOJA.emailLoja) && (
                  <p className="text-xs sm:text-sm font-bold text-amber-200/90">
                    {(() => {
                      const mail =
                        lojaConfigWatch.emailLoja ||
                        DEFAULT_CONFIGURACAO_LOJA.emailLoja;
                      return mail.toLowerCase().startsWith('e-mail:')
                        ? mail
                        : `e-mail: ${mail}`;
                    })()}
                  </p>
                )}

                {(lojaConfigWatch.gestao ||
                  DEFAULT_CONFIGURACAO_LOJA.gestao) && (
                  <p className="text-xs sm:text-sm font-bold text-amber-200/90">
                    {(() => {
                      const g = (
                        lojaConfigWatch.gestao ||
                        DEFAULT_CONFIGURACAO_LOJA.gestao ||
                        ''
                      ).trim();
                      return g.toLowerCase().startsWith('gestão') ||
                        g.toLowerCase().startsWith('gestao')
                        ? g
                        : `Gestão: ${g}`;
                    })()}
                  </p>
                )}
              </div>
            </div>

            {/* Bloco Direito: Ações Rápidas e Configurações do Cabeçalho */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37] bg-[#0B192C] px-3.5 py-2 text-xs font-bold text-[#D4AF37] hover:bg-[#132847] transition-colors shadow-sm"
              >
                <span>📚</span> Histórico de Balaústres
              </button>

              <button
                type="button"
                onClick={() => {
                  setAbaInicialQuadroModal(
                    permissoes.podeEditarQuadroDiretoria
                      ? 'diretoria'
                      : 'quadro'
                  );
                  setModalQuadroDiretoriaAberto(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37] bg-[#1a365d] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0B192C] transition-colors shadow-sm"
              >
                <span>👥</span> Quadro & Diretoria ({irmaosQuadro.length})
              </button>

              {permissoes.podeConfigurarCabecalhoLoja && (
                <button
                  type="button"
                  onClick={() => setModalConfigAberto(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/70 bg-[#0B192C]/80 px-3.5 py-2 text-xs font-bold text-[#D4AF37] hover:bg-[#0B192C] transition-colors shadow-sm"
                >
                  <span>⚙</span> Configurar Loja / Logo
                </button>
              )}

              <button
                type="button"
                onClick={() => setExibirTodasSecoes(!exibirTodasSecoes)}
                className="rounded-lg border border-slate-400/40 bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-100 hover:bg-white/20 transition-colors"
              >
                {exibirTodasSecoes
                  ? '🗂 Visualizar por Abas'
                  : '📜 Expandir Seções'}
              </button>

              <button
                type="button"
                onClick={() => setModalPreviewAberto(true)}
                className="rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#0B192C] shadow hover:bg-[#c5a02e] transition-colors"
              >
                👁 Pré-visualizar Balaústre
              </button>
            </div>
          </div>

          {/* Resumo Litúrgico Instantâneo */}
          <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
            <span className="italic">
              "{dataPorExtensoLiturgica(dataSessaoWatch)}..."
            </span>
            <div className="flex items-center gap-4 font-semibold">
              <span>
                Balaústre Nº{' '}
                <strong className="text-[#D4AF37]">
                  {watch('numeroBalaustre')}
                </strong>
              </span>
              <span>•</span>
              <span>
                Quórum Total:{' '}
                <strong className="text-[#D4AF37]">{totalPresentes} Ir∴</strong>
              </span>
            </div>
          </div>
        </header>

        {/* NAVEGAÇÃO DE ABAS (TABS) */}
        {!exibirTodasSecoes && (
          <nav
            aria-label="Seções do Balaústre"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-800 shadow-sm"
          >
            {abas.map((aba) => {
              const ativa = abaAtiva === aba.id;
              return (
                <button
                  key={aba.id}
                  type="button"
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex items-start gap-3 p-4 text-left transition-all border-b-2 ${
                    ativa
                      ? 'border-[#D4AF37] bg-[#1a365d]/5 dark:bg-slate-800/90'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      ativa
                        ? 'bg-[#1a365d] text-[#D4AF37]'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {aba.numero}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-bold ${
                        ativa
                          ? 'text-[#1a365d] dark:text-[#D4AF37]'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {aba.titulo}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {aba.subtitulo}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        )}

        {/* FORMULÁRIO PRINCIPAL */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-b-2xl border border-t-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-md space-y-10"
        >
          {/* Notificação de Status */}
          {statusFeedback && (
            <div
              className={`rounded-xl border p-4 text-sm flex items-center justify-between ${
                statusFeedback.tipo === 'sucesso'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                  : 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200'
              }`}
            >
              <span>{statusFeedback.mensagem}</span>
              <button
                type="button"
                onClick={() => setStatusFeedback(null)}
                className="text-xs font-bold underline ml-4"
              >
                Fechar
              </button>
            </div>
          )}

          {/* ================================================================
              ABA 1: DADOS BÁSICOS, CARGOS EM LOJA E QUÓRUM
             ================================================================ */}
          {(exibirTodasSecoes || abaAtiva === 'basicos') && (
            <section className="space-y-8 animate-fadeIn">
              {/* Card Resumo das Configurações do Cabeçalho da Loja */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#D4AF37]/50 bg-[#F9F8F6] dark:bg-slate-800/50 p-4">
                <div className="flex items-center gap-3.5">
                  {lojaConfigWatch.logoUrl ? (
                    <img
                      src={lojaConfigWatch.logoUrl}
                      alt="Logo"
                      className="h-12 w-12 rounded-full object-contain border border-[#D4AF37] bg-white p-1"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37] bg-[#1a365d] text-[#D4AF37] font-bold">
                      ∴
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
                      Timbre e Cabeçalho Ativo da Loja
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      {lojaConfigWatch.nomeLoja} Nº {lojaConfigWatch.numeroLoja}{' '}
                      — Or∴ de {lojaConfigWatch.orienteCidadeUf} (
                      {lojaConfigWatch.enderecoTemplo})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalConfigAberto(true)}
                  className="rounded-lg border border-[#1a365d] dark:border-[#D4AF37] bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] hover:bg-[#1a365d] hover:text-white transition-colors"
                >
                  ⚙ Editar Logomarca, Nome, Nº e Endereço da Loja
                </button>
              </div>

              {/* 1.1 Cabeçalho & Metadados */}
              <div>
                <div className="flex items-center gap-2 border-b-2 border-[#D4AF37]/50 pb-2 mb-5">
                  <span className="text-[#D4AF37] font-bold">∴</span>
                  <h2 className="text-lg font-bold text-[#1a365d] dark:text-white">
                    1. Cabeçalho & Metadados da Sessão
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Número do Balaústre */}
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Nº do Balaústre
                    </label>
                    <input
                      type="number"
                      min={1}
                      {...register('numeroBalaustre')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold text-[#1a365d] dark:text-amber-300 focus:border-[#1a365d] focus:outline-none"
                    />
                    {errors.numeroBalaustre && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.numeroBalaustre.message}
                      </p>
                    )}
                  </div>

                  {/* Data da Sessão */}
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Data da Sessão
                    </label>
                    <input
                      type="date"
                      {...register('dataSessao')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:border-[#1a365d] focus:outline-none"
                    />
                  </div>

                  {/* Horário de Abertura */}
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Horário de Abertura
                    </label>
                    <input
                      type="time"
                      {...register('horarioAbertura')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800 px-3.5 py-2.5 text-sm focus:border-[#1a365d] focus:outline-none"
                    />
                  </div>

                  {/* Grau dos Trabalhos */}
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Grau dos Trabalhos
                    </label>
                    <select
                      {...register('grauTrabalhos')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800 px-3 py-2.5 text-sm font-medium focus:border-[#1a365d] focus:outline-none"
                    >
                      <option value="aprendiz">Grau 1 (Aprendiz)</option>
                      <option value="companheiro">Grau 2 (Companheiro)</option>
                      <option value="mestre">Grau 3 (Mestre)</option>
                    </select>
                  </div>

                  {/* Tipo de Sessão */}
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Tipo de Sessão
                    </label>
                    <select
                      {...register('tipoSessao')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800 px-3 py-2.5 text-sm font-medium focus:border-[#1a365d] focus:outline-none"
                    >
                      <option value="ordinaria">Ordinária</option>
                      <option value="magna_iniciacao">
                        Magna de Iniciação
                      </option>
                      <option value="magna_elevacao">Magna de Elevação</option>
                      <option value="magna_exaltacao">
                        Magna de Exaltação
                      </option>
                      <option value="magna_instalacao_posse">
                        Magna de Instalação/Posse
                      </option>
                      <option value="magna_outra">
                        Magna (Outras Solenidades)
                      </option>
                      <option value="extraordinaria">Extraordinária</option>
                      <option value="funebre">Fúnebre / Pompas Fúnebres</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 1.2 Ocupação dos Cargos em Loja */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#D4AF37]/50 pb-2 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#D4AF37] font-bold">∴</span>
                    <h2 className="text-lg font-bold text-[#1a365d] dark:text-white">
                      2. Ocupação dos Cargos em Loja (Luzes e Oficiais)
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Ao selecionar outro Irmão fora do titular padrão, o cargo
                      já é marcado automaticamente como{' '}
                      <strong>Substituto / Ad-hoc</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalQuadroDiretoriaAberto(true)}
                      className="rounded-lg border border-[#1a365d] dark:border-[#D4AF37] bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] hover:bg-[#1a365d] hover:text-white transition-colors"
                    >
                      👥 Editar Diretoria / Quadro
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <IrmaoSelectField
                    label="Venerável Mestre"
                    selectPath="cargos.veneravelMestre.irmaoSelecionado"
                    outroPath="cargos.veneravelMestre.nomeOutro"
                    titularPath="cargos.veneravelMestre.isTitular"
                    titularPadrao={diretoriaTitular.veneravelMestre}
                    listaIrmaos={irmaosQuadro}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errorMessage={
                      errors.cargos?.veneravelMestre?.nomeOutro?.message
                    }
                  />
                  <IrmaoSelectField
                    label="1º Vigilante"
                    selectPath="cargos.primeiroVigilante.irmaoSelecionado"
                    outroPath="cargos.primeiroVigilante.nomeOutro"
                    titularPath="cargos.primeiroVigilante.isTitular"
                    titularPadrao={diretoriaTitular.primeiroVigilante}
                    listaIrmaos={irmaosQuadro}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errorMessage={
                      errors.cargos?.primeiroVigilante?.nomeOutro?.message
                    }
                  />
                  <IrmaoSelectField
                    label="2º Vigilante"
                    selectPath="cargos.segundoVigilante.irmaoSelecionado"
                    outroPath="cargos.segundoVigilante.nomeOutro"
                    titularPath="cargos.segundoVigilante.isTitular"
                    titularPadrao={diretoriaTitular.segundoVigilante}
                    listaIrmaos={irmaosQuadro}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errorMessage={
                      errors.cargos?.segundoVigilante?.nomeOutro?.message
                    }
                  />
                  <IrmaoSelectField
                    label="Orador (Guarda da Lei)"
                    selectPath="cargos.orador.irmaoSelecionado"
                    outroPath="cargos.orador.nomeOutro"
                    titularPath="cargos.orador.isTitular"
                    titularPadrao={diretoriaTitular.orador}
                    listaIrmaos={irmaosQuadro}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errorMessage={errors.cargos?.orador?.nomeOutro?.message}
                  />
                  <IrmaoSelectField
                    label="Secretário"
                    selectPath="cargos.secretario.irmaoSelecionado"
                    outroPath="cargos.secretario.nomeOutro"
                    titularPath="cargos.secretario.isTitular"
                    titularPadrao={diretoriaTitular.secretario}
                    listaIrmaos={irmaosQuadro}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errorMessage={errors.cargos?.secretario?.nomeOutro?.message}
                  />
                  <IrmaoSelectField
                    label="Tesoureiro"
                    selectPath="cargos.tesoureiro.irmaoSelecionado"
                    outroPath="cargos.tesoureiro.nomeOutro"
                    titularPath="cargos.tesoureiro.isTitular"
                    titularPadrao={diretoriaTitular.tesoureiro}
                    listaIrmaos={irmaosQuadro}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errorMessage={errors.cargos?.tesoureiro?.nomeOutro?.message}
                  />
                  <IrmaoSelectField
                    label="Chanceler"
                    selectPath="cargos.chanceler.irmaoSelecionado"
                    outroPath="cargos.chanceler.nomeOutro"
                    titularPath="cargos.chanceler.isTitular"
                    titularPadrao={diretoriaTitular.chanceler}
                    listaIrmaos={irmaosQuadro}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errorMessage={errors.cargos?.chanceler?.nomeOutro?.message}
                  />
                  <IrmaoSelectField
                    label="Mestre de Cerimônias"
                    selectPath="cargos.mestreCerimonias.irmaoSelecionado"
                    outroPath="cargos.mestreCerimonias.nomeOutro"
                    titularPath="cargos.mestreCerimonias.isTitular"
                    titularPadrao={diretoriaTitular.mestreCerimonias}
                    listaIrmaos={irmaosQuadro}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    errorMessage={
                      errors.cargos?.mestreCerimonias?.nomeOutro?.message
                    }
                  />
                </div>
              </div>

              {/* 1.3 Livro de Presenças & Quórum (Chancelaria) */}
              <div>
                <div className="flex items-center gap-2 border-b-2 border-[#D4AF37]/50 pb-2 mb-5">
                  <span className="text-[#D4AF37] font-bold">∴</span>
                  <h2 className="text-lg font-bold text-[#1a365d] dark:text-white">
                    3. Livro de Presenças & Quórum (Chancelaria)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800/50 p-5">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Irmãos do Quadro Presentes
                    </label>
                    <input
                      type="number"
                      min={0}
                      {...register('quorum.qtdQuadroPresentes')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base font-bold text-[#1a365d] dark:text-white focus:border-[#1a365d] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Irmãos Visitantes Presentes
                    </label>
                    <input
                      type="number"
                      min={0}
                      {...register('quorum.qtdVisitantesPresentes')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base font-bold text-[#1a365d] dark:text-white focus:border-[#1a365d] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col justify-center rounded-lg border border-[#D4AF37]/60 bg-[#1a365d] px-4 py-3 text-white">
                    <span className="text-xs uppercase tracking-wider text-amber-200">
                      Quórum Total em Loja
                    </span>
                    <span className="text-2xl font-extrabold text-[#D4AF37]">
                      {totalPresentes} Obreiros
                    </span>
                  </div>
                </div>
              </div>

              {!exibirTodasSecoes && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('expediente')}
                    className="rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0B192C] transition-colors"
                  >
                    Próxima Seção: Expediente & Saco de Propostas →
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ================================================================
              ABA 2: EXPEDIENTE & SACO DE PROPOSTAS
             ================================================================ */}
          {(exibirTodasSecoes || abaAtiva === 'expediente') && (
            <section className="space-y-8 animate-fadeIn">
              {/* 4.1 Balaústres Anteriores Lidos */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F9F8F6]/60 dark:bg-slate-800/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4AF37]/50 pb-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#1a365d] dark:text-white flex items-center gap-2">
                      <span className="text-[#D4AF37]">∴</span> 4.1 Balaústres
                      Anteriores Lidos e Aprovados
                    </h2>
                    <p className="text-xs text-slate-500">
                      Registre os balaústres submetidos à apreciação da Loja e
                      eventuais emendas
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      balaustresArray.append({
                        numero: ultimoBalaustreNumero,
                        statusAprovacao: 'aprovado_sem_restricoes',
                        emendasObservacao: '',
                      })
                    }
                    className="rounded-lg bg-[#1a365d] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B192C] transition-colors"
                  >
                    ＋ Adicionar Balaústre Lido
                  </button>
                </div>

                {balaustresArray.fields.length === 0 ? (
                  <p className="text-xs italic text-slate-500 py-3">
                    Nenhum balaústre anterior registrado para leitura.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {balaustresArray.fields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5"
                      >
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Nº Balaústre
                          </label>
                          <input
                            type="number"
                            {...register(`balaustresLidos.${idx}.numero`)}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-3 py-2 text-sm font-bold"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Deliberação / Status
                          </label>
                          <select
                            {...register(
                              `balaustresLidos.${idx}.statusAprovacao`
                            )}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-3 py-2 text-sm"
                          >
                            <option value="aprovado_sem_restricoes">
                              Aprovado sem emenda(s)
                            </option>
                            <option value="aprovado_com_emendas">
                              Aprovado com emenda(s)
                            </option>
                            <option value="rejeitado">
                              Rejeitado / Sobrestado
                            </option>
                          </select>
                        </div>

                        <div className="sm:col-span-5">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Observações / Ressalvas (Opcional)
                          </label>
                          <input
                            type="text"
                            {...register(
                              `balaustresLidos.${idx}.emendasObservacao`
                            )}
                            placeholder="Ex: Retificação do nome do visitante..."
                            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end pt-4">
                          <button
                            type="button"
                            onClick={() => balaustresArray.remove(idx)}
                            className="rounded-md bg-red-50 border border-red-200 px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Pré-visualização do texto que vai para o Balaústre */}
                    <div className="rounded-lg border border-[#D4AF37]/60 bg-amber-50/50 dark:bg-slate-900/70 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200">
                      <span className="font-bold text-[#1a365d] dark:text-[#D4AF37] mr-1.5">
                        Texto no Balaústre:
                      </span>
                      {formatarListaBalaustresLidos(
                        watch('balaustresLidos'),
                        lojaConfigWatch.gestao
                      ).join(' ')}
                    </div>
                  </div>
                )}
              </div>

              {/* 4.2 Expedientes Recebidos / Pranchas */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F9F8F6]/60 dark:bg-slate-800/40 p-5">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#D4AF37]/50 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-[#1a365d] dark:text-white flex items-center gap-2">
                      <span className="text-[#D4AF37]">∴</span> 4.2 Expedientes
                      Recebidos, Decretos, Pranchas e Cartas-Convite
                    </h2>
                    <p className="text-xs text-slate-500">
                      Selecione o tipo de expediente abaixo (Normal/Resumo ou
                      Carta-Convite de Loja) antes de adicionar
                    </p>
                  </div>

                  {/* Select de Tipo de Expediente antes de inserir + Botão de Inserir */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                    <div className="sm:w-80">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37] mb-1">
                        Tipo de Expediente a inserir:
                      </label>
                      <select
                        value={tipoNovoExpediente}
                        onChange={(e) =>
                          setTipoNovoExpediente(
                            e.target.value as TipoExpedienteRecebido
                          )
                        }
                        className="w-full rounded-lg border-2 border-[#1a365d] dark:border-[#D4AF37] bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-[#1a365d] dark:text-white focus:outline-none"
                      >
                        <option value="normal">
                          1. Normal (Resumo Livre: Ofício, Ato, Decreto,
                          Prancha...)
                        </option>
                        <option value="convite">
                          2. Carta-Convite de Loja (Iniciação, Elevação,
                          Exaltação, Outros)
                        </option>
                        <option value="carta_consulta">
                          3. Carta(s) Consulta(s) de Loja (Candidato a ingresso)
                        </option>
                        <option value="oficio_prancha">
                          4. Ofício(s) / Prancha(s) Recebido(s) (Lojas,
                          Instituições ou Pessoas)
                        </option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const descricaoInicial =
                          tipoNovoExpediente === 'convite' ||
                          tipoNovoExpediente === 'carta_consulta' ||
                          tipoNovoExpediente === 'oficio_prancha'
                            ? comporTextoExpedienteConvite({
                                tipoExpediente: tipoNovoExpediente,
                                subtipoConvite: 'Iniciação',
                                nomesCandidatos: '',
                                nomeIrmao: '',
                                outroDetalheConvite: '',
                                lojaConvite: '',
                                orienteConvite: 'UBERLÂNDIA-MG',
                                dataEvento: '',
                                horaEvento: '20:00',
                                enderecoEvento: '',
                                origemOficio: 'loja',
                                numeroOficio: '',
                                ufInstituicao: 'MG',
                                orienteInstituicao: 'UBERLÂNDIA-MG',
                                nomeInstituicao: '',
                                nomePessoa: '',
                                classificacaoOficio:
                                  'Ofício/Prancha Circular (Decretos e Atos da Potência)',
                                outroTipoOficio: '',
                                dataRecebimentoOficio: '',
                                assuntoOficio: '',
                                destinoOficio: 'lido_arquivado',
                              })
                            : '';

                        expedientesArray.append({
                          tipoExpediente: tipoNovoExpediente,
                          subtipoConvite: 'Iniciação',
                          nomesCandidatos: '',
                          nomeIrmao: '',
                          outroDetalheConvite: '',
                          lojaConvite: '',
                          orienteConvite: 'UBERLÂNDIA-MG',
                          dataEvento: '',
                          horaEvento: '20:00',
                          enderecoEvento: '',
                          origemOficio: 'loja',
                          numeroOficio: '',
                          ufInstituicao: 'MG',
                          orienteInstituicao: 'UBERLÂNDIA-MG',
                          nomeInstituicao: '',
                          nomePessoa: '',
                          classificacaoOficio:
                            'Ofício/Prancha Circular (Decretos e Atos da Potência)',
                          outroTipoOficio: '',
                          dataRecebimentoOficio: '',
                          assuntoOficio: '',
                          destinoOficio: 'lido_arquivado',
                          enviadoOrdemDia: false,
                          descricao: descricaoInicial,
                        });
                      }}
                      className="rounded-lg bg-[#1a365d] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0B192C] transition-colors whitespace-nowrap"
                    >
                      ＋ Adicionar Expediente
                    </button>
                  </div>
                </div>

                {expedientesArray.fields.length === 0 ? (
                  <p className="text-xs italic text-slate-500 py-3">
                    Nenhum expediente adicionado. Selecione o tipo acima e
                    clique em "＋ Adicionar Expediente".
                  </p>
                ) : (
                  <div className="space-y-4">
                    {expedientesArray.fields.map((field, idx) => {
                      const tipoExpAtual: TipoExpedienteRecebido =
                        watch(`expedientesRecebidos.${idx}.tipoExpediente`) ||
                        'normal';
                      const subtipoConviteAtual: SubtipoConviteExpediente =
                        watch(`expedientesRecebidos.${idx}.subtipoConvite`) ||
                        'Iniciação';
                      const nomesCandidatosAtual =
                        watch(`expedientesRecebidos.${idx}.nomesCandidatos`) ||
                        '';
                      const nomeIrmaoAtual =
                        watch(`expedientesRecebidos.${idx}.nomeIrmao`) || '';
                      const outroDetalheAtual =
                        watch(
                          `expedientesRecebidos.${idx}.outroDetalheConvite`
                        ) || '';
                      const lojaConviteAtual =
                        watch(`expedientesRecebidos.${idx}.lojaConvite`) || '';
                      const orienteConviteAtual =
                        watch(`expedientesRecebidos.${idx}.orienteConvite`) ||
                        '';
                      const dataEventoAtual =
                        watch(`expedientesRecebidos.${idx}.dataEvento`) || '';
                      const horaEventoAtual =
                        watch(`expedientesRecebidos.${idx}.horaEvento`) ||
                        '20:00';
                      const enderecoEventoAtual =
                        watch(`expedientesRecebidos.${idx}.enderecoEvento`) ||
                        '';

                      // Campos de Ofício / Prancha Recebido(a) (Opção 4)
                      const origemOficioAtual: OrigemOficioPrancha =
                        watch(`expedientesRecebidos.${idx}.origemOficio`) ||
                        'loja';
                      const numeroOficioAtual =
                        watch(`expedientesRecebidos.${idx}.numeroOficio`) || '';
                      const ufInstituicaoAtual =
                        watch(`expedientesRecebidos.${idx}.ufInstituicao`) ||
                        'MG';
                      const orienteInstituicaoAtual =
                        watch(
                          `expedientesRecebidos.${idx}.orienteInstituicao`
                        ) || '';
                      const nomeInstituicaoAtual =
                        watch(`expedientesRecebidos.${idx}.nomeInstituicao`) ||
                        '';
                      const nomePessoaAtual =
                        watch(`expedientesRecebidos.${idx}.nomePessoa`) || '';
                      const classificacaoOficioAtual =
                        watch(
                          `expedientesRecebidos.${idx}.classificacaoOficio`
                        ) ||
                        'Ofício/Prancha Circular (Decretos e Atos da Potência)';
                      const outroTipoOficioAtual =
                        watch(`expedientesRecebidos.${idx}.outroTipoOficio`) ||
                        '';
                      const dataRecebimentoOficioAtual =
                        watch(
                          `expedientesRecebidos.${idx}.dataRecebimentoOficio`
                        ) || '';
                      const assuntoOficioAtual =
                        watch(`expedientesRecebidos.${idx}.assuntoOficio`) ||
                        '';
                      const destinoOficioAtual: DestinoOficioPrancha =
                        watch(`expedientesRecebidos.${idx}.destinoOficio`) ||
                        'lido_arquivado';
                      const enviadoOrdemDiaAtual = Boolean(
                        watch(`expedientesRecebidos.${idx}.enviadoOrdemDia`)
                      );

                      const atualizarTextoConvite = (
                        overrides?: Partial<{
                          tipoExpediente: TipoExpedienteRecebido;
                          subtipoConvite: SubtipoConviteExpediente;
                          nomesCandidatos: string;
                          nomeIrmao: string;
                          outroDetalheConvite: string;
                          lojaConvite: string;
                          orienteConvite: string;
                          dataEvento: string;
                          horaEvento: string;
                          enderecoEvento: string;
                          origemOficio: OrigemOficioPrancha;
                          numeroOficio: string;
                          ufInstituicao: string;
                          orienteInstituicao: string;
                          nomeInstituicao: string;
                          nomePessoa: string;
                          classificacaoOficio: string;
                          outroTipoOficio: string;
                          dataRecebimentoOficio: string;
                          assuntoOficio: string;
                          destinoOficio: DestinoOficioPrancha;
                        }>
                      ) => {
                        const novoTexto = comporTextoExpedienteConvite({
                          tipoExpediente:
                            overrides?.tipoExpediente !== undefined
                              ? overrides.tipoExpediente
                              : tipoExpAtual,
                          subtipoConvite:
                            overrides?.subtipoConvite !== undefined
                              ? overrides.subtipoConvite
                              : subtipoConviteAtual,
                          nomesCandidatos:
                            overrides?.nomesCandidatos !== undefined
                              ? overrides.nomesCandidatos
                              : nomesCandidatosAtual,
                          nomeIrmao:
                            overrides?.nomeIrmao !== undefined
                              ? overrides.nomeIrmao
                              : nomeIrmaoAtual,
                          outroDetalheConvite:
                            overrides?.outroDetalheConvite !== undefined
                              ? overrides.outroDetalheConvite
                              : outroDetalheAtual,
                          lojaConvite:
                            overrides?.lojaConvite !== undefined
                              ? overrides.lojaConvite
                              : lojaConviteAtual,
                          orienteConvite:
                            overrides?.orienteConvite !== undefined
                              ? overrides.orienteConvite
                              : orienteConviteAtual,
                          dataEvento:
                            overrides?.dataEvento !== undefined
                              ? overrides.dataEvento
                              : dataEventoAtual,
                          horaEvento:
                            overrides?.horaEvento !== undefined
                              ? overrides.horaEvento
                              : horaEventoAtual,
                          enderecoEvento:
                            overrides?.enderecoEvento !== undefined
                              ? overrides.enderecoEvento
                              : enderecoEventoAtual,
                          origemOficio:
                            overrides?.origemOficio !== undefined
                              ? overrides.origemOficio
                              : origemOficioAtual,
                          numeroOficio:
                            overrides?.numeroOficio !== undefined
                              ? overrides.numeroOficio
                              : numeroOficioAtual,
                          ufInstituicao:
                            overrides?.ufInstituicao !== undefined
                              ? overrides.ufInstituicao
                              : ufInstituicaoAtual,
                          orienteInstituicao:
                            overrides?.orienteInstituicao !== undefined
                              ? overrides.orienteInstituicao
                              : orienteInstituicaoAtual,
                          nomeInstituicao:
                            overrides?.nomeInstituicao !== undefined
                              ? overrides.nomeInstituicao
                              : nomeInstituicaoAtual,
                          nomePessoa:
                            overrides?.nomePessoa !== undefined
                              ? overrides.nomePessoa
                              : nomePessoaAtual,
                          classificacaoOficio:
                            overrides?.classificacaoOficio !== undefined
                              ? overrides.classificacaoOficio
                              : classificacaoOficioAtual,
                          outroTipoOficio:
                            overrides?.outroTipoOficio !== undefined
                              ? overrides.outroTipoOficio
                              : outroTipoOficioAtual,
                          dataRecebimentoOficio:
                            overrides?.dataRecebimentoOficio !== undefined
                              ? overrides.dataRecebimentoOficio
                              : dataRecebimentoOficioAtual,
                          assuntoOficio:
                            overrides?.assuntoOficio !== undefined
                              ? overrides.assuntoOficio
                              : assuntoOficioAtual,
                          destinoOficio:
                            overrides?.destinoOficio !== undefined
                              ? overrides.destinoOficio
                              : destinoOficioAtual,
                        });
                        setValue(
                          `expedientesRecebidos.${idx}.descricao`,
                          novoTexto,
                          { shouldDirty: true, shouldValidate: true }
                        );
                      };

                      return (
                        <div
                          key={field.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3.5"
                        >
                          {/* Barra Superior do Item de Expediente */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1a365d] text-xs font-bold text-[#D4AF37]">
                                {idx + 1}
                              </span>
                              <select
                                value={tipoExpAtual}
                                onChange={(e) => {
                                  const novoTipo = e.target
                                    .value as TipoExpedienteRecebido;
                                  setValue(
                                    `expedientesRecebidos.${idx}.tipoExpediente`,
                                    novoTipo,
                                    { shouldDirty: true }
                                  );
                                  if (
                                    novoTipo === 'convite' ||
                                    novoTipo === 'carta_consulta' ||
                                    novoTipo === 'oficio_prancha'
                                  ) {
                                    atualizarTextoConvite({
                                      tipoExpediente: novoTipo,
                                    });
                                  }
                                }}
                                className="rounded-lg border border-[#1a365d]/40 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-[#1a365d] dark:text-[#D4AF37]"
                              >
                                <option value="normal">
                                  1. Expediente Normal (Resumo Livre)
                                </option>
                                <option value="convite">
                                  2. Carta-Convite de Loja (Sessão Magna)
                                </option>
                                <option value="carta_consulta">
                                  3. Carta(s) Consulta(s) de Loja (Candidato a
                                  ingresso)
                                </option>
                                <option value="oficio_prancha">
                                  4. Ofício(s) / Prancha(s) Recebido(s) (Lojas,
                                  Instituições ou Pessoas)
                                </option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => expedientesArray.remove(idx)}
                              className="rounded-md bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                            >
                              ✕ Remover
                            </button>
                          </div>

                          {/* SE FOR TIPO "CARTA_CONSULTA": EXIBE SELETOR UF -> ORIENTE -> LOJA + NOME(S) DO(S) CANDIDATO(S) */}
                          {tipoExpAtual === 'carta_consulta' && (
                            <div className="space-y-3.5 animate-fadeIn">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                  Selecionar Loja Consulente (UF / Oriente /
                                  Loja):
                                </label>
                                <SeletorLojaVisitante
                                  ocultarNomeVisitante
                                  lojaSelecionada={lojaConviteAtual}
                                  onChangeLoja={(novaLoja) => {
                                    setValue(
                                      `expedientesRecebidos.${idx}.lojaConvite`,
                                      novaLoja,
                                      { shouldDirty: true }
                                    );
                                    atualizarTextoConvite({
                                      lojaConvite: novaLoja,
                                    });
                                  }}
                                  orienteSelecionado={orienteConviteAtual}
                                  onChangeOriente={(novoOriente) => {
                                    setValue(
                                      `expedientesRecebidos.${idx}.orienteConvite`,
                                      novoOriente,
                                      { shouldDirty: true }
                                    );
                                    atualizarTextoConvite({
                                      orienteConvite: novoOriente,
                                    });
                                  }}
                                />
                              </div>

                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800/60 p-3.5">
                                <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                  Nome(s) do(s) Candidato(s) a ingresso na Ordem
                                  *
                                </label>
                                <input
                                  type="text"
                                  value={nomesCandidatosAtual}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setValue(
                                      `expedientesRecebidos.${idx}.nomesCandidatos`,
                                      val,
                                      { shouldDirty: true }
                                    );
                                    atualizarTextoConvite({
                                      nomesCandidatos: val,
                                    });
                                  }}
                                  placeholder="Ex: Fulano de Tal (ou Fulano de Tal e Beltrano da Silva)"
                                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
                                />
                              </div>
                            </div>
                          )}

                          {/* SE FOR TIPO "CONVITE": EXIBE SELETOR UF -> ORIENTE -> LOJA + CAMPOS DO CONVITE */}
                          {tipoExpAtual === 'convite' && (
                            <div className="space-y-3.5 animate-fadeIn">
                              {/* 1. Seleção da Loja Convidante (UF -> Oriente -> Loja + Nova Loja) */}
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                  Selecionar Loja Convidante (UF / Oriente /
                                  Loja):
                                </label>
                                <SeletorLojaVisitante
                                  ocultarNomeVisitante
                                  lojaSelecionada={lojaConviteAtual}
                                  onChangeLoja={(novaLoja) => {
                                    setValue(
                                      `expedientesRecebidos.${idx}.lojaConvite`,
                                      novaLoja,
                                      { shouldDirty: true }
                                    );
                                    atualizarTextoConvite({
                                      lojaConvite: novaLoja,
                                    });
                                  }}
                                  orienteSelecionado={orienteConviteAtual}
                                  onChangeOriente={(novoOriente) => {
                                    setValue(
                                      `expedientesRecebidos.${idx}.orienteConvite`,
                                      novoOriente,
                                      { shouldDirty: true }
                                    );
                                    atualizarTextoConvite({
                                      orienteConvite: novoOriente,
                                    });
                                  }}
                                />
                              </div>

                              {/* 2. Tipo de Sessão do Convite + Candidato(s) / Irmão */}
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800/60 p-3.5">
                                <div className="sm:col-span-4">
                                  <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                    Tipo de Sessão do Convite *
                                  </label>
                                  <select
                                    value={subtipoConviteAtual}
                                    onChange={(e) => {
                                      const val = e.target
                                        .value as SubtipoConviteExpediente;
                                      setValue(
                                        `expedientesRecebidos.${idx}.subtipoConvite`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarTextoConvite({
                                        subtipoConvite: val,
                                      });
                                    }}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                                  >
                                    <option value="Iniciação">Iniciação</option>
                                    <option value="Elevação">Elevação</option>
                                    <option value="Exaltação">Exaltação</option>
                                    <option value="Outros">Outros</option>
                                  </select>
                                </div>

                                {/* Se Iniciação: Nome(s) do(s) Candidato(s) */}
                                {subtipoConviteAtual === 'Iniciação' && (
                                  <div className="sm:col-span-8">
                                    <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                      Nome(s) do(s) Candidato(s) à Iniciação
                                    </label>
                                    <input
                                      type="text"
                                      value={nomesCandidatosAtual}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setValue(
                                          `expedientesRecebidos.${idx}.nomesCandidatos`,
                                          val,
                                          { shouldDirty: true }
                                        );
                                        atualizarTextoConvite({
                                          nomesCandidatos: val,
                                        });
                                      }}
                                      placeholder="Ex: Fulano de Tal e Beltrano da Silva"
                                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                                    />
                                  </div>
                                )}

                                {/* Se Elevação ou Exaltação: Nome do Irmão */}
                                {(subtipoConviteAtual === 'Elevação' ||
                                  subtipoConviteAtual === 'Exaltação') && (
                                  <div className="sm:col-span-8">
                                    <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                      Nome do(s) Irmão(ãos) ({subtipoConviteAtual}
                                      )
                                    </label>
                                    <input
                                      type="text"
                                      value={nomeIrmaoAtual}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setValue(
                                          `expedientesRecebidos.${idx}.nomeIrmao`,
                                          val,
                                          { shouldDirty: true }
                                        );
                                        atualizarTextoConvite({
                                          nomeIrmao: val,
                                        });
                                      }}
                                      placeholder="Ex: Fulano de Tal"
                                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                                    />
                                  </div>
                                )}

                                {/* Se Outros: Especificar Solenidade */}
                                {subtipoConviteAtual === 'Outros' && (
                                  <div className="sm:col-span-8">
                                    <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                      Especificar Solenidade / Motivo do Convite
                                    </label>
                                    <input
                                      type="text"
                                      value={outroDetalheAtual}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setValue(
                                          `expedientesRecebidos.${idx}.outroDetalheConvite`,
                                          val,
                                          { shouldDirty: true }
                                        );
                                        atualizarTextoConvite({
                                          outroDetalheConvite: val,
                                        });
                                      }}
                                      placeholder="Ex: Instalação e Posse / Aniversário da Loja / Palestra..."
                                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                                    />
                                  </div>
                                )}

                                {/* Data, Hora e Endereço do Templo */}
                                <div className="sm:col-span-3">
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Data da Sessão
                                  </label>
                                  <input
                                    type="date"
                                    value={dataEventoAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `expedientesRecebidos.${idx}.dataEvento`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarTextoConvite({
                                        dataEvento: val,
                                      });
                                    }}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Horário
                                  </label>
                                  <input
                                    type="time"
                                    value={horaEventoAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `expedientesRecebidos.${idx}.horaEvento`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarTextoConvite({
                                        horaEvento: val,
                                      });
                                    }}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                                  />
                                </div>

                                <div className="sm:col-span-7">
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Endereço do Templo (situado à...)
                                  </label>
                                  <input
                                    type="text"
                                    value={enderecoEventoAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `expedientesRecebidos.${idx}.enderecoEvento`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarTextoConvite({
                                        enderecoEvento: val,
                                      });
                                    }}
                                    placeholder="Ex: Rua das Acácias, nº 100, Bairro Centro"
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* SE FOR TIPO "OFICIO_PRANCHA": EXIBE ORIGEM (LOJA / INSTITUIÇÃO / PESSOA) + TIPO DE OFÍCIO + ASSUNTO + DESTINO */}
                          {tipoExpAtual === 'oficio_prancha' && (
                            <div className="space-y-4 animate-fadeIn">
                              {/* 1. Seleção da Origem do Ofício / Prancha */}
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800/60 p-3.5 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <label className="text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
                                    1. Origem do Ofício / Prancha Recebido(a):
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {(
                                      [
                                        {
                                          id: 'loja',
                                          label: '🏛 Outra Loja Maçônica',
                                        },
                                        {
                                          id: 'instituicao',
                                          label: '🏢 Outra Instituição / Empresa',
                                        },
                                        {
                                          id: 'pessoa',
                                          label: '👤 Pessoa / Irmão',
                                        },
                                      ] as {
                                        id: OrigemOficioPrancha;
                                        label: string;
                                      }[]
                                    ).map((op) => (
                                      <button
                                        key={op.id}
                                        type="button"
                                        onClick={() => {
                                          setValue(
                                            `expedientesRecebidos.${idx}.origemOficio`,
                                            op.id,
                                            { shouldDirty: true }
                                          );
                                          atualizarTextoConvite({
                                            origemOficio: op.id,
                                          });
                                        }}
                                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                                          origemOficioAtual === op.id
                                            ? 'border-[#1a365d] bg-[#1a365d] text-white dark:border-[#D4AF37] dark:bg-[#D4AF37] dark:text-[#0B192C]'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
                                        }`}
                                      >
                                        {op.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Origem = Outra Loja Maçônica: Mesma busca de Loja (UF -> Oriente -> Loja) + Nº do Ofício */}
                                {origemOficioAtual === 'loja' && (
                                  <div className="space-y-3 pt-1">
                                    <SeletorLojaVisitante
                                      ocultarNomeVisitante
                                      lojaSelecionada={lojaConviteAtual}
                                      onChangeLoja={(novaLoja) => {
                                        setValue(
                                          `expedientesRecebidos.${idx}.lojaConvite`,
                                          novaLoja,
                                          { shouldDirty: true }
                                        );
                                        atualizarTextoConvite({
                                          lojaConvite: novaLoja,
                                        });
                                      }}
                                      orienteSelecionado={orienteConviteAtual}
                                      onChangeOriente={(novoOriente) => {
                                        setValue(
                                          `expedientesRecebidos.${idx}.orienteConvite`,
                                          novoOriente,
                                          { shouldDirty: true }
                                        );
                                        atualizarTextoConvite({
                                          orienteConvite: novoOriente,
                                        });
                                      }}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                      <div className="sm:col-span-4">
                                        <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                          Nº do Ofício / Prancha
                                        </label>
                                        <input
                                          type="text"
                                          value={numeroOficioAtual}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setValue(
                                              `expedientesRecebidos.${idx}.numeroOficio`,
                                              val,
                                              { shouldDirty: true }
                                            );
                                            atualizarTextoConvite({
                                              numeroOficio: val,
                                            });
                                          }}
                                          placeholder="Ex: 042/2026"
                                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Origem = Outra Instituição / Empresa: UF, Oriente, Nome da Empresa e Número do Ofício */}
                                {origemOficioAtual === 'instituicao' && (
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                                    <div className="sm:col-span-2">
                                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        UF
                                      </label>
                                      <select
                                        value={ufInstituicaoAtual}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setValue(
                                            `expedientesRecebidos.${idx}.ufInstituicao`,
                                            val,
                                            { shouldDirty: true }
                                          );
                                          atualizarTextoConvite({
                                            ufInstituicao: val,
                                          });
                                        }}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-bold"
                                      >
                                        {TODAS_UFS_BRASIL.map((uf) => (
                                          <option key={uf} value={uf}>
                                            {uf}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="sm:col-span-3">
                                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Oriente / Cidade
                                      </label>
                                      <input
                                        type="text"
                                        value={orienteInstituicaoAtual}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setValue(
                                            `expedientesRecebidos.${idx}.orienteInstituicao`,
                                            val,
                                            { shouldDirty: true }
                                          );
                                          atualizarTextoConvite({
                                            orienteInstituicao: val,
                                          });
                                        }}
                                        placeholder="Ex: UBERLÂNDIA-MG"
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                                      />
                                    </div>

                                    <div className="sm:col-span-4">
                                      <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                        Nome da Instituição / Empresa *
                                      </label>
                                      <input
                                        type="text"
                                        value={nomeInstituicaoAtual}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setValue(
                                            `expedientesRecebidos.${idx}.nomeInstituicao`,
                                            val,
                                            { shouldDirty: true }
                                          );
                                          atualizarTextoConvite({
                                            nomeInstituicao: val,
                                          });
                                        }}
                                        placeholder="Ex: GOB-MG / Capítulo DeMolay / Entidade..."
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
                                      />
                                    </div>

                                    <div className="sm:col-span-3">
                                      <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                        Nº do Ofício / Prancha
                                      </label>
                                      <input
                                        type="text"
                                        value={numeroOficioAtual}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setValue(
                                            `expedientesRecebidos.${idx}.numeroOficio`,
                                            val,
                                            { shouldDirty: true }
                                          );
                                          atualizarTextoConvite({
                                            numeroOficio: val,
                                          });
                                        }}
                                        placeholder="Ex: 042/2026"
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Origem = Pessoa / Irmão: Nome da Pessoa + Número do Ofício */}
                                {origemOficioAtual === 'pessoa' && (
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                                    <div className="sm:col-span-8">
                                      <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                        Nome da Pessoa / Irmão Remetente *
                                      </label>
                                      <input
                                        type="text"
                                        value={nomePessoaAtual}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setValue(
                                            `expedientesRecebidos.${idx}.nomePessoa`,
                                            val,
                                            { shouldDirty: true }
                                          );
                                          atualizarTextoConvite({
                                            nomePessoa: val,
                                          });
                                        }}
                                        placeholder="Ex: Ir∴ Fulano de Tal / Sr. Beltrano da Silva"
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
                                      />
                                    </div>

                                    <div className="sm:col-span-4">
                                      <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                        Nº do Ofício / Prancha
                                      </label>
                                      <input
                                        type="text"
                                        value={numeroOficioAtual}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setValue(
                                            `expedientesRecebidos.${idx}.numeroOficio`,
                                            val,
                                            { shouldDirty: true }
                                          );
                                          atualizarTextoConvite({
                                            numeroOficio: val,
                                          });
                                        }}
                                        placeholder="Ex: s/nº ou 015/2026"
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 2. Classificação do Ofício/Prancha, Data de Recebimento e Assunto */}
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800/60 p-3.5">
                                <div className="sm:col-span-6">
                                  <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                    2. Tipo de Ofício / Prancha *
                                  </label>
                                  <select
                                    value={classificacaoOficioAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `expedientesRecebidos.${idx}.classificacaoOficio`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarTextoConvite({
                                        classificacaoOficio: val,
                                      });
                                    }}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                                  >
                                    {TIPOS_CLASSIFICACAO_OFICIO.map((item) => (
                                      <option key={item} value={item}>
                                        {item}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="sm:col-span-3">
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Data de Recebimento
                                  </label>
                                  <input
                                    type="date"
                                    value={dataRecebimentoOficioAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `expedientesRecebidos.${idx}.dataRecebimentoOficio`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarTextoConvite({
                                        dataRecebimentoOficio: val,
                                      });
                                    }}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                                  />
                                </div>

                                <div className="sm:col-span-3 flex items-end">
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                    Ofício = Prancha na redação maçônica
                                  </span>
                                </div>

                                {classificacaoOficioAtual === 'Outros' && (
                                  <div className="sm:col-span-12">
                                    <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                      Descreva o Tipo de Ofício / Prancha
                                      (Outros) *
                                    </label>
                                    <input
                                      type="text"
                                      value={outroTipoOficioAtual}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setValue(
                                          `expedientesRecebidos.${idx}.outroTipoOficio`,
                                          val,
                                          { shouldDirty: true }
                                        );
                                        atualizarTextoConvite({
                                          outroTipoOficio: val,
                                        });
                                      }}
                                      placeholder="Descreva a natureza do ofício/prancha..."
                                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
                                    />
                                  </div>
                                )}

                                <div className="sm:col-span-12">
                                  <label className="block text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                    Assunto Sucinto do Ofício / Prancha *
                                  </label>
                                  <input
                                    type="text"
                                    value={assuntoOficioAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `expedientesRecebidos.${idx}.assuntoOficio`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarTextoConvite({
                                        assuntoOficio: val,
                                      });
                                    }}
                                    placeholder="Ex: Solicitação de certidão de regularidade / Comunicação de eleição de diretoria..."
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                                  />
                                </div>
                              </div>

                              {/* 3. Destino / Encaminhamento do Ofício/Prancha (Lido, Ordem do Dia ou Sob Malhete) */}
                              <div className="rounded-lg border border-[#D4AF37]/60 bg-amber-50/40 dark:bg-slate-800/80 p-3.5 space-y-2.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
                                  3. Encaminhamento / Desfecho na Sessão:
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <label
                                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                                      destinoOficioAtual === 'lido_arquivado'
                                        ? 'border-[#1a365d] bg-[#1a365d]/10 dark:border-[#D4AF37] dark:bg-slate-900'
                                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      checked={
                                        destinoOficioAtual === 'lido_arquivado'
                                      }
                                      onChange={() => {
                                        setValue(
                                          `expedientesRecebidos.${idx}.destinoOficio`,
                                          'lido_arquivado',
                                          { shouldDirty: true }
                                        );
                                        atualizarTextoConvite({
                                          destinoOficio: 'lido_arquivado',
                                        });
                                      }}
                                      className="mt-0.5"
                                    />
                                    <div className="text-xs">
                                      <span className="font-bold block text-[#1a365d] dark:text-white">
                                        Lido e Arquivado
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        Lido em Loja, anotado e arquivado na
                                        Secretaria
                                      </span>
                                    </div>
                                  </label>

                                  <label
                                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                                      destinoOficioAtual === 'ordem_do_dia'
                                        ? 'border-[#1a365d] bg-[#1a365d]/10 dark:border-[#D4AF37] dark:bg-slate-900'
                                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        destinoOficioAtual === 'ordem_do_dia'
                                      }
                                      onChange={(e) => {
                                        const novoDestino: DestinoOficioPrancha =
                                          e.target.checked
                                            ? 'ordem_do_dia'
                                            : 'lido_arquivado';
                                        setValue(
                                          `expedientesRecebidos.${idx}.destinoOficio`,
                                          novoDestino,
                                          { shouldDirty: true }
                                        );
                                        atualizarTextoConvite({
                                          destinoOficio: novoDestino,
                                        });

                                        // Se marcou "Passar para Ordem do Dia" e ainda não enviou, já adiciona na Ordem do Dia
                                        if (
                                          novoDestino === 'ordem_do_dia' &&
                                          !enviadoOrdemDiaAtual
                                        ) {
                                          const tituloOd =
                                            comporTituloOrdemDiaDeOficio({
                                              numeroOficio: numeroOficioAtual,
                                              classificacaoOficio:
                                                classificacaoOficioAtual,
                                              outroTipoOficio:
                                                outroTipoOficioAtual,
                                              assuntoOficio: assuntoOficioAtual,
                                            });
                                          const resumoOd =
                                            assuntoOficioAtual ||
                                            (classificacaoOficioAtual ===
                                            'Outros'
                                              ? outroTipoOficioAtual
                                              : classificacaoOficioAtual);

                                          ordemDiaArray.append({
                                            tipoItemOrdemDia:
                                              'deliberacao_comum',
                                            titulo: tituloOd,
                                            resumoMateria: resumoOd,
                                            objetoManifestacao: true,
                                            tipoManifestacao:
                                              'sem_manifestacao',
                                            objetoVotacao: true,
                                            resultadoVotacao:
                                              'aprovada_unanimidade',
                                            cenarioEscrutinio: 'aprovado_limpo',
                                            tipoProcessoEscrutinio: 'Iniciação',
                                            nomeCandidato: '',
                                            totalVotantes:
                                              Number(
                                                getValues(
                                                  'quorum.qtdQuadroPresentes'
                                                )
                                              ) || 21,
                                            qtdEsferasBrancas:
                                              Number(
                                                getValues(
                                                  'quorum.qtdQuadroPresentes'
                                                )
                                              ) || 21,
                                            qtdEsferasPretas: 0,
                                            totalEsferasPrimeiroGiro: 20,
                                            resultadoProclamacao:
                                              'APROVADO E LIMPO',
                                            prazoDiasJustificativa: '15',
                                            dataSessaoAnterior: '',
                                            statusJustificativa:
                                              'não foi apresentada qualquer justificação pelo obreiro opositor',
                                            textoRedacaoFinal:
                                              comporRedacaoItemOrdemDia({
                                                tipoItemOrdemDia:
                                                  'deliberacao_comum',
                                                resumoMateria: resumoOd,
                                                objetoManifestacao: true,
                                                tipoManifestacao:
                                                  'sem_manifestacao',
                                                objetoVotacao: true,
                                                resultadoVotacao:
                                                  'aprovada_unanimidade',
                                              }),
                                          });
                                          setValue(
                                            `expedientesRecebidos.${idx}.enviadoOrdemDia`,
                                            true,
                                            { shouldDirty: true }
                                          );
                                          setStatusFeedback({
                                            tipo: 'sucesso',
                                            mensagem: `✓ Pautado automaticamente na seção 6.1 Ordem do Dia: "${tituloOd}"`,
                                          });
                                        }
                                      }}
                                      className="mt-0.5"
                                    />
                                    <div className="text-xs">
                                      <span className="font-bold block text-[#1a365d] dark:text-white">
                                        ☑ Passar para a Ordem do Dia
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        Pauta na Ordem do Dia como "Ofício/Prancha{' '}
                                        {numeroOficioAtual || '{nº}'} recebido
                                        com assunto..."
                                      </span>
                                    </div>
                                  </label>

                                  <label
                                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                                      destinoOficioAtual === 'sob_malhete'
                                        ? 'border-[#1a365d] bg-[#1a365d]/10 dark:border-[#D4AF37] dark:bg-slate-900'
                                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      checked={
                                        destinoOficioAtual === 'sob_malhete'
                                      }
                                      onChange={() => {
                                        setValue(
                                          `expedientesRecebidos.${idx}.destinoOficio`,
                                          'sob_malhete',
                                          { shouldDirty: true }
                                        );
                                        atualizarTextoConvite({
                                          destinoOficio: 'sob_malhete',
                                        });
                                      }}
                                      className="mt-0.5"
                                    />
                                    <div className="text-xs">
                                      <span className="font-bold block text-[#1a365d] dark:text-white">
                                        Ficou sob o Malhete
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        Retido sob o malhete do Ven∴ M∴ para
                                        oportuna deliberação
                                      </span>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Campo de Texto Final / Resumo (Totalmente Editável em todos os tipos) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-bold text-[#1a365d] dark:text-amber-300">
                                {tipoExpAtual === 'convite'
                                  ? 'Texto Final da Carta-Convite (Editável):'
                                  : tipoExpAtual === 'carta_consulta'
                                  ? 'Texto Final da Carta-Consulta (Editável):'
                                  : tipoExpAtual === 'oficio_prancha'
                                  ? 'Texto Final do Ofício / Prancha Recebido(a) (Editável):'
                                  : 'Resumo / Descrição do Expediente Recebido (Editável):'}
                              </label>
                              {(tipoExpAtual === 'convite' ||
                                tipoExpAtual === 'carta_consulta' ||
                                tipoExpAtual === 'oficio_prancha') && (
                                <button
                                  type="button"
                                  onClick={() => atualizarTextoConvite()}
                                  className="text-[11px] font-semibold text-[#1a365d] dark:text-[#D4AF37] underline"
                                >
                                  ↺ Remontar texto automático
                                </button>
                              )}
                            </div>
                            <textarea
                              rows={tipoExpAtual === 'normal' ? 2 : 3}
                              {...register(
                                `expedientesRecebidos.${idx}.descricao` as const
                              )}
                              placeholder={
                                tipoExpAtual === 'convite'
                                  ? 'Carta-convite da A∴R∴L∴S∴ ... para Sessão Magna de ...'
                                  : tipoExpAtual === 'carta_consulta'
                                  ? 'Carta(s) consulta(s) da A∴R∴L∴S∴ ... do(s) candidato(s) a ingresso em nossa Ordem...'
                                  : 'Ex: Ato/Decreto nº ... do G∴O∴B∴, Prancha ou Ofício recebido...'
                              }
                              className="w-full rounded-lg border border-[#D4AF37]/80 bg-[#FCFBF9] dark:bg-slate-950 p-3 text-sm leading-relaxed text-slate-800 dark:text-slate-100 focus:border-[#1a365d] focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. Saco de Propostas e Informações */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F9F8F6]/60 dark:bg-slate-800/40 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4AF37]/50 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#1a365d] dark:text-white flex items-center gap-2">
                      <span className="text-[#D4AF37]">∴</span> 5. Saco de
                      Propostas e Informações
                    </h2>
                    <p className="text-xs text-slate-500">
                      A frase padrão atualiza automaticamente conforme a
                      quantidade de colunas gravadas (ou quando não há colunas)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const novaQtd = sacoItensArray.fields.length + 1;
                      sacoItensArray.append({ descricao: '' });
                      setValue(
                        'sacoPropostasResultadoGeral',
                        gerarFrasePadraoSacoPropostas(novaQtd),
                        { shouldDirty: true }
                      );
                    }}
                    className="rounded-lg bg-[#1a365d] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B192C] transition-colors"
                  >
                    ＋ Adicionar Item Colhido no Saco
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                      Qtd. Colunas Gravadas
                    </label>
                    <input
                      type="number"
                      min={0}
                      defaultValue={sacoItensArray.fields.length}
                      onChange={(e) => {
                        const qtd = parseInt(e.target.value, 10) || 0;
                        setValue(
                          'sacoPropostasResultadoGeral',
                          gerarFrasePadraoSacoPropostas(qtd),
                          { shouldDirty: true }
                        );
                      }}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-bold text-[#1a365d]"
                    />
                  </div>

                  <div className="sm:col-span-9">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                        Resultado Geral do Giro (Pré-preenchido / Editável)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            'sacoPropostasResultadoGeral',
                            gerarFrasePadraoSacoPropostas(
                              sacoItensArray.fields.length
                            ),
                            { shouldDirty: true }
                          )
                        }
                        className="text-[11px] font-semibold text-[#1a365d] dark:text-[#D4AF37] underline"
                      >
                        ↺ Restaurar frase padrão
                      </button>
                    </div>
                    <input
                      type="text"
                      {...register('sacoPropostasResultadoGeral')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>

                {sacoItensArray.fields.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                      Itens Contidos no Saco de Propostas:
                    </label>
                    {sacoItensArray.fields.map((field, idx) => (
                      <div key={field.id} className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-[#1a365d] dark:text-[#D4AF37] w-6">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          {...register(
                            `itensSacoPropostas.${idx}.descricao` as const
                          )}
                          placeholder="Ex: Justificativa de ausência do Ir∴ ..., Proposta de admissão..."
                          className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const novaQtd = Math.max(
                              0,
                              sacoItensArray.fields.length - 1
                            );
                            sacoItensArray.remove(idx);
                            setValue(
                              'sacoPropostasResultadoGeral',
                              gerarFrasePadraoSacoPropostas(novaQtd),
                              { shouldDirty: true }
                            );
                          }}
                          className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!exibirTodasSecoes && (
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('basicos')}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('ordem_dia')}
                    className="rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0B192C]"
                  >
                    Próxima Seção: Ordem do Dia & Instruções →
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ================================================================
              ABA 3: ORDEM DO DIA, INSTRUÇÃO E TRONCO DE BENEFICÊNCIA
             ================================================================ */}
          {(exibirTodasSecoes || abaAtiva === 'ordem_dia') && (
            <section className="space-y-8 animate-fadeIn">
              {/* 6.1 Ordem do Dia */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F9F8F6]/60 dark:bg-slate-800/40 p-5">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#D4AF37]/50 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-[#1a365d] dark:text-white flex items-center gap-2">
                      <span className="text-[#D4AF37]">∴</span> 6.1 Ordem do Dia
                      (Leituras, Deliberações e Escrutínio Secreto)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Selecione o tipo de Ordem do Dia abaixo antes de inserir
                      para abrir apenas os campos correspondentes
                    </p>
                  </div>

                  {/* Select de Tipo de Ordem do Dia antes de inserir + Botão de Inserir */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                    <div className="sm:w-80">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37] mb-1">
                        Tipo de Ordem do Dia a inserir:
                      </label>
                      <select
                        value={tipoNovaOrdemDia}
                        onChange={(e) =>
                          setTipoNovaOrdemDia(
                            e.target.value as TipoItemOrdemDia
                          )
                        }
                        className="w-full rounded-lg border-2 border-[#1a365d] dark:border-[#D4AF37] bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-[#1a365d] dark:text-white focus:outline-none"
                      >
                        <option value="leitura_simples">
                          1. Sem Deliberação / Normal (Só Leitura: Ofício,
                          Quite, Prancha...)
                        </option>
                        <option value="deliberacao_comum">
                          2. Com Deliberação (Manifestação nas Colunas e/ou
                          Votação)
                        </option>
                        <option value="escrutinio">
                          3. Escrutínio Secreto (Urna: Iniciação, Regularização,
                          Filiação...)
                        </option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const votantesPadrao =
                          Number(getValues('quorum.qtdQuadroPresentes')) || 21;
                        const tituloSugerido =
                          tipoNovaOrdemDia === 'escrutinio'
                            ? 'Escrutínio Secreto — Processo de Iniciação'
                            : '';
                        const textoInicial =
                          tipoNovaOrdemDia === 'escrutinio'
                            ? comporRedacaoItemOrdemDia({
                                tipoItemOrdemDia: 'escrutinio',
                                objetoManifestacao: false,
                                objetoVotacao: false,
                                cenarioEscrutinio: 'aprovado_limpo',
                                tipoProcessoEscrutinio: 'Iniciação',
                                nomeCandidato: '',
                                totalVotantes: votantesPadrao,
                                qtdEsferasBrancas: votantesPadrao,
                                qtdEsferasPretas: 0,
                                totalEsferasPrimeiroGiro: votantesPadrao - 1,
                                resultadoProclamacao: 'APROVADO E LIMPO',
                                prazoDiasJustificativa: '15',
                                dataSessaoAnterior: '',
                                statusJustificativa:
                                  'não foi apresentada qualquer justificação pelo obreiro opositor',
                              })
                            : '';

                        ordemDiaArray.append({
                          tipoItemOrdemDia: tipoNovaOrdemDia,
                          titulo: tituloSugerido,
                          resumoMateria: '',
                          objetoManifestacao: false,
                          tipoManifestacao: 'sem_manifestacao',
                          objetoVotacao: false,
                          resultadoVotacao: 'aprovada_unanimidade',
                          cenarioEscrutinio: 'aprovado_limpo',
                          tipoProcessoEscrutinio: 'Iniciação',
                          nomeCandidato: '',
                          totalVotantes: votantesPadrao,
                          qtdEsferasBrancas: votantesPadrao,
                          qtdEsferasPretas: 0,
                          totalEsferasPrimeiroGiro: Math.max(
                            0,
                            votantesPadrao - 1
                          ),
                          resultadoProclamacao: 'APROVADO E LIMPO',
                          prazoDiasJustificativa: '15',
                          dataSessaoAnterior: '',
                          statusJustificativa:
                            'não foi apresentada qualquer justificação pelo obreiro opositor',
                          textoRedacaoFinal: textoInicial,
                        });
                      }}
                      className="rounded-lg bg-[#1a365d] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0B192C] shadow-sm transition-colors whitespace-nowrap"
                    >
                      ＋ Adicionar Matéria à Ordem do Dia
                    </button>
                  </div>
                </div>

                {ordemDiaArray.fields.length === 0 ? (
                  <p className="text-xs italic text-slate-500 py-3">
                    Nenhum item registrado na Ordem do Dia. Escolha o tipo acima
                    e clique em "＋ Adicionar Matéria à Ordem do Dia".
                  </p>
                ) : (
                  <div className="space-y-5">
                    {ordemDiaArray.fields.map((field, idx) => {
                      const tipoItemAtual: TipoItemOrdemDia =
                        watch(`itensOrdemDia.${idx}.tipoItemOrdemDia`) ||
                        'deliberacao_comum';
                      const resumoAtual =
                        watch(`itensOrdemDia.${idx}.resumoMateria`) || '';
                      const objetoManifestacaoAtual = Boolean(
                        watch(`itensOrdemDia.${idx}.objetoManifestacao`)
                      );
                      const manifestacaoAtual =
                        watch(`itensOrdemDia.${idx}.tipoManifestacao`) ||
                        'sem_manifestacao';
                      const objetoVotacaoAtual = Boolean(
                        watch(`itensOrdemDia.${idx}.objetoVotacao`)
                      );
                      const resultadoVotacaoAtual =
                        watch(`itensOrdemDia.${idx}.resultadoVotacao`) ||
                        'aprovada_unanimidade';

                      // Valores de Escrutínio Secreto
                      const cenarioEscrutinioAtual: CenarioEscrutinioOrdemDia =
                        watch(`itensOrdemDia.${idx}.cenarioEscrutinio`) ||
                        'aprovado_limpo';
                      const tipoProcessoAtual =
                        watch(`itensOrdemDia.${idx}.tipoProcessoEscrutinio`) ||
                        'Iniciação';
                      const nomeCandidatoAtual =
                        watch(`itensOrdemDia.${idx}.nomeCandidato`) || '';
                      const totalVotantesAtual = Number(
                        watch(`itensOrdemDia.${idx}.totalVotantes`) ?? 0
                      );
                      const qtdBrancasAtual = Number(
                        watch(`itensOrdemDia.${idx}.qtdEsferasBrancas`) ?? 0
                      );
                      const qtdPretasAtual = Number(
                        watch(`itensOrdemDia.${idx}.qtdEsferasPretas`) ?? 0
                      );
                      const totalEsferasCalculado =
                        qtdBrancasAtual + qtdPretasAtual;
                      const totalPrimeiroGiroAtual = Number(
                        watch(
                          `itensOrdemDia.${idx}.totalEsferasPrimeiroGiro`
                        ) ?? 0
                      );
                      const resultadoProclamacaoAtual =
                        watch(`itensOrdemDia.${idx}.resultadoProclamacao`) ||
                        'APROVADO E LIMPO';
                      const prazoDiasAtual =
                        watch(`itensOrdemDia.${idx}.prazoDiasJustificativa`) ||
                        '15';
                      const dataSessaoAnteriorAtual =
                        watch(`itensOrdemDia.${idx}.dataSessaoAnterior`) || '';
                      const statusJustificativaAtual =
                        watch(`itensOrdemDia.${idx}.statusJustificativa`) ||
                        'não foi apresentada qualquer justificação pelo obreiro opositor';

                      const atualizarRedacaoAutomatica = (
                        overrides?: Partial<{
                          tipoItemOrdemDia: TipoItemOrdemDia;
                          resumoMateria: string;
                          objetoManifestacao: boolean;
                          tipoManifestacao: TipoManifestacaoOrdemDia;
                          objetoVotacao: boolean;
                          resultadoVotacao: ResultadoVotacaoOrdemDia;
                          cenarioEscrutinio: CenarioEscrutinioOrdemDia;
                          tipoProcessoEscrutinio: string;
                          nomeCandidato: string;
                          totalVotantes: number;
                          qtdEsferasBrancas: number;
                          qtdEsferasPretas: number;
                          totalEsferasPrimeiroGiro: number;
                          resultadoProclamacao: string;
                          prazoDiasJustificativa: string;
                          dataSessaoAnterior: string;
                          statusJustificativa: string;
                        }>
                      ) => {
                        const novoTexto = comporRedacaoItemOrdemDia({
                          tipoItemOrdemDia:
                            overrides?.tipoItemOrdemDia !== undefined
                              ? overrides.tipoItemOrdemDia
                              : tipoItemAtual,
                          resumoMateria:
                            overrides?.resumoMateria !== undefined
                              ? overrides.resumoMateria
                              : resumoAtual,
                          objetoManifestacao:
                            overrides?.objetoManifestacao !== undefined
                              ? overrides.objetoManifestacao
                              : objetoManifestacaoAtual,
                          tipoManifestacao:
                            overrides?.tipoManifestacao !== undefined
                              ? overrides.tipoManifestacao
                              : manifestacaoAtual,
                          objetoVotacao:
                            overrides?.objetoVotacao !== undefined
                              ? overrides.objetoVotacao
                              : objetoVotacaoAtual,
                          resultadoVotacao:
                            overrides?.resultadoVotacao !== undefined
                              ? overrides.resultadoVotacao
                              : resultadoVotacaoAtual,
                          cenarioEscrutinio:
                            overrides?.cenarioEscrutinio !== undefined
                              ? overrides.cenarioEscrutinio
                              : cenarioEscrutinioAtual,
                          tipoProcessoEscrutinio:
                            overrides?.tipoProcessoEscrutinio !== undefined
                              ? overrides.tipoProcessoEscrutinio
                              : tipoProcessoAtual,
                          nomeCandidato:
                            overrides?.nomeCandidato !== undefined
                              ? overrides.nomeCandidato
                              : nomeCandidatoAtual,
                          totalVotantes:
                            overrides?.totalVotantes !== undefined
                              ? overrides.totalVotantes
                              : totalVotantesAtual,
                          qtdEsferasBrancas:
                            overrides?.qtdEsferasBrancas !== undefined
                              ? overrides.qtdEsferasBrancas
                              : qtdBrancasAtual,
                          qtdEsferasPretas:
                            overrides?.qtdEsferasPretas !== undefined
                              ? overrides.qtdEsferasPretas
                              : qtdPretasAtual,
                          totalEsferasPrimeiroGiro:
                            overrides?.totalEsferasPrimeiroGiro !== undefined
                              ? overrides.totalEsferasPrimeiroGiro
                              : totalPrimeiroGiroAtual,
                          resultadoProclamacao:
                            overrides?.resultadoProclamacao !== undefined
                              ? overrides.resultadoProclamacao
                              : resultadoProclamacaoAtual,
                          prazoDiasJustificativa:
                            overrides?.prazoDiasJustificativa !== undefined
                              ? overrides.prazoDiasJustificativa
                              : prazoDiasAtual,
                          dataSessaoAnterior:
                            overrides?.dataSessaoAnterior !== undefined
                              ? overrides.dataSessaoAnterior
                              : dataSessaoAnteriorAtual,
                          statusJustificativa:
                            overrides?.statusJustificativa !== undefined
                              ? overrides.statusJustificativa
                              : statusJustificativaAtual,
                        });
                        setValue(
                          `itensOrdemDia.${idx}.textoRedacaoFinal`,
                          novoTexto,
                          { shouldDirty: true, shouldValidate: true }
                        );
                      };

                      return (
                        <div
                          key={field.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4"
                        >
                          {/* Cabeçalho do Item da Ordem do Dia + Seletor do Tipo */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="md:col-span-4">
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                Tipo desta Matéria ({idx + 1}ª):
                              </label>
                              <select
                                value={tipoItemAtual}
                                onChange={(e) => {
                                  const novoTipo = e.target
                                    .value as TipoItemOrdemDia;
                                  setValue(
                                    `itensOrdemDia.${idx}.tipoItemOrdemDia`,
                                    novoTipo,
                                    { shouldDirty: true }
                                  );
                                  atualizarRedacaoAutomatica({
                                    tipoItemOrdemDia: novoTipo,
                                  });
                                }}
                                className="w-full rounded-lg border border-[#1a365d]/40 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-3 py-2 text-xs font-bold text-[#1a365d] dark:text-[#D4AF37]"
                              >
                                <option value="leitura_simples">
                                  1. Sem Deliberação / Normal (Só Leitura)
                                </option>
                                <option value="deliberacao_comum">
                                  2. Com Deliberação (Manifestação / Votação)
                                </option>
                                <option value="escrutinio">
                                  3. Escrutínio Secreto (Urna / Esferas)
                                </option>
                              </select>
                            </div>

                            <div className="md:col-span-6">
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37] mb-1">
                                Título da Pauta / Matéria
                              </label>
                              <input
                                type="text"
                                {...register(
                                  `itensOrdemDia.${idx}.titulo` as const
                                )}
                                placeholder={
                                  tipoItemAtual === 'leitura_simples'
                                    ? 'Ex: Leitura de Pedido de Quite Placet / Ofício Recebido / Prancha...'
                                    : tipoItemAtual === 'escrutinio'
                                    ? 'Ex: Escrutínio Secreto — Processo de Iniciação'
                                    : 'Ex: Apresentação do Balancete Financeiro / Assunto Administrativo...'
                                }
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-3.5 py-2 text-sm font-semibold"
                              />
                            </div>

                            <div className="md:col-span-2 flex md:justify-end pt-5">
                              <button
                                type="button"
                                onClick={() => ordemDiaArray.remove(idx)}
                                className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                                title="Remover matéria da Ordem do Dia"
                              >
                                ✕ Remover
                              </button>
                            </div>
                          </div>

                          {/* =========================================================
                              MODO 1 E 2: CAMPO DE RESUMO (SÓ LEITURA OU DELIBERAÇÃO)
                             ========================================================= */}
                          {(tipoItemAtual === 'leitura_simples' ||
                            tipoItemAtual === 'deliberacao_comum') && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                {tipoItemAtual === 'leitura_simples'
                                  ? 'Resumo / Teor do Documento Lido (Prancha, Pedido de Quite, Ofício, etc.):'
                                  : 'Resumo / Anotação sobre a Matéria (O que foi exposto ou lido):'}
                              </label>
                              <textarea
                                rows={2}
                                {...register(
                                  `itensOrdemDia.${idx}.resumoMateria` as const
                                )}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setValue(
                                    `itensOrdemDia.${idx}.resumoMateria`,
                                    val,
                                    { shouldDirty: true }
                                  );
                                  atualizarRedacaoAutomatica({
                                    resumoMateria: val,
                                  });
                                }}
                                placeholder={
                                  tipoItemAtual === 'leitura_simples'
                                    ? 'Ex: Foi lido o pedido de Quite Placet (ou prancha/ofício colhido no Saco de Propostas) referente ao...'
                                    : 'Digite aqui o resumo do que precisa ser anotado sobre esta matéria...'
                                }
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-3.5 py-2 text-sm"
                              />
                            </div>
                          )}

                          {/* =========================================================
                              MODO 2: MANIFESTAÇÃO NAS COLUNAS E VOTAÇÃO
                             ========================================================= */}
                          {tipoItemAtual === 'deliberacao_comum' && (
                            <>
                              {/* Checkbox: Objeto de Manifestação + Seleção Exclusiva */}
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F9F8F6]/80 dark:bg-slate-800/60 p-3.5 space-y-3">
                                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={objetoManifestacaoAtual}
                                    onChange={(e) => {
                                      const marcado = e.target.checked;
                                      setValue(
                                        `itensOrdemDia.${idx}.objetoManifestacao`,
                                        marcado,
                                        { shouldDirty: true }
                                      );
                                      if (
                                        marcado &&
                                        !watch(
                                          `itensOrdemDia.${idx}.tipoManifestacao`
                                        )
                                      ) {
                                        setValue(
                                          `itensOrdemDia.${idx}.tipoManifestacao`,
                                          'sem_manifestacao'
                                        );
                                      }
                                      atualizarRedacaoAutomatica({
                                        objetoManifestacao: marcado,
                                        tipoManifestacao:
                                          manifestacaoAtual ||
                                          'sem_manifestacao',
                                      });
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-[#1a365d] focus:ring-[#1a365d]"
                                  />
                                  <span className="text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
                                    🗣 Esta matéria foi Objeto de Manifestação
                                    nas Colunas?
                                  </span>
                                </label>

                                {objetoManifestacaoAtual && (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 animate-fadeIn">
                                    {[
                                      {
                                        valor: 'sem_manifestacao' as const,
                                        label: 'Sem Manifestação',
                                        desc: 'Silêncio nas Colunas',
                                      },
                                      {
                                        valor: 'manifestacao_positiva' as const,
                                        label: 'Manifestação Positiva',
                                        desc: 'Apoio dos Irmãos',
                                      },
                                      {
                                        valor: 'manifestacao_negativa' as const,
                                        label: 'Manifestação Negativa',
                                        desc: 'Opiniões contrárias/ressalvas',
                                      },
                                    ].map((opcao) => {
                                      const selecionado =
                                        manifestacaoAtual === opcao.valor;
                                      return (
                                        <button
                                          key={opcao.valor}
                                          type="button"
                                          onClick={() => {
                                            setValue(
                                              `itensOrdemDia.${idx}.tipoManifestacao`,
                                              opcao.valor,
                                              { shouldDirty: true }
                                            );
                                            atualizarRedacaoAutomatica({
                                              objetoManifestacao: true,
                                              tipoManifestacao: opcao.valor,
                                            });
                                          }}
                                          className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                                            selecionado
                                              ? 'border-[#1a365d] bg-[#1a365d] text-white shadow-sm'
                                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#D4AF37]'
                                          }`}
                                        >
                                          <span
                                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                              selecionado
                                                ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B192C]'
                                                : 'border-slate-400'
                                            }`}
                                          >
                                            {selecionado && (
                                              <span className="h-2 w-2 rounded-full bg-[#0B192C]" />
                                            )}
                                          </span>
                                          <div>
                                            <p className="text-xs font-bold leading-tight">
                                              {opcao.label}
                                            </p>
                                            <p
                                              className={`text-[11px] ${
                                                selecionado
                                                  ? 'text-amber-200'
                                                  : 'text-slate-500'
                                              }`}
                                            >
                                              {opcao.desc}
                                            </p>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Checkbox: Objeto de Votação + Opções de Resultado */}
                              <div className="rounded-lg border border-[#D4AF37]/60 bg-amber-50/30 dark:bg-slate-800/40 p-3.5 space-y-3">
                                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={objetoVotacaoAtual}
                                    onChange={(e) => {
                                      const marcado = e.target.checked;
                                      setValue(
                                        `itensOrdemDia.${idx}.objetoVotacao`,
                                        marcado,
                                        { shouldDirty: true }
                                      );
                                      if (
                                        marcado &&
                                        !watch(
                                          `itensOrdemDia.${idx}.resultadoVotacao`
                                        )
                                      ) {
                                        setValue(
                                          `itensOrdemDia.${idx}.resultadoVotacao`,
                                          'aprovada_unanimidade'
                                        );
                                      }
                                      atualizarRedacaoAutomatica({
                                        objetoVotacao: marcado,
                                        resultadoVotacao:
                                          resultadoVotacaoAtual ||
                                          'aprovada_unanimidade',
                                      });
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-[#1a365d] focus:ring-[#1a365d]"
                                  />
                                  <span className="text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
                                    ⚖ Esta matéria foi Objeto de Votação?
                                  </span>
                                </label>

                                {objetoVotacaoAtual && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 animate-fadeIn">
                                    {[
                                      {
                                        valor: 'aprovada_unanimidade' as const,
                                        label: 'Aprovada por Unanimidade',
                                      },
                                      {
                                        valor: 'aprovada_maioria' as const,
                                        label: 'Aprovada por Maioria',
                                      },
                                      {
                                        valor: 'negada_unanimidade' as const,
                                        label: 'Negada por Unanimidade',
                                      },
                                      {
                                        valor: 'negada_maioria' as const,
                                        label: 'Negada por Maioria',
                                      },
                                    ].map((opVoto) => {
                                      const ativo =
                                        resultadoVotacaoAtual === opVoto.valor;
                                      return (
                                        <button
                                          key={opVoto.valor}
                                          type="button"
                                          onClick={() => {
                                            setValue(
                                              `itensOrdemDia.${idx}.resultadoVotacao`,
                                              opVoto.valor,
                                              { shouldDirty: true }
                                            );
                                            atualizarRedacaoAutomatica({
                                              objetoVotacao: true,
                                              resultadoVotacao: opVoto.valor,
                                            });
                                          }}
                                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all text-left flex items-center gap-2 ${
                                            ativo
                                              ? 'border-[#D4AF37] bg-[#0B192C] text-[#D4AF37] shadow-sm'
                                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#D4AF37]'
                                          }`}
                                        >
                                          <span>{ativo ? '●' : '○'}</span>
                                          <span>{opVoto.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* =========================================================
                              MODO 3: ESCRUTÍNIO SECRETO (URNA / ESFERAS)
                             ========================================================= */}
                          {tipoItemAtual === 'escrutinio' && (
                            <div className="rounded-xl border-2 border-[#D4AF37] bg-amber-50/40 dark:bg-slate-800/70 p-4 space-y-4 animate-fadeIn">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4AF37]/40 pb-2.5">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
                                  ⚱ Dados do Escrutínio Secreto (Urna e
                                  Contagem de Esferas)
                                </span>
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  O texto litúrgico é montado automaticamente
                                  conforme a contagem e o cenário abaixo
                                </span>
                              </div>

                              {/* Seletor de Cenário do Escrutínio */}
                              <div>
                                <label className="block text-xs font-bold text-[#1a365d] dark:text-amber-300 mb-1.5">
                                  Situação / Desfecho do Escrutínio:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                  {[
                                    {
                                      id: 'aprovado_limpo' as const,
                                      label: '1. Aprovado (1ª Apuração)',
                                      proclama: 'APROVADO E LIMPO',
                                    },
                                    {
                                      id: 'divergencia_segundo_giro' as const,
                                      label: '2. Divergência (2º Giro)',
                                      proclama: 'APROVADO E LIMPO',
                                    },
                                    {
                                      id: 'sobrestado_1_ou_2_pretas' as const,
                                      label: '3. Sobrestado (1 ou 2 Pretas)',
                                      proclama: 'SOBRESTADO',
                                    },
                                    {
                                      id: 'rejeitado_3_ou_mais_pretas' as const,
                                      label: '4. Rejeitado (3+ Pretas)',
                                      proclama: 'REJEITADO',
                                    },
                                    {
                                      id: 'desfecho_sessao_posterior' as const,
                                      label:
                                        '5. Desfecho de Sobrestamento Anterior',
                                      proclama: 'APROVADO E LIMPO',
                                    },
                                  ].map((cen) => {
                                    const selecionado =
                                      cenarioEscrutinioAtual === cen.id;
                                    return (
                                      <button
                                        key={cen.id}
                                        type="button"
                                        onClick={() => {
                                          setValue(
                                            `itensOrdemDia.${idx}.cenarioEscrutinio`,
                                            cen.id,
                                            { shouldDirty: true }
                                          );
                                          setValue(
                                            `itensOrdemDia.${idx}.resultadoProclamacao`,
                                            cen.proclama,
                                            { shouldDirty: true }
                                          );
                                          atualizarRedacaoAutomatica({
                                            cenarioEscrutinio: cen.id,
                                            resultadoProclamacao: cen.proclama,
                                          });
                                        }}
                                        className={`rounded-lg border px-3 py-2 text-xs font-bold text-left transition-all ${
                                          selecionado
                                            ? 'border-[#1a365d] bg-[#1a365d] text-white shadow-sm'
                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#D4AF37]'
                                        }`}
                                      >
                                        {cen.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Campos principais: Tipo de Processo, Nome do Candidato e Resultado da Proclamação */}
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                <div className="sm:col-span-3">
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Tipo de Escrutínio / Processo
                                  </label>
                                  <select
                                    value={tipoProcessoAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `itensOrdemDia.${idx}.tipoProcessoEscrutinio`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      setValue(
                                        `itensOrdemDia.${idx}.titulo`,
                                        `Escrutínio Secreto — Processo de ${val}`,
                                        { shouldDirty: true }
                                      );
                                      atualizarRedacaoAutomatica({
                                        tipoProcessoEscrutinio: val,
                                      });
                                    }}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold"
                                  >
                                    <option value="Iniciação">Iniciação</option>
                                    <option value="Regularização">
                                      Regularização
                                    </option>
                                    <option value="Filiação">Filiação</option>
                                    <option value="Elevação">Elevação</option>
                                    <option value="Exaltação">Exaltação</option>
                                  </select>
                                </div>

                                <div className="sm:col-span-5">
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Nome do Candidato *
                                  </label>
                                  <input
                                    type="text"
                                    value={nomeCandidatoAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `itensOrdemDia.${idx}.nomeCandidato`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarRedacaoAutomatica({
                                        nomeCandidato: val,
                                      });
                                    }}
                                    placeholder="Digite o nome completo do candidato..."
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
                                  />
                                </div>

                                <div className="sm:col-span-4">
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Resultado da Proclamação
                                  </label>
                                  <input
                                    type="text"
                                    value={resultadoProclamacaoAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `itensOrdemDia.${idx}.resultadoProclamacao`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarRedacaoAutomatica({
                                        resultadoProclamacao: val,
                                      });
                                    }}
                                    placeholder="Ex: APROVADO E LIMPO / SOBRESTADO / REJEITADO"
                                    className="w-full rounded-lg border border-[#D4AF37] bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-[#1a365d] dark:text-[#D4AF37]"
                                  />
                                </div>
                              </div>

                              {/* Se NÃO for Desfecho de Sessão Posterior: exibe contagem de Votantes, Esferas Brancas e Esferas Pretas */}
                              {cenarioEscrutinioAtual !==
                                'desfecho_sessao_posterior' && (
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                      Total de Irmãos Votantes
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={totalVotantesAtual}
                                      onChange={(e) => {
                                        const val =
                                          parseInt(e.target.value, 10) || 0;
                                        setValue(
                                          `itensOrdemDia.${idx}.totalVotantes`,
                                          val,
                                          { shouldDirty: true }
                                        );
                                        atualizarRedacaoAutomatica({
                                          totalVotantes: val,
                                        });
                                      }}
                                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-[#1a365d]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                      ⚪ Esferas Brancas
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={qtdBrancasAtual}
                                      onChange={(e) => {
                                        const val =
                                          parseInt(e.target.value, 10) || 0;
                                        setValue(
                                          `itensOrdemDia.${idx}.qtdEsferasBrancas`,
                                          val,
                                          { shouldDirty: true }
                                        );
                                        atualizarRedacaoAutomatica({
                                          qtdEsferasBrancas: val,
                                        });
                                      }}
                                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-emerald-700"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                      ⚫ Esferas Pretas
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={qtdPretasAtual}
                                      onChange={(e) => {
                                        const val =
                                          parseInt(e.target.value, 10) || 0;
                                        setValue(
                                          `itensOrdemDia.${idx}.qtdEsferasPretas`,
                                          val,
                                          { shouldDirty: true }
                                        );

                                        // Sugere automaticamente o cenário e proclamação conforme o nº de esferas pretas
                                        let novoCenario =
                                          cenarioEscrutinioAtual;
                                        let novaProclamacao =
                                          resultadoProclamacaoAtual;

                                        if (
                                          cenarioEscrutinioAtual !==
                                          'divergencia_segundo_giro'
                                        ) {
                                          if (val === 0) {
                                            novoCenario = 'aprovado_limpo';
                                            novaProclamacao =
                                              'APROVADO E LIMPO';
                                          } else if (val === 1 || val === 2) {
                                            novoCenario =
                                              'sobrestado_1_ou_2_pretas';
                                            novaProclamacao = 'SOBRESTADO';
                                          } else if (val >= 3) {
                                            novoCenario =
                                              'rejeitado_3_ou_mais_pretas';
                                            novaProclamacao = 'REJEITADO';
                                          }
                                          setValue(
                                            `itensOrdemDia.${idx}.cenarioEscrutinio`,
                                            novoCenario,
                                            { shouldDirty: true }
                                          );
                                          setValue(
                                            `itensOrdemDia.${idx}.resultadoProclamacao`,
                                            novaProclamacao,
                                            { shouldDirty: true }
                                          );
                                        }

                                        atualizarRedacaoAutomatica({
                                          qtdEsferasPretas: val,
                                          cenarioEscrutinio: novoCenario,
                                          resultadoProclamacao: novaProclamacao,
                                        });
                                      }}
                                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-red-700"
                                    />
                                  </div>

                                  <div className="flex flex-col justify-center rounded-lg border border-[#D4AF37]/60 bg-white dark:bg-slate-900 px-3 py-2">
                                    <span className="text-[10px] font-bold uppercase text-slate-500">
                                      Total de Esferas Apuradas
                                    </span>
                                    <div className="flex items-center justify-between">
                                      <span className="text-base font-extrabold text-[#1a365d] dark:text-[#D4AF37]">
                                        {totalEsferasCalculado} esferas
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          totalEsferasCalculado ===
                                          totalVotantesAtual
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {totalEsferasCalculado ===
                                        totalVotantesAtual
                                          ? '✓ Confere'
                                          : '≠ Divergente'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Campo extra se Cenário 2: Divergência no 1º Giro */}
                              {cenarioEscrutinioAtual ===
                                'divergencia_segundo_giro' && (
                                <div className="rounded-lg border border-amber-300 bg-white dark:bg-slate-900 p-3">
                                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                                    Total de sufrágios recolhidos na 1ª apuração
                                    divergente (antes de refazer o giro):
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={totalPrimeiroGiroAtual}
                                    onChange={(e) => {
                                      const val =
                                        parseInt(e.target.value, 10) || 0;
                                      setValue(
                                        `itensOrdemDia.${idx}.totalEsferasPrimeiroGiro`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarRedacaoAutomatica({
                                        totalEsferasPrimeiroGiro: val,
                                      });
                                    }}
                                    className="w-40 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-bold"
                                  />
                                </div>
                              )}

                              {/* Campo extra se Cenário 3: Sobrestado (Prazo em dias para justificativa por escrito) */}
                              {cenarioEscrutinioAtual ===
                                'sobrestado_1_ou_2_pretas' && (
                                <div className="rounded-lg border border-amber-300 bg-white dark:bg-slate-900 p-3">
                                  <label className="block text-xs font-bold text-[#1a365d] dark:text-amber-300 mb-1">
                                    Prazo regulamentar (em dias) para o(s)
                                    Irmão(ãos) opositor(es) apresentar(em)
                                    justificativa por escrito:
                                  </label>
                                  <input
                                    type="text"
                                    value={prazoDiasAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setValue(
                                        `itensOrdemDia.${idx}.prazoDiasJustificativa`,
                                        val,
                                        { shouldDirty: true }
                                      );
                                      atualizarRedacaoAutomatica({
                                        prazoDiasJustificativa: val,
                                      });
                                    }}
                                    placeholder="Ex: 15 (ou 30)"
                                    className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold"
                                  />
                                </div>
                              )}

                              {/* Campos extras se Cenário 5: Desfecho de Escrutínio Sobrestado em Sessão Anterior */}
                              {cenarioEscrutinioAtual ===
                                'desfecho_sessao_posterior' && (
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-lg border border-[#1a365d]/30 bg-white dark:bg-slate-900 p-3">
                                  <div className="sm:col-span-4">
                                    <label className="block text-xs font-bold text-[#1a365d] dark:text-amber-300 mb-1">
                                      Data da Sessão Anterior (do Escrutínio):
                                    </label>
                                    <input
                                      type="text"
                                      value={dataSessaoAnteriorAtual}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setValue(
                                          `itensOrdemDia.${idx}.dataSessaoAnterior`,
                                          val,
                                          { shouldDirty: true }
                                        );
                                        atualizarRedacaoAutomatica({
                                          dataSessaoAnterior: val,
                                        });
                                      }}
                                      placeholder="Ex: 07/10/2026"
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
                                    />
                                  </div>

                                  <div className="sm:col-span-8 space-y-1.5">
                                    <label className="block text-xs font-bold text-[#1a365d] dark:text-amber-300">
                                      Situação da Justificativa do Irmão
                                      Opositor (Selecione ou edite):
                                    </label>
                                    <select
                                      value={statusJustificativaAtual}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setValue(
                                          `itensOrdemDia.${idx}.statusJustificativa`,
                                          val,
                                          { shouldDirty: true }
                                        );
                                        atualizarRedacaoAutomatica({
                                          statusJustificativa: val,
                                        });
                                      }}
                                      className="w-full rounded-lg border border-slate-300 bg-[#F9F8F6] px-3 py-1.5 text-xs"
                                    >
                                      <option value="não foi apresentada qualquer justificação pelo obreiro opositor">
                                        1. Não foi apresentada qualquer
                                        justificação pelo obreiro opositor
                                      </option>
                                      <option value="foi apresentada fundamentação que, analisada em câmara própria, foi considerada improcedente">
                                        2. Foi apresentada fundamentação que,
                                        analisada em câmara própria, foi
                                        considerada improcedente
                                      </option>
                                    </select>
                                    <input
                                      type="text"
                                      value={statusJustificativaAtual}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setValue(
                                          `itensOrdemDia.${idx}.statusJustificativa`,
                                          val,
                                          { shouldDirty: true }
                                        );
                                        atualizarRedacaoAutomatica({
                                          statusJustificativa: val,
                                        });
                                      }}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Texto Final da Matéria (Totalmente Editável) */}
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <label className="text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-amber-300">
                                Redação Litúrgica da Matéria (Editável pelo
                                Secretário):
                              </label>
                              <button
                                type="button"
                                onClick={() => atualizarRedacaoAutomatica()}
                                className="text-[11px] font-semibold text-[#1a365d] dark:text-[#D4AF37] underline hover:opacity-80"
                              >
                                ↺ Remontar texto padrão a partir das opções
                                acima
                              </button>
                            </div>
                            <textarea
                              rows={4}
                              {...register(
                                `itensOrdemDia.${idx}.textoRedacaoFinal` as const
                              )}
                              className="w-full rounded-lg border border-[#D4AF37]/80 bg-[#FCFBF9] dark:bg-slate-950 p-3 text-sm leading-relaxed text-slate-800 dark:text-slate-100 focus:border-[#1a365d] focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 6.2 Tempo de Instrução */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F9F8F6]/60 dark:bg-slate-800/40 p-5 space-y-4">
                <div className="border-b border-[#D4AF37]/50 pb-3">
                  <h2 className="text-lg font-bold text-[#1a365d] dark:text-white flex items-center gap-2">
                    <span className="text-[#D4AF37]">∴</span> 6.2 Tempo de
                    Instrução (Peça de Arquitetura)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tema ou título da instrução ritualística/filosófica, Irmão
                    apresentador e resumo opcional
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-3.5">
                    <label className="block text-sm font-semibold text-[#1a365d] dark:text-slate-100 mb-2">
                      Tema / Título do Trabalho ou Instrução
                    </label>
                    <input
                      type="text"
                      {...register('tempoInstrucao.temaTitulo')}
                      placeholder="Ex: Simbologia do Painel do Grau de Aprendiz"
                      className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>

                  <IrmaoSelectField
                    label="Irmão Apresentador da Instrução"
                    selectPath="tempoInstrucao.apresentadorSelecionado"
                    outroPath="tempoInstrucao.apresentadorOutro"
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    allowEmpty
                    emptyLabel="-- Selecione o Irmão Apresentador (se houve) --"
                    listaIrmaos={irmaosQuadro}
                  />
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-3.5">
                  <label className="block text-sm font-semibold text-[#1a365d] dark:text-slate-100 mb-1">
                    Resumo / Anotações da Instrução (Opcional)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Pode ser preenchido com uma síntese do trabalho apresentado
                    ou deixado em branco
                  </p>
                  <textarea
                    rows={3}
                    {...register('tempoInstrucao.resumoInstrucao')}
                    placeholder="Ex: O Irmão discorreu sobre os aspectos históricos e filosóficos do grau, destacando..."
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* 7. Tronco de Beneficência */}
              <div className="rounded-xl border border-[#D4AF37]/60 bg-amber-50/30 dark:bg-slate-800/50 p-5 space-y-4">
                <div className="border-b border-[#D4AF37]/50 pb-3">
                  <h2 className="text-lg font-bold text-[#1a365d] dark:text-amber-300 flex items-center gap-2">
                    <span className="text-[#D4AF37]">∴</span> 7. Tronco de
                    Beneficência (Solidariedade)
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Ao digitar o valor em número, o sistema preenche
                    automaticamente o valor por extenso entre parênteses para a
                    Ata
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Valor Apurado (Em Número)
                    </label>
                    <input
                      type="text"
                      {...register('troncoBeneficencia.valorApurado')}
                      onChange={(e) => {
                        const formatado = formatarMoedaBRL(e.target.value);
                        const extenso = valorMonetarioPorExtenso(formatado);
                        setValue('troncoBeneficencia.valorApurado', formatado, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        setValue('troncoBeneficencia.valorPorExtenso', extenso, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }}
                      placeholder="R$ 0,00"
                      className="w-full rounded-lg border border-[#D4AF37] bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base font-bold text-[#1a365d] dark:text-[#D4AF37]"
                    />
                  </div>

                  <div className="md:col-span-8">
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Valor por Extenso (Gerado Automaticamente / Editável)
                    </label>
                    <input
                      type="text"
                      {...register('troncoBeneficencia.valorPorExtenso')}
                      placeholder="zero reais"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm italic text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="md:col-span-12">
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Destino / Conferência (Padrão: "A cargo e julgo da
                      hospitalaria")
                    </label>
                    <input
                      type="text"
                      {...register('troncoBeneficencia.destinoConferencia')}
                      placeholder="A cargo e julgo da hospitalaria"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>

                {/* Prévia de como sairá no Balaústre impresso */}
                <div className="rounded-lg border border-[#D4AF37]/40 bg-white/80 dark:bg-slate-900/80 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-[#1a365d] dark:text-[#D4AF37]">
                    Saída na Ata Impressa:{' '}
                  </span>
                  <span>
                    {formatarTroncoComExtenso(
                      watch('troncoBeneficencia.valorApurado'),
                      watch('troncoBeneficencia.valorPorExtenso')
                    )}{' '}
                    — Destino:{' '}
                    <strong>
                      {watch('troncoBeneficencia.destinoConferencia') ||
                        'A cargo e julgo da hospitalaria'}
                    </strong>
                  </span>
                </div>
              </div>

              {!exibirTodasSecoes && (
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('expediente')}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('palavra_encerramento')}
                    className="rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0B192C]"
                  >
                    Próxima Seção: Palavra a Bem da Ordem & Encerramento →
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ================================================================
              ABA 4: PALAVRA A BEM DA ORDEM E ENCERRAMENTO
             ================================================================ */}
          {(exibirTodasSecoes || abaAtiva === 'palavra_encerramento') && (
            <section className="space-y-8 animate-fadeIn">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#D4AF37]/50 pb-2 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#D4AF37] font-bold">∴</span>
                    <h2 className="text-lg font-bold text-[#1a365d] dark:text-white">
                      8. Palavra a Bem Geral da Ordem e do Quadro em Particular
                    </h2>
                  </div>
                  <span className="rounded-full border border-[#D4AF37]/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-bold text-[#1a365d] dark:text-[#D4AF37]">
                    {ehRitoBrasileiro(lojaConfigWatch.ritoPotencia)
                      ? '🏛️ Rito Brasileiro: Coluna do Sul → Coluna do Norte → Oriente'
                      : `🏛️ ${lojaConfigWatch.ritoPotencia || 'Demais Ritos'}: Coluna do Norte → Coluna do Sul → Oriente`}
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Módulo Inteligente de Seleção de Falas Padronizadas, Chanceler, Tesoureiro e Texto Consolidado */}
                  <AssistenteManifestacoesItem8
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    listaIrmaos={irmaosQuadro}
                  />

                  {ehRitoBrasileiro(lojaConfigWatch.ritoPotencia) ? (
                    <>
                      <ColunaFalasFieldArray
                        tituloColuna="Coluna do Sul"
                        subtituloRitualistico="Sob o comando do Ir∴ 1º Vigilante (1ª Coluna no Rito Brasileiro)"
                        fieldArrayName="palavraBemDaOrdem.colunaSul"
                        control={control}
                        register={register}
                        watch={watch}
                        setValue={setValue}
                        listaIrmaos={irmaosQuadro}
                      />

                      <ColunaFalasFieldArray
                        tituloColuna="Coluna do Norte"
                        subtituloRitualistico="Sob o comando do Ir∴ 2º Vigilante (2ª Coluna no Rito Brasileiro)"
                        fieldArrayName="palavraBemDaOrdem.colunaNorte"
                        control={control}
                        register={register}
                        watch={watch}
                        setValue={setValue}
                        listaIrmaos={irmaosQuadro}
                      />
                    </>
                  ) : (
                    <>
                      <ColunaFalasFieldArray
                        tituloColuna="Coluna do Norte"
                        subtituloRitualistico="Sob o comando do Ir∴ 2º Vigilante (1ª Coluna neste Rito)"
                        fieldArrayName="palavraBemDaOrdem.colunaNorte"
                        control={control}
                        register={register}
                        watch={watch}
                        setValue={setValue}
                        listaIrmaos={irmaosQuadro}
                      />

                      <ColunaFalasFieldArray
                        tituloColuna="Coluna do Sul"
                        subtituloRitualistico="Sob o comando do Ir∴ 1º Vigilante (2ª Coluna neste Rito)"
                        fieldArrayName="palavraBemDaOrdem.colunaSul"
                        control={control}
                        register={register}
                        watch={watch}
                        setValue={setValue}
                        listaIrmaos={irmaosQuadro}
                      />
                    </>
                  )}

                  <ColunaFalasFieldArray
                    tituloColuna="Coluna do Oriente"
                    subtituloRitualistico="IIr∴ e Autoridades com assento no Oriente"
                    fieldArrayName="palavraBemDaOrdem.colunaOriente"
                    control={control}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    listaIrmaos={irmaosQuadro}
                  />

                  <ColunaFalasFieldArray
                    tituloColuna="Altar"
                    subtituloRitualistico="Luzes e Oficiais nos Altares"
                    fieldArrayName="palavraBemDaOrdem.colunaAltar"
                    control={control}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    listaIrmaos={irmaosQuadro}
                  />

                  {/* Palavra do Venerável Mestre e Palavra do Orador */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-4 shadow-sm">
                      <label className="block text-sm font-bold text-[#1a365d] dark:text-amber-300 mb-1">
                        ∴ Palavra do Venerável Mestre
                      </label>
                      <p className="text-xs text-slate-500 mb-2">
                        Considerações finais, agradecimentos e orientações antes
                        da conclusão do Orador
                      </p>
                      <textarea
                        rows={4}
                        {...register(
                          'palavraBemDaOrdem.palavraVeneravelMestre'
                        )}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 p-3 text-sm"
                      />
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 p-4 shadow-sm">
                      <label className="block text-sm font-bold text-[#1a365d] dark:text-amber-300 mb-1">
                        ∴ Palavra do Ir∴ Orador (Guarda da Lei)
                      </label>
                      <p className="text-xs text-slate-500 mb-2">
                        Conclusões das leis, saudações aos visitantes e parecer
                        legal encerrando as falas da sessão
                      </p>
                      <textarea
                        rows={4}
                        {...register('palavraBemDaOrdem.palavraOrador')}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-900 p-3 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 9. Encerramento e Ações de Saída */}
              <div className="rounded-2xl border-2 border-[#D4AF37] bg-gradient-to-br from-[#0B192C] to-[#1a365d] p-6 text-white shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/15 pb-5">
                  <div>
                    <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
                      <span>∴</span> 9. Encerramento Ritualístico & Lavratura do
                      Balaústre
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Informe o horário de fechamento dos trabalhos e escolha a
                      ação de saída
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-amber-200">
                      Horário de Encerramento:
                    </label>
                    <input
                      type="time"
                      {...register('horarioEncerramento')}
                      className="rounded-lg border border-[#D4AF37] bg-slate-900 px-3.5 py-2 text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Três Ações de Saída */}
                <div
                  className={`mt-6 grid grid-cols-1 ${
                    permissoes.podeEditarBalaustre
                      ? 'sm:grid-cols-3'
                      : 'sm:grid-cols-2'
                  } gap-4`}
                >
                  {/* 1. Exportar Texto / Minuta */}
                  <button
                    type="button"
                    onClick={handleExportarMinutaTxt}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3.5 text-sm font-bold text-white hover:bg-white/20 transition-all"
                  >
                    <span>📄</span> 1. Exportar Texto / Minuta (.TXT)
                  </button>

                  {/* 2. Pré-visualizar Balaústre */}
                  <button
                    type="button"
                    onClick={() => setModalPreviewAberto(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37] bg-[#D4AF37]/20 px-4 py-3.5 text-sm font-bold text-[#D4AF37] hover:bg-[#D4AF37]/30 transition-all"
                  >
                    <span>📜</span> 2. Pré-visualizar Balaústre
                  </button>

                  {/* 3. Salvar no Supabase (Oculto para Obreiro / Somente Consulta) */}
                  {permissoes.podeEditarBalaustre && (
                    <button
                      type="submit"
                      disabled={salvandoSupabase}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3.5 text-sm font-extrabold text-[#0B192C] shadow-md hover:bg-[#e0bc42] disabled:opacity-60 transition-all"
                    >
                      <span>💾</span>
                      {salvandoSupabase
                        ? 'Gravando no Supabase...'
                        : '3. Salvar no Supabase'}
                    </button>
                  )}
                </div>
              </div>

              {!exibirTodasSecoes && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('ordem_dia')}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    ← Voltar para Ordem do Dia & Instruções
                  </button>
                </div>
              )}
            </section>
          )}
        </form>
      </div>

      {/* Modal Super Usuário: Gestão Multi-Tenant de Lojas e Geração de Usuário Admin */}
      <GerenciadorLojasMultiTenantModal
        isOpen={modalMultiLojasAberto}
        onClose={() => setModalMultiLojasAberto(false)}
        lojaIdAtiva={lojaIdAtiva}
        onSelecionarLojaAtiva={handleSelecionarLojaMultiTenant}
      />

      {/* Modal de Configurações Dinâmicas da Loja e Logomarca (Bucket logomarcas) */}
      <ConfiguracaoLojaModal
        isOpen={modalConfigAberto}
        onClose={() => setModalConfigAberto(false)}
        configAtual={lojaConfigWatch}
        lojaId={lojaIdAtiva}
        onSaveConfig={handleSalvarConfiguracaoLoja}
      />

      {/* Modal de Gestão do Quadro de Obreiros, Diretoria Titular e Acessos CIM */}
      <GerenciadorQuadroDiretoriaModal
        isOpen={modalQuadroDiretoriaAberto}
        onClose={() => setModalQuadroDiretoriaAberto(false)}
        lojaId={lojaIdAtiva}
        papelUsuario={sessaoLogada?.papel}
        irmaosAtuais={irmaosQuadro}
        diretoriaAtual={diretoriaTitular}
        periodoGestaoAtual={lojaConfigWatch?.gestao || '2025-2027'}
        abaInicial={abaInicialQuadroModal}
        onSave={handleSalvarQuadroEDiretoria}
      />

      {/* Modal de Histórico de Balaústres Salvos */}
      <HistoricoBalaustresModal
        isOpen={modalHistoricoAberto}
        onClose={() => setModalHistoricoAberto(false)}
        lojaId={lojaIdAtiva}
        papelUsuario={sessaoLogada?.papel}
        onCarregarBalaustre={handleCarregarBalaustreDoHistorico}
        onNovoBalaustre={handleNovoBalaustre}
      />

      {/* Modal de Pré-visualização em Estilo Pergaminho / Timbrado Oficial */}
      <BalaustrePreviewModal
        isOpen={modalPreviewAberto}
        onClose={() => setModalPreviewAberto(false)}
        data={watch()}
        onExportTxt={handleExportarMinutaTxt}
      />
    </div>
  );
};

export default BalaustreForm;
