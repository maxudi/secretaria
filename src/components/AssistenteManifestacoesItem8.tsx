import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import {
  CARGOS_MACONICOS_ITEM8,
  carregarCategoriasItem8,
  carregarFrasesItem8,
  extrairCamposVariaveis,
  FraseManifestacao,
  salvarCategoriasItem8,
  salvarFrasesItem8,
} from '../data/frasesPadraoItem8';
import {
  BalaustreFormData,
  carregarIrmaosQuadroSalvos,
} from '../types/balaustre';
import {
  ehRitoBrasileiro,
  formatarAutorFalaComCargoOuLoja,
  formatarTroncoComExtenso,
  identificarCargoDoIrmaoNaSessao,
} from '../utils/liturgyFormatter';
import { GerenciadorFrasesModal } from './GerenciadorFrasesModal';
import { SeletorLojaVisitante } from './SeletorLojaVisitante';

interface AssistenteManifestacoesItem8Props {
  register: UseFormRegister<BalaustreFormData>;
  watch: UseFormWatch<BalaustreFormData>;
  setValue: UseFormSetValue<BalaustreFormData>;
  listaIrmaos?: string[];
}

export const AssistenteManifestacoesItem8: React.FC<
  AssistenteManifestacoesItem8Props
> = ({ register, watch, setValue, listaIrmaos }) => {
  const irmaosOpcoes = listaIrmaos || carregarIrmaosQuadroSalvos();
  // Banco de Frases e Categorias persistidos
  const [frases, setFrases] = useState<FraseManifestacao[]>(() =>
    carregarFrasesItem8()
  );
  const [categorias, setCategorias] = useState<string[]>(() =>
    carregarCategoriasItem8()
  );
  const [modalGerenciadorAberto, setModalGerenciadorAberto] = useState(false);

  // Filtros de Categoria, Cargo e Irmão
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState<string>('Todas');
  const [cargoFiltro, setCargoFiltro] = useState<string>('');
  const [irmaoAutorSelecionado, setIrmaoAutorSelecionado] =
    useState<string>('');
  const [irmaoAutorOutro, setIrmaoAutorOutro] = useState<string>('');
  const [lojaVisitanteAutor, setLojaVisitanteAutor] = useState<string>('');
  const [orienteVisitanteAutor, setOrienteVisitanteAutor] =
    useState<string>('');

  // Autocomplete "2. Buscar manifestação"
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [autocompleteAberto, setAutocompleteAberto] = useState<boolean>(false);
  const [indiceDestacado, setIndiceDestacado] = useState<number>(0);
  const buscaContainerRef = useRef<HTMLDivElement | null>(null);

  // Frase selecionada com variáveis pendentes de preenchimento
  const [fraseComVariaveis, setFraseComVariaveis] =
    useState<FraseManifestacao | null>(null);
  const [valoresVariaveis, setValoresVariaveis] = useState<
    Record<string, string>
  >({});

  // Campo 3: Fala personalizada rápida
  const [falaPersonalizada, setFalaPersonalizada] = useState<string>('');
  const [salvarPersonalizadaNoBanco, setSalvarPersonalizadaNoBanco] =
    useState<boolean>(false);
  const [tituloNovaPersonalizada, setTituloNovaPersonalizada] =
    useState<string>('');

  // Histórico para Desfazer (Undo) e feedback
  const [historicoTexto, setHistoricoTexto] = useState<string[]>([]);
  const [avisoInsercao, setAvisoInsercao] = useState<string | null>(null);
  const [avisoEncaminhamento, setAvisoEncaminhamento] = useState<string | null>(
    null
  );

  // Destino da fala: ordem dinâmica conforme o Rito (Sul -> Norte no Rito Brasileiro; Norte -> Sul nos demais Ritos)
  type DestinoColunaKey =
    | 'palavraBemDaOrdem.colunaSul'
    | 'palavraBemDaOrdem.colunaNorte'
    | 'palavraBemDaOrdem.colunaOriente'
    | 'palavraBemDaOrdem.colunaAltar';

  const ritoBrasileiroAtivo = ehRitoBrasileiro(
    watch('configuracaoLoja.ritoPotencia')
  );

  const [destinoColuna, setDestinoColuna] = useState<DestinoColunaKey>(
    ritoBrasileiroAtivo
      ? 'palavraBemDaOrdem.colunaSul'
      : 'palavraBemDaOrdem.colunaNorte'
  );

  const OPCOES_DESTINO_COLUNA: {
    key: DestinoColunaKey;
    label: string;
    botaoLabel: string;
  }[] = [
    ...(ritoBrasileiroAtivo
      ? ([
          {
            key: 'palavraBemDaOrdem.colunaSul',
            label: 'Coluna do Sul (1ª)',
            botaoLabel: '＋ Registrar Fala na Coluna do Sul',
          },
          {
            key: 'palavraBemDaOrdem.colunaNorte',
            label: 'Coluna do Norte (2ª)',
            botaoLabel: '＋ Registrar Fala na Coluna do Norte',
          },
        ] as const)
      : ([
          {
            key: 'palavraBemDaOrdem.colunaNorte',
            label: 'Coluna do Norte (1ª)',
            botaoLabel: '＋ Registrar Fala na Coluna do Norte',
          },
          {
            key: 'palavraBemDaOrdem.colunaSul',
            label: 'Coluna do Sul (2ª)',
            botaoLabel: '＋ Registrar Fala na Coluna do Sul',
          },
        ] as const)),
    {
      key: 'palavraBemDaOrdem.colunaOriente',
      label: 'Coluna do Oriente',
      botaoLabel: '＋ Registrar Fala na Coluna do Oriente',
    },
    {
      key: 'palavraBemDaOrdem.colunaAltar',
      label: 'Altar',
      botaoLabel: '＋ Registrar Fala no Altar',
    },
  ];

  // Rastreia o prefixo do Irmão atualmente reservado no início do texto consolidado
  const prefixoReservadoRef = useRef<string>('');

  const textoConsolidadoAtual =
    watch('palavraBemDaOrdem.textoConsolidadoAta') || '';

  // Valor do Tronco preenchido no Item 7 (em número + por extenso entre parênteses)
  const valorTroncoItem7 = formatarTroncoComExtenso(
    watch('troncoBeneficencia.valorApurado'),
    watch('troncoBeneficencia.valorPorExtenso')
  );

  // Substitui {VALOR_TRONCO} automaticamente pelo valor do campo próprio do Item 7
  const aplicarValorTronco = (texto: string): string => {
    return texto.replace(/\{VALOR_TRONCO\}/gi, valorTroncoItem7);
  };

  // Fecha o dropdown do autocomplete ao clicar fora
  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (
        buscaContainerRef.current &&
        !buscaContainerRef.current.contains(ev.target as Node)
      ) {
        setAutocompleteAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atualiza persistência das frases e categorias
  const atualizarFrasesBanco = (novas: FraseManifestacao[]) => {
    setFrases(novas);
    salvarFrasesItem8(novas);
  };

  const atualizarCategoriasBanco = (novas: string[]) => {
    setCategorias(novas);
    salvarCategoriasItem8(novas);
  };

  // Pílulas rápidas de categoria (com Chanceler e Tesoureiro em destaque)
  const pilulasCategorias = [
    { label: 'Todas', match: 'Todas' },
    { label: 'Chanceler', match: 'Chanceler' },
    { label: 'Tesoureiro', match: 'Tesoureiro' },
    { label: 'Saudações', match: 'Saudações e cumprimentos' },
    { label: 'TFA', match: 'Transmissão de TFA' },
    { label: 'Visitas', match: 'Irmãos visitantes' },
    { label: 'Convites', match: 'Convites para outras Lojas' },
    { label: 'Trabalho', match: 'Comentários sobre trabalhos apresentados' },
    { label: 'Manifestação (+)', match: 'Manifestações favoráveis' },
    {
      label: 'Manifestação (-)',
      match: 'Manifestações contrárias ou parcialmente contrárias',
    },
    { label: 'Ausências', match: 'Justificativas de ausências e atrasos' },
    { label: 'Agradecimentos', match: 'Agradecimentos e congratulações' },
    { label: 'Eventos', match: 'Comunicados e eventos' },
    { label: 'Solidariedade', match: 'Solidariedade e assuntos pessoais' },
    { label: 'Outros Oficiais', match: 'Outros Oficiais' },
    { label: 'Encerramento', match: 'Encerramento das manifestações' },
  ];

  // Filtragem e priorização inteligente para o Autocomplete
  const sugestoesFiltradas = useMemo(() => {
    const busca = termoBusca.trim().toLowerCase();

    const ativas = frases.filter((f) => f.ativo);

    const filtradas = ativas.filter((f) => {
      // Filtro de categoria
      if (
        categoriaSelecionada !== 'Todas' &&
        f.categoria !== categoriaSelecionada
      ) {
        return false;
      }

      // Filtro textual (título, palavraChave, categoria, cargo, conteúdo)
      if (busca.length > 0) {
        const bateTitulo = f.titulo.toLowerCase().includes(busca);
        const bateChave = f.palavraChave.toLowerCase().includes(busca);
        const bateCat = f.categoria.toLowerCase().includes(busca);
        const bateTexto = f.textoModelo.toLowerCase().includes(busca);
        const bateCargo = (f.cargo || '').toLowerCase().includes(busca);
        const bateIrmao = (f.irmaoId || '').toLowerCase().includes(busca);
        if (
          !bateTitulo &&
          !bateChave &&
          !bateCat &&
          !bateTexto &&
          !bateCargo &&
          !bateIrmao
        ) {
          return false;
        }
      }

      return true;
    });

    // Ordenação: prioriza frases recorrentes do Irmão selecionado ou do Cargo selecionado
    return [...filtradas].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (irmaoAutorSelecionado && irmaoAutorSelecionado !== 'outro') {
        if (a.irmaoId === irmaoAutorSelecionado) scoreA += 20;
        if (b.irmaoId === irmaoAutorSelecionado) scoreB += 20;
      }
      if (cargoFiltro && cargoFiltro !== 'SEM_CARGO') {
        if (a.cargo === cargoFiltro) scoreA += 10;
        if (b.cargo === cargoFiltro) scoreB += 10;
      }

      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.ordem - b.ordem;
    });
  }, [
    frases,
    categoriaSelecionada,
    termoBusca,
    cargoFiltro,
    irmaoAutorSelecionado,
  ]);

  const cargosSessao = watch('cargos');
  const cargoDetectadoAutor = identificarCargoDoIrmaoNaSessao(
    irmaoAutorSelecionado,
    cargosSessao
  );

  // Obtém o prefixo de identificação caso o usuário tenha selecionado um Irmão ou Cargo autor da fala:
  // Ex: "Ir∴ MAX FERREIRA DA SILVA (Tesoureiro): " ou "Ir∴ JOÃO (ARLS Fraternidade - Or∴ de Uberlândia-MG): "
  const obterPrefixoAutor = (): string => {
    if (irmaoAutorSelecionado) {
      const autorFormatado = formatarAutorFalaComCargoOuLoja(
        {
          irmaoSelecionado: irmaoAutorSelecionado,
          nomeOutro: irmaoAutorOutro,
          lojaVisitante: lojaVisitanteAutor,
          orienteVisitante: orienteVisitanteAutor,
          cargoIrmao: cargoFiltro,
        },
        cargosSessao
      );
      return autorFormatado ? `${autorFormatado}: ` : '';
    }

    if (cargoFiltro && cargoFiltro !== 'SEM_CARGO') {
      // Verifica quem ocupa esse cargo na sessão atual
      const mapaInverso: Record<string, keyof BalaustreFormData['cargos']> = {
        'Venerável Mestre': 'veneravelMestre',
        '1º Vigilante': 'primeiroVigilante',
        '2º Vigilante': 'segundoVigilante',
        Orador: 'orador',
        Secretário: 'secretario',
        Tesoureiro: 'tesoureiro',
        Chanceler: 'chanceler',
        'Mestre de Cerimônias': 'mestreCerimonias',
      };
      const chave = mapaInverso[cargoFiltro];
      const oficial = chave && cargosSessao ? cargosSessao[chave] : undefined;
      if (
        oficial &&
        oficial.irmaoSelecionado &&
        oficial.irmaoSelecionado !== 'nao_possui'
      ) {
        const autorFormatado = formatarAutorFalaComCargoOuLoja(
          {
            irmaoSelecionado: oficial.irmaoSelecionado,
            nomeOutro: oficial.nomeOutro,
            cargoIrmao: cargoFiltro,
          },
          cargosSessao
        );
        return `${autorFormatado}: `;
      }
      return `Ir∴ (${cargoFiltro}): `;
    }

    return '';
  };

  // reserva automaticamente o nome do Irmão apenas UMA vez no início do texto consolidado
  // quando o Irmão / Visitante / Cargo é selecionado ou alterado:
  useEffect(() => {
    const novoPrefixo = obterPrefixoAutor();
    const textoAtual = watch('palavraBemDaOrdem.textoConsolidadoAta') || '';
    const prefixoAnterior = prefixoReservadoRef.current;

    if (novoPrefixo) {
      if (!textoAtual.trim()) {
        // Campo estava vazio: já reserva o nome do Irmão no início
        setValue('palavraBemDaOrdem.textoConsolidadoAta', novoPrefixo, {
          shouldDirty: true,
        });
      } else if (prefixoAnterior && textoAtual.startsWith(prefixoAnterior)) {
        // Substitui apenas o cabeçalho reservado anterior (ex: mudou Loja ou Cargo) mantendo as frases já inseridas
        const corpoRestante = textoAtual.slice(prefixoAnterior.length).trimStart();
        const atualizado = corpoRestante
          ? `${novoPrefixo}${corpoRestante}`
          : novoPrefixo;
        setValue('palavraBemDaOrdem.textoConsolidadoAta', atualizado, {
          shouldDirty: true,
        });
      } else if (!textoAtual.startsWith(novoPrefixo)) {
        // Já havia frases sem o prefixo: coloca o nome do Irmão reservado no início
        setValue(
          'palavraBemDaOrdem.textoConsolidadoAta',
          `${novoPrefixo}${textoAtual.trimStart()}`,
          { shouldDirty: true }
        );
      }
      prefixoReservadoRef.current = novoPrefixo;
    } else if (prefixoAnterior && textoAtual.startsWith(prefixoAnterior)) {
      // Removeu a seleção de Irmão
      const semPrefixo = textoAtual.slice(prefixoAnterior.length).trimStart();
      setValue('palavraBemDaOrdem.textoConsolidadoAta', semPrefixo, {
        shouldDirty: true,
      });
      prefixoReservadoRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    irmaoAutorSelecionado,
    irmaoAutorOutro,
    lojaVisitanteAutor,
    orienteVisitanteAutor,
    cargoFiltro,
  ]);

  // Função central para anexar uma nova frase à fala do Irmão selecionado
  // (O nome do Irmão fica reservado apenas no início; daí em diante entram apenas as frases)
  const anexarAoTextoConsolidado = (novoTrecho: string) => {
    const trechoLimpo = novoTrecho.trim();
    if (!trechoLimpo) return;

    const atual = (
      watch('palavraBemDaOrdem.textoConsolidadoAta') || ''
    ).trim();

    // Evita inserção duplicada acidental imediata (pergunta se deseja repetir)
    if (atual.endsWith(trechoLimpo)) {
      const confirmarRepeticao = window.confirm(
        'Esta exata frase acabou de ser inserida no final do texto. Deseja inseri-la novamente?'
      );
      if (!confirmarRepeticao) return;
    }

    setHistoricoTexto((prev) => [...prev.slice(-19), atual]);

    const prefixo = obterPrefixoAutor();
    let novoConsolidado = '';

    if (!atual) {
      novoConsolidado = prefixo ? `${prefixo}${trechoLimpo}` : trechoLimpo;
    } else if (prefixo && atual === prefixo.trim()) {
      // Só tinha o nome do Irmão reservado no início: adiciona a primeira frase logo após os dois-pontos
      novoConsolidado = `${prefixo}${trechoLimpo}`;
    } else {
      // Já tem o nome do Irmão + frases anteriores: adiciona apenas a nova frase na sequência!
      novoConsolidado = `${atual} ${trechoLimpo}`;
    }

    if (prefixo) {
      prefixoReservadoRef.current = prefixo;
    }

    setValue('palavraBemDaOrdem.textoConsolidadoAta', novoConsolidado, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setAvisoInsercao('✓ Frase adicionada à fala do Irmão!');
    setTimeout(() => setAvisoInsercao(null), 3000);
  };

  // Selecionar uma sugestão do Autocomplete
  const handleSelecionarSugestao = (frase: FraseManifestacao) => {
    const textoComTronco = aplicarValorTronco(frase.textoModelo);
    const vars = extrairCamposVariaveis(textoComTronco);

    setAutocompleteAberto(false);

    if (vars.length > 0) {
      const inicial: Record<string, string> = {};
      vars.forEach((v) => {
        inicial[v] = '';
      });
      setFraseComVariaveis({
        ...frase,
        textoModelo: textoComTronco,
        camposVariaveis: vars,
      });
      setValoresVariaveis(inicial);
      return;
    }

    anexarAoTextoConsolidado(textoComTronco);
  };

  const handleConfirmarFraseComVariaveis = () => {
    if (!fraseComVariaveis) return;
    let texto = aplicarValorTronco(fraseComVariaveis.textoModelo);
    (fraseComVariaveis.camposVariaveis || []).forEach((v) => {
      const valorPreenchido = valoresVariaveis[v]?.trim() || `[${v}]`;
      texto = texto.replace(new RegExp(`\\{${v}\\}`, 'gi'), valorPreenchido);
    });

    anexarAoTextoConsolidado(texto);
    setFraseComVariaveis(null);
    setValoresVariaveis({});
  };

  // Navegação por teclado no campo de busca
  const handleKeyDownBusca = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!autocompleteAberto) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setAutocompleteAberto(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceDestacado((prev) =>
        sugestoesFiltradas.length > 0
          ? (prev + 1) % sugestoesFiltradas.length
          : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceDestacado((prev) =>
        sugestoesFiltradas.length > 0
          ? (prev - 1 + sugestoesFiltradas.length) % sugestoesFiltradas.length
          : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = sugestoesFiltradas[indiceDestacado];
      if (item) {
        handleSelecionarSugestao(item);
      }
    } else if (e.key === 'Escape') {
      setAutocompleteAberto(false);
    }
  };

  // Adicionar fala personalizada (item 3)
  const handleAdicionarFalaPersonalizada = () => {
    const limpa = falaPersonalizada.trim();
    if (!limpa) return;

    const comTronco = aplicarValorTronco(limpa);
    anexarAoTextoConsolidado(comTronco);

    // Se marcou para salvar como frase recorrente no banco
    if (salvarPersonalizadaNoBanco) {
      const nova: FraseManifestacao = {
        id: `frase-custom-${Date.now()}`,
        titulo:
          tituloNovaPersonalizada.trim() ||
          limpa.slice(0, 42) + (limpa.length > 42 ? '...' : ''),
        palavraChave: tituloNovaPersonalizada.trim() || 'personalizada',
        categoria:
          categoriaSelecionada === 'Todas'
            ? 'Considerações pessoais'
            : categoriaSelecionada,
        cargo: cargoFiltro || undefined,
        irmaoId:
          irmaoAutorSelecionado && irmaoAutorSelecionado !== 'outro'
            ? irmaoAutorSelecionado
            : undefined,
        textoModelo: limpa,
        camposVariaveis: extrairCamposVariaveis(limpa),
        ativo: true,
        ordem: frases.length + 1,
        personalizavel: true,
      };
      atualizarFrasesBanco([nova, ...frases]);
      setSalvarPersonalizadaNoBanco(false);
      setTituloNovaPersonalizada('');
    }

    setFalaPersonalizada('');
  };

  // Desfazer última alteração
  const handleDesfazer = () => {
    if (historicoTexto.length === 0) return;
    const anterior = historicoTexto[historicoTexto.length - 1];
    setHistoricoTexto((prev) => prev.slice(0, -1));
    setValue('palavraBemDaOrdem.textoConsolidadoAta', anterior, {
      shouldDirty: true,
    });
  };

  // Limpar com confirmação
  const handleLimparTextoConsolidado = () => {
    if (!textoConsolidadoAtual.trim()) return;
    if (
      window.confirm(
        'Tem certeza que deseja limpar o texto atual desta manifestação?'
      )
    ) {
      setHistoricoTexto((prev) => [...prev, textoConsolidadoAtual]);
      prefixoReservadoRef.current = '';
      setValue('palavraBemDaOrdem.textoConsolidadoAta', '', {
        shouldDirty: true,
      });
    }
  };

  // Encaminhar a fala consolidada diretamente para a Coluna / Altar selecionado
  const handleEncaminharParaColuna = () => {
    const textoBruto = (
      watch('palavraBemDaOrdem.textoConsolidadoAta') || ''
    ).trim();
    if (!textoBruto) {
      window.alert(
        'Selecione ou digite ao menos uma frase para encaminhar à Coluna/Altar.'
      );
      return;
    }

    const prefixo = obterPrefixoAutor().trim();
    let corpoFala = textoBruto;
    if (prefixo && corpoFala.startsWith(prefixo)) {
      corpoFala = corpoFala.slice(prefixo.length).trim();
    }

    if (!corpoFala) {
      window.alert(
        'Adicione ao menos uma frase ou manifestação para o Irmão selecionado antes de encaminhar.'
      );
      return;
    }

    // Determina os dados do Irmão que serão gravados na Coluna/Altar escolhida
    let irmaoFinal = irmaoAutorSelecionado;
    let nomeOutroFinal = irmaoAutorOutro;

    if (!irmaoFinal && cargoFiltro && cargoFiltro !== 'SEM_CARGO') {
      const mapaInverso: Record<string, keyof BalaustreFormData['cargos']> = {
        'Venerável Mestre': 'veneravelMestre',
        '1º Vigilante': 'primeiroVigilante',
        '2º Vigilante': 'segundoVigilante',
        Orador: 'orador',
        Secretário: 'secretario',
        Tesoureiro: 'tesoureiro',
        Chanceler: 'chanceler',
        'Mestre de Cerimônias': 'mestreCerimonias',
      };
      const chave = mapaInverso[cargoFiltro];
      const oficial = chave && cargosSessao ? cargosSessao[chave] : undefined;
      if (oficial?.irmaoSelecionado) {
        irmaoFinal = oficial.irmaoSelecionado;
        nomeOutroFinal = oficial.nomeOutro || '';
      }
    }

    if (!irmaoFinal) {
      window.alert(
        'Por favor, selecione o Irmão que fez uso da palavra (no topo do Assistente) antes de encaminhar a fala para a Coluna/Altar.'
      );
      return;
    }

    const listaAtual = watch(destinoColuna) || [];
    const novaFalaItem = {
      irmaoSelecionado: irmaoFinal,
      nomeOutro: nomeOutroFinal,
      lojaVisitante: lojaVisitanteAutor,
      orienteVisitante: orienteVisitanteAutor,
      cargoIrmao: cargoFiltro,
      resumoFala: corpoFala,
    };

    setValue(destinoColuna, [...listaAtual, novaFalaItem], {
      shouldDirty: true,
      shouldValidate: true,
    });

    const destinoInfo = OPCOES_DESTINO_COLUNA.find(
      (d) => d.key === destinoColuna
    );
    const nomeDestino = destinoInfo?.label || 'Coluna';

    // Limpa o rascunho atual para que o Secretário já possa selecionar o próximo Irmão
    prefixoReservadoRef.current = '';
    setHistoricoTexto([]);
    setValue('palavraBemDaOrdem.textoConsolidadoAta', '', {
      shouldDirty: true,
    });
    setIrmaoAutorSelecionado('');
    setIrmaoAutorOutro('');
    setLojaVisitanteAutor('');
    setOrienteVisitanteAutor('');
    setCargoFiltro('');

    setAvisoEncaminhamento(
      `✓ Fala encaminhada e registrada em "${nomeDestino}"! Você já pode selecionar o próximo Irmão.`
    );
    setTimeout(() => setAvisoEncaminhamento(null), 5000);
  };

  return (
    <div className="rounded-2xl border-2 border-[#D4AF37]/70 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-md space-y-6">
      {/* Cabeçalho do Módulo Inteligente do Item 8 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4AF37]/40 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a365d]/10 dark:bg-amber-950/50 px-3 py-0.5 text-[11px] font-bold text-[#1a365d] dark:text-[#D4AF37] mb-1">
            ∴ Assistente Inteligente de Redação — Item 8
          </span>
          <h3 className="text-base sm:text-lg font-bold text-[#0B192C] dark:text-white">
            Seleção Rápida de Falas Padronizadas (Chanceler, Tesoureiro e
            Irmãos)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Experimente buscar uma fala, selecioná-la e editar o texto final. O
            valor do Tronco ({valorTroncoItem7}) já é puxado automaticamente do
            Item 7 nas frases do Tesoureiro!
          </p>
        </div>

        {/* BOTÃO DESTACADO PARA CRIAR NOVAS FRASES OU EXCLUIR EXISTENTES */}
        <button
          type="button"
          onClick={() => setModalGerenciadorAberto(true)}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-[#D4AF37] bg-[#0B192C] px-4 py-2.5 text-xs font-bold text-[#D4AF37] shadow hover:bg-[#1a365d] transition-colors"
        >
          <span>📚</span> Criar Novas Frases / Excluir Existentes (
          {frases.length})
        </button>
      </div>

      {/* BARRA OPCIONAL: IDENTIFICAR CARGO OU IRMÃO QUE FEZ USO DA PALAVRA */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F9F8F6] dark:bg-slate-800/60 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Irmão que fez uso da palavra (Detecta Cargo automaticamente):
            </label>
            <select
              value={irmaoAutorSelecionado}
              onChange={(e) => setIrmaoAutorSelecionado(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium"
            >
              <option value="">
                -- Nenhum Irmão selecionado (Inserir frase avulsa) --
              </option>
              {irmaosOpcoes.map((ir) => (
                <option key={ir} value={ir}>
                  {ir}
                </option>
              ))}
              <option value="outro">
                -- Outro (Irmão Visitante — Informar Loja e Oriente...) --
              </option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Cargo do Irmão (Detectado da Sessão ou Selecionável):
            </label>
            <select
              value={cargoFiltro}
              onChange={(e) => setCargoFiltro(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            >
              <option value="">
                {cargoDetectadoAutor
                  ? `Automático da Sessão: (${cargoDetectadoAutor})`
                  : '-- Sem cargo específico (ou selecione um cargo) --'}
              </option>
              <option value="SEM_CARGO">
                🚫 Sem cargo (Exibir apenas o nome do Irmão)
              </option>
              {CARGOS_MACONICOS_ITEM8.map((cg) => (
                <option key={cg} value={cg}>
                  {cg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro em cascata UF -> Oriente -> Loja + Cadastro de Nova Loja quando "-- Outro (Irmão Visitante) --" é selecionado */}
        {irmaoAutorSelecionado === 'outro' && (
          <SeletorLojaVisitante
            nomeVisitante={irmaoAutorOutro}
            onChangeNomeVisitante={setIrmaoAutorOutro}
            lojaSelecionada={lojaVisitanteAutor}
            onChangeLoja={setLojaVisitanteAutor}
            orienteSelecionado={orienteVisitanteAutor}
            onChangeOriente={setOrienteVisitanteAutor}
          />
        )}

        {/* Prévia de como o Irmão será identificado antes da fala */}
        {obterPrefixoAutor() && (
          <div className="text-xs text-slate-600 dark:text-slate-300 pt-1">
            Prefixo automático na fala:{' '}
            <strong className="text-[#1a365d] dark:text-[#D4AF37]">
              {obterPrefixoAutor()}
            </strong>
          </div>
        )}
      </div>

      {/* ====================================================================
          1. CATEGORIA (PÍLULAS DE FILTRO COM CHANCELER E TESOUREIRO)
         ==================================================================== */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-sm font-bold text-slate-800 dark:text-slate-100">
            1. Categoria
          </label>
          <select
            value={categoriaSelecionada}
            onChange={(e) => {
              setCategoriaSelecionada(e.target.value);
              setAutocompleteAberto(true);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200"
          >
            <option value="Todas">
              Todas as Categorias ({categorias.length})
            </option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {pilulasCategorias.map((pilula) => {
            const ativa = categoriaSelecionada === pilula.match;
            return (
              <button
                key={pilula.label}
                type="button"
                onClick={() => {
                  setCategoriaSelecionada(pilula.match);
                  setAutocompleteAberto(true);
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all border ${
                  ativa
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-[#D4AF37] dark:bg-[#D4AF37] dark:text-[#0B192C] shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                {pilula.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          2. BUSCAR MANIFESTAÇÃO (AUTOCOMPLETE INTELIGENTE)
         ==================================================================== */}
      <div ref={buscaContainerRef} className="relative">
        <label
          htmlFor="inputBuscarManifestacao"
          className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-2"
        >
          2. Buscar manifestação
        </label>

        <div className="relative">
          <input
            id="inputBuscarManifestacao"
            type="text"
            value={termoBusca}
            onFocus={() => setAutocompleteAberto(true)}
            onChange={(e) => {
              setTermoBusca(e.target.value);
              setAutocompleteAberto(true);
              setIndiceDestacado(0);
            }}
            onKeyDown={handleKeyDownBusca}
            placeholder="Ex.: Chanceler, Tesoureiro, TFA, elogio, ausência, convite..."
            className="w-full rounded-full border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-5 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#1a365d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a365d]/15"
          />
          {termoBusca && (
            <button
              type="button"
              onClick={() => {
                setTermoBusca('');
                setIndiceDestacado(0);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Lista de Sugestões do Autocomplete */}
        {autocompleteAberto && (
          <div className="absolute z-30 mt-2 w-full max-h-72 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-xl">
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-500 border-b border-slate-100 dark:border-slate-700">
              <span>
                {sugestoesFiltradas.length} sugestão(ões) em "{categoriaSelecionada}" — clique para adicionar ao texto
              </span>
              <button
                type="button"
                onClick={() => setAutocompleteAberto(false)}
                className="font-semibold hover:text-slate-800"
              >
                Fechar ✕
              </button>
            </div>

            {sugestoesFiltradas.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Nenhuma frase encontrada para "{termoBusca}". Você pode
                digitá-la abaixo em "Adicionar uma fala personalizada" ou clicar
                em "Criar Novas Frases".
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {sugestoesFiltradas.map((sug, idx) => {
                  const destacado = idx === indiceDestacado;
                  return (
                    <li key={sug.id}>
                      <button
                        type="button"
                        onClick={() => handleSelecionarSugestao(sug)}
                        onMouseEnter={() => setIndiceDestacado(idx)}
                        className={`w-full rounded-xl px-3.5 py-2.5 text-left transition-colors ${
                          destacado
                            ? 'bg-[#1a365d]/10 dark:bg-slate-700'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
                          <span className="text-xs font-bold text-[#1a365d] dark:text-[#D4AF37]">
                            {sug.titulo}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {sug.cargo && (
                              <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
                                {sug.cargo}
                              </span>
                            )}
                            {sug.irmaoId && (
                              <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-bold">
                                {sug.irmaoId}
                              </span>
                            )}
                            <span className="rounded-full bg-slate-100 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                              {sug.categoria}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {aplicarValorTronco(sug.textoModelo)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* BARRA DE PREENCHIMENTO RÁPIDO DE VARIÁVEIS (QUANDO A FRASE POSSUI {LOJA}, {IRMAO}, {DATA}, ETC.) */}
      {fraseComVariaveis && (
        <div className="rounded-xl border-2 border-[#D4AF37] bg-amber-50/60 dark:bg-slate-800 p-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37]">
              Personalizar Campos da Frase: "{fraseComVariaveis.titulo}"
            </h4>
            <button
              type="button"
              onClick={() => setFraseComVariaveis(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancelar ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(fraseComVariaveis.camposVariaveis || []).map((variavel) => (
              <div key={variavel}>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Informe {variavel}:
                </label>
                {variavel === 'IRMAO' ? (
                  <div className="space-y-1.5">
                    <select
                      value={valoresVariaveis[variavel] || ''}
                      onChange={(e) =>
                        setValoresVariaveis((p) => ({
                          ...p,
                          [variavel]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                    >
                      <option value="">
                        -- Selecione do Quadro ou digite abaixo --
                      </option>
                      {irmaosOpcoes.map((ir) => (
                        <option key={ir} value={ir}>
                          {ir}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={valoresVariaveis[variavel] || ''}
                      onChange={(e) =>
                        setValoresVariaveis((p) => ({
                          ...p,
                          [variavel]: e.target.value,
                        }))
                      }
                      placeholder="Ou digite o nome do Irmão..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={valoresVariaveis[variavel] || ''}
                    onChange={(e) =>
                      setValoresVariaveis((p) => ({
                        ...p,
                        [variavel]: e.target.value,
                      }))
                    }
                    placeholder={`Preencher {${variavel}}...`}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleConfirmarFraseComVariaveis}
              className="rounded-lg bg-[#1a365d] px-4 py-2 text-xs font-bold text-white hover:bg-[#0B192C]"
            >
              ＋ Inserir Frase Preenchida na Ata
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          3. ADICIONAR UMA FALA PERSONALIZADA (OPCIONAL)
         ==================================================================== */}
      <div className="space-y-2.5">
        <label
          htmlFor="inputFalaPersonalizada"
          className="block text-sm font-bold text-slate-800 dark:text-slate-100"
        >
          3. Adicionar uma fala personalizada (opcional)
        </label>

        <input
          id="inputFalaPersonalizada"
          type="text"
          value={falaPersonalizada}
          onChange={(e) => setFalaPersonalizada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdicionarFalaPersonalizada();
            }
          }}
          placeholder="Digite uma nova manifestação..."
          className="w-full rounded-full border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-800 px-5 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#1a365d] focus:bg-white focus:outline-none"
        />

        {/* Opção de salvar também no banco de frases recorrentes */}
        {falaPersonalizada.trim().length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-2 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={salvarPersonalizadaNoBanco}
                onChange={(e) =>
                  setSalvarPersonalizadaNoBanco(e.target.checked)
                }
                className="rounded border-slate-300"
              />
              <span>
                Salvar também esta frase no Banco de Frases para reutilizar em
                sessões futuras
              </span>
            </label>

            {salvarPersonalizadaNoBanco && (
              <input
                type="text"
                value={tituloNovaPersonalizada}
                onChange={(e) => setTituloNovaPersonalizada(e.target.value)}
                placeholder="Título curto para buscar depois (ex: Saudação de Aniversário da Loja)"
                className="flex-1 min-w-[220px] rounded-lg border border-[#D4AF37] bg-white px-3 py-1 text-xs"
              />
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleAdicionarFalaPersonalizada}
          className="w-full rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-base">＋</span> Adicionar ao texto
        </button>
      </div>

      {/* ====================================================================
          4. TEXTO CONSOLIDADO PARA A ATA ("Texto das manifestações para a ata")
         ==================================================================== */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="textareaConsolidadoAta"
            className="text-sm font-bold text-slate-800 dark:text-slate-100"
          >
            4. Texto consolidado para a ata
          </label>

          <div className="flex items-center gap-3">
            {avisoInsercao && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {avisoInsercao}
              </span>
            )}
            {historicoTexto.length > 0 && (
              <button
                type="button"
                onClick={handleDesfazer}
                className="text-xs font-semibold text-[#1a365d] dark:text-[#D4AF37] underline"
              >
                ↺ Desfazer última inserção
              </button>
            )}
            <span className="text-xs text-slate-500">
              {textoConsolidadoAtual.length} caracteres
            </span>
          </div>
        </div>

        <textarea
          id="textareaConsolidadoAta"
          rows={6}
          {...register('palavraBemDaOrdem.textoConsolidadoAta')}
          placeholder="Selecione o Irmão acima (o nome dele ficará reservado no início) e vá clicando nas frases para compor toda a fala dele..."
          className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-[#F9F8F6] dark:bg-slate-950 p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#1a365d] focus:bg-white focus:outline-none"
        />

        {avisoEncaminhamento && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            {avisoEncaminhamento}
          </div>
        )}

        {/* Barra Inferior: Selecionar Coluna/Altar de destino + Botão Registrar Fala na Coluna + Limpar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2">
          <div className="md:w-64">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1a365d] dark:text-[#D4AF37] mb-1">
              Encaminhar fala para:
            </label>
            <select
              value={destinoColuna}
              onChange={(e) =>
                setDestinoColuna(e.target.value as DestinoColunaKey)
              }
              className="w-full rounded-xl border-2 border-[#1a365d] dark:border-[#D4AF37] bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-[#1a365d] dark:text-white focus:outline-none"
            >
              {OPCOES_DESTINO_COLUNA.map((op) => (
                <option key={op.key} value={op.key}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 md:pt-5">
            <button
              type="button"
              onClick={handleEncaminharParaColuna}
              className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#0B192C] py-3 px-5 text-sm font-bold text-white shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>📥</span>
              {OPCOES_DESTINO_COLUNA.find((o) => o.key === destinoColuna)
                ?.botaoLabel || '＋ Registrar Fala na Coluna'}
            </button>

            <button
              type="button"
              onClick={handleLimparTextoConsolidado}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 hover:text-red-600 py-3 px-5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center gap-2"
            >
              <span>🗑</span> Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Modal Gerenciador de Frases (Criar / Editar / Excluir) */}
      <GerenciadorFrasesModal
        isOpen={modalGerenciadorAberto}
        onClose={() => setModalGerenciadorAberto(false)}
        frases={frases}
        categorias={categorias}
        onUpdateFrases={atualizarFrasesBanco}
        onUpdateCategorias={atualizarCategoriasBanco}
      />
    </div>
  );
};
