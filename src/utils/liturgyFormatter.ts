import {
  BalaustreFormData,
  carregarDiretoriaTitularSalva,
  CenarioEscrutinioOrdemDia,
  DEFAULT_CONFIGURACAO_LOJA,
  DestinoOficioPrancha,
  DiretoriaTitularMap,
  FalaColunaItem,
  GrauTrabalhos,
  OficialCargoData,
  OrdemDiaItem,
  OrigemOficioPrancha,
  ResultadoVotacaoOrdemDia,
  StatusAprovacaoBalaustre,
  SubtipoConviteExpediente,
  TEXTOS_MANIFESTACAO_ORDEM_DIA,
  TEXTOS_VOTACAO_ORDEM_DIA,
  TipoExpedienteRecebido,
  TipoItemOrdemDia,
  TipoManifestacaoOrdemDia,
  TipoSessao,
} from '../types/balaustre';

export const VALOR_CARGO_NAO_POSSUI = 'nao_possui';

export function ehCargoSuprimido(selecionado?: string): boolean {
  const val = (selecionado || '').trim().toLowerCase();
  return !val || val === VALOR_CARGO_NAO_POSSUI;
}

/**
 * Verifica se o Rito configurado na Loja é o Rito Brasileiro.
 * - Rito Brasileiro: a palavra nas Colunas inicia na Coluna do Sul e depois passa à Coluna do Norte.
 * - Demais Ritos (REAA, RER, Moderno, Adonhiramita, York, Schröder, etc.): inicia na Coluna do Norte e depois passa à Coluna do Sul.
 */
export function ehRitoBrasileiro(ritoPotencia?: string): boolean {
  const rito = (
    ritoPotencia ??
    DEFAULT_CONFIGURACAO_LOJA.ritoPotencia ??
    ''
  ).trim();
  if (!rito) return true;
  return /brasileir/i.test(rito);
}

export const MAPA_CARGOS_DIRETORIA: {
  chave: keyof BalaustreFormData['cargos'];
  label: string;
}[] = [
  { chave: 'veneravelMestre', label: 'Venerável Mestre' },
  { chave: 'primeiroVigilante', label: '1º Vigilante' },
  { chave: 'segundoVigilante', label: '2º Vigilante' },
  { chave: 'orador', label: 'Orador' },
  { chave: 'secretario', label: 'Secretário' },
  { chave: 'tesoureiro', label: 'Tesoureiro' },
  { chave: 'chanceler', label: 'Chanceler' },
  { chave: 'mestreCerimonias', label: 'Mestre de Cerimônias' },
];

/**
 * Normaliza o tratamento maçônico "Ir∴ " antes do nome caso tenha sido digitado manualmente.
 */
export function formatarNomeIrmao(
  selecionado?: string,
  nomeOutro?: string
): string {
  if (ehCargoSuprimido(selecionado)) return '';
  if (selecionado === 'outro') {
    const limpo = (nomeOutro || '').trim().replace(/^Ir∴\s*/i, '');
    return limpo ? `Ir∴ ${limpo.toUpperCase()}` : 'Ir∴ (Não informado)';
  }
  return selecionado || '';
}

/**
 * Verifica se o Irmão que exerce uma função/cargo na sessão é substituto
 * (não faz parte da Diretoria Titular cadastrada para aquela função ou está marcado com `isTitular = false`).
 */
export function verificarCargoSubstituto(
  nomeIrmao?: string,
  cargoOuChave?: string,
  cargosSessao?: BalaustreFormData['cargos'],
  diretoriaTitularParam?: DiretoriaTitularMap
): boolean {
  if (!cargoOuChave) return false;
  if (/\b(substituto|ad-hoc)\b/i.test(cargoOuChave)) return true;

  const cargoBase = cargoOuChave
    .replace(/\s*\(?\s*(substituto|ad-hoc)\s*\)?\s*/gi, '')
    .trim();

  const item = MAPA_CARGOS_DIRETORIA.find(
    (m) =>
      m.chave.toLowerCase() === cargoBase.toLowerCase() ||
      m.label.toLowerCase() === cargoBase.toLowerCase()
  );

  if (!item) return false;

  const oficialSessao = cargosSessao?.[item.chave];
  if (oficialSessao && ehCargoSuprimido(oficialSessao.irmaoSelecionado)) {
    return false;
  }
  if (oficialSessao && oficialSessao.isTitular === false) {
    const nomeNoCargo = formatarNomeIrmao(
      oficialSessao.irmaoSelecionado,
      oficialSessao.nomeOutro
    );
    if (
      !nomeIrmao ||
      !nomeNoCargo ||
      nomeNoCargo.trim().toUpperCase() === nomeIrmao.trim().toUpperCase()
    ) {
      return true;
    }
  }

  const diretoria = diretoriaTitularParam || carregarDiretoriaTitularSalva();
  const titularDaFuncao = (diretoria?.[item.chave] || '').trim();
  if (ehCargoSuprimido(titularDaFuncao)) {
    return false;
  }
  const nomeConferencia = (
    nomeIrmao ||
    (oficialSessao
      ? formatarNomeIrmao(
          oficialSessao.irmaoSelecionado,
          oficialSessao.nomeOutro
        )
      : '')
  ).trim();

  if (
    titularDaFuncao &&
    nomeConferencia &&
    titularDaFuncao.toUpperCase() !== nomeConferencia.toUpperCase()
  ) {
    return true;
  }

  return false;
}

/**
 * Formata o rótulo da função acrescentando "substituto" quando o Irmão não for o titular da função:
 * Ex: "Orador substituto", "1º Vigilante substituto", "2º Vigilante substituto"
 */
export function formatarRotuloCargoComSubstituto(
  nomeIrmao?: string,
  cargoLabel?: string,
  cargosSessao?: BalaustreFormData['cargos'],
  diretoriaTitularParam?: DiretoriaTitularMap
): string {
  const limpo = (cargoLabel || '')
    .replace(/\s*\(?\s*(substituto|ad-hoc)\s*\)?\s*/gi, '')
    .trim();
  if (!limpo || limpo === 'SEM_CARGO') return '';

  const ehSubstituto = verificarCargoSubstituto(
    nomeIrmao,
    cargoLabel,
    cargosSessao,
    diretoriaTitularParam
  );

  return ehSubstituto ? `${limpo} substituto` : limpo;
}

/**
 * Verifica se o Irmão selecionado ocupa algum cargo oficial na sessão atual
 * e retorna o nome do cargo (acrescentando "substituto" caso não seja o titular da função).
 */
export function identificarCargoDoIrmaoNaSessao(
  nomeIrmao?: string,
  cargos?: BalaustreFormData['cargos']
): string {
  if (
    !nomeIrmao ||
    nomeIrmao === 'outro' ||
    ehCargoSuprimido(nomeIrmao) ||
    !cargos
  ) {
    return '';
  }

  const diretoria = carregarDiretoriaTitularSalva();

  for (const item of MAPA_CARGOS_DIRETORIA) {
    const oficial = cargos[item.chave];
    if (
      oficial &&
      !ehCargoSuprimido(oficial.irmaoSelecionado) &&
      oficial.irmaoSelecionado === nomeIrmao
    ) {
      return formatarRotuloCargoComSubstituto(
        nomeIrmao,
        item.label,
        cargos,
        diretoria
      );
    }
  }

  return '';
}

/**
 * Retorna apenas os cargos da Diretoria que possuem Irmão designado na sessão
 * (omitindo cargos marcados como "Não possui no Rito / Suprimir do Balaústre").
 */
export function obterCargosAtivosNaSessao(
  cargos: BalaustreFormData['cargos'],
  diretoriaTitularParam?: DiretoriaTitularMap
): {
  chave: keyof BalaustreFormData['cargos'];
  label: string;
  rotuloComSubstituto: string;
  nomeFormatado: string;
  ehVeneravel: boolean;
}[] {
  const resultado: {
    chave: keyof BalaustreFormData['cargos'];
    label: string;
    rotuloComSubstituto: string;
    nomeFormatado: string;
    ehVeneravel: boolean;
  }[] = [];

  for (const item of MAPA_CARGOS_DIRETORIA) {
    const oficial = cargos?.[item.chave];
    if (!oficial || ehCargoSuprimido(oficial.irmaoSelecionado)) {
      continue;
    }
    const nomeFormatado = formatarNomeIrmao(
      oficial.irmaoSelecionado,
      oficial.nomeOutro
    );
    if (!nomeFormatado) continue;

    const rotuloComSubstituto = formatarRotuloCargoComSubstituto(
      nomeFormatado,
      item.label,
      cargos,
      diretoriaTitularParam
    );

    resultado.push({
      chave: item.chave,
      label: item.label,
      rotuloComSubstituto,
      nomeFormatado,
      ehVeneravel: item.chave === 'veneravelMestre',
    });
  }

  return resultado;
}

/**
 * Formata a identificação do Irmão que fez uso da palavra:
 * - Se for Visitante ("outro"): "Ir∴ FULANO (ARLS Loja - Or∴ de Cidade)"
 * - Se for Irmão do Quadro em cargo titular: "Ir∴ FULANO (Tesoureiro)"
 * - Se for Irmão do Quadro exercendo cargo em substituição: "Ir∴ FULANO (Orador substituto)"
 * - Se for Irmão do Quadro sem cargo: "Ir∴ FULANO"
 */
export function formatarAutorFalaComCargoOuLoja(
  fala: Pick<
    FalaColunaItem,
    | 'irmaoSelecionado'
    | 'nomeOutro'
    | 'lojaVisitante'
    | 'orienteVisitante'
    | 'cargoIrmao'
  >,
  cargosSessao?: BalaustreFormData['cargos']
): string {
  const nomeBase = formatarNomeIrmao(fala.irmaoSelecionado, fala.nomeOutro);
  if (!nomeBase) return '';

  if (fala.irmaoSelecionado === 'outro') {
    const lojaRaw = fala.lojaVisitante?.trim() || '';
    const loja = lojaRaw
      ? /^ARLS\b/i.test(lojaRaw)
        ? lojaRaw.replace(/^ARLS\s*/i, 'A∴R∴L∴S∴ ')
        : lojaRaw
      : '';
    const oriente = fala.orienteVisitante?.trim() || '';
    if (loja && oriente) {
      return `${nomeBase} (${loja} - Or∴ de ${oriente})`;
    }
    if (loja) {
      return `${nomeBase} (${loja})`;
    }
    if (oriente) {
      return `${nomeBase} (Or∴ de ${oriente})`;
    }
    return nomeBase;
  }

  const cargoExplicito = fala.cargoIrmao?.trim() || '';
  const cargoIgnorado =
    cargoExplicito === 'SEM_CARGO' ||
    /^(hospitaleiro|cobridor\s*interno)/i.test(cargoExplicito);

  const cargoBruto = cargoIgnorado
    ? ''
    : cargoExplicito ||
      identificarCargoDoIrmaoNaSessao(fala.irmaoSelecionado, cargosSessao);

  const cargoFinal = cargoBruto
    ? formatarRotuloCargoComSubstituto(nomeBase, cargoBruto, cargosSessao)
    : '';

  if (cargoFinal) {
    return `${nomeBase} (${cargoFinal})`;
  }

  return nomeBase;
}

/**
 * Formata um oficial com indicação se é Titular ou Substituto / Ad-hoc
 */
export function formatarCargoLiturgico(
  tituloCargo: string,
  oficial: OficialCargoData
): string {
  const nome = formatarNomeIrmao(oficial.irmaoSelecionado, oficial.nomeOutro);
  const sufixo = oficial.isTitular ? '' : ' (Ad-hoc / Substituto)';
  return `${tituloCargo}${sufixo}: ${nome}`;
}

/**
 * Converte data YYYY-MM-DD para o formato litúrgico por extenso:
 * "Aos vinte e um dias do mês de outubro do ano de 2026 da E∴ V∴"
 */
export function dataPorExtensoLiturgica(dataStr: string): string {
  if (!dataStr) return '';

  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  const diasExtenso: Record<number, string> = {
    1: 'primeiro',
    2: 'dois',
    3: 'três',
    4: 'quatro',
    5: 'cinco',
    6: 'seis',
    7: 'sete',
    8: 'oito',
    9: 'nove',
    10: 'dez',
    11: 'onze',
    12: 'doze',
    13: 'treze',
    14: 'quatorze',
    15: 'quinze',
    16: 'dezesseis',
    17: 'dezessete',
    18: 'dezoito',
    19: 'dezenove',
    20: 'vinte',
    21: 'vinte e um',
    22: 'vinte e dois',
    23: 'vinte e três',
    24: 'vinte e quatro',
    25: 'vinte e cinco',
    26: 'vinte e seis',
    27: 'vinte e sete',
    28: 'vinte e oito',
    29: 'vinte e nove',
    30: 'trinta',
    31: 'trinta e um',
  };

  const partes = dataStr.split('-');
  if (partes.length !== 3) return dataStr;

  const ano = partes[0];
  const mesIndex = parseInt(partes[1], 10) - 1;
  const diaNum = parseInt(partes[2], 10);

  const mesNome = meses[mesIndex] || '';
  const diaTexto = diasExtenso[diaNum] || String(diaNum);

  if (diaNum === 1) {
    return `Ao primeiro dia do mês de ${mesNome} do ano de ${ano} da E∴ V∴`;
  }

  return `Aos ${diaTexto} dias do mês de ${mesNome} do ano de ${ano} da E∴ V∴`;
}

export function obterDescricaoGrau(grau?: GrauTrabalhos | string): string {
  const mapa: Record<GrauTrabalhos, string> = {
    aprendiz: 'GRAU 1 – APRENDIZ MAÇOM',
    companheiro: 'GRAU 2 – COMPANHEIRO MAÇOM',
    mestre: 'GRAU 3 – MESTRE MAÇOM',
  };
  return (grau && mapa[grau as GrauTrabalhos]) || '[GRAU NÃO SELECIONADO]';
}

export function obterDescricaoTipoSessao(tipo?: TipoSessao | string): string {
  const mapa: Record<TipoSessao, string> = {
    ordinaria: 'Sessão Ordinária',
    magna_iniciacao: 'Sessão Magna de Iniciação',
    magna_elevacao: 'Sessão Magna de Elevação',
    magna_exaltacao: 'Sessão Magna de Exaltação',
    magna_instalacao_posse: 'Sessão Magna de Instalação e Posse',
    magna_outra: 'Sessão Magna',
    extraordinaria: 'Sessão Extraordinária',
    funebre: 'Sessão Fúnebre / Pompas Fúnebres',
  };
  return (tipo && mapa[tipo as TipoSessao]) || '[TIPO DE SESSÃO NÃO SELECIONADO]';
}

/**
 * Compõe o título sugerido para a Ordem do Dia quando um Ofício/Prancha é pautado para deliberação:
 * "Ofício/Prancha {numero} recebido com assunto: {assunto}"
 */
export function comporTituloOrdemDiaDeOficio(params: {
  numeroOficio?: string;
  classificacaoOficio?: string;
  outroTipoOficio?: string;
  assuntoOficio?: string;
}): string {
  const num = (params.numeroOficio || '[s/nº]').trim();
  const classif = (params.classificacaoOficio || '').trim();
  const outro = (params.outroTipoOficio || '').trim();
  const assunto = (params.assuntoOficio || '').trim();

  const assuntoFinal =
    assunto ||
    (classif === 'Outros' ? outro : classif) ||
    '[Assunto do Ofício/Prancha]';

  return `Ofício/Prancha nº ${num} recebido com assunto: ${assuntoFinal}`;
}

/**
 * Compõe o texto ritualístico de um Expediente Recebido do tipo Carta-Convite, Carta-Consulta ou Ofício/Prancha
 */
export function comporTextoExpedienteConvite(params: {
  tipoExpediente?: TipoExpedienteRecebido;
  subtipoConvite?: SubtipoConviteExpediente;
  nomesCandidatos?: string;
  nomeIrmao?: string;
  outroDetalheConvite?: string;
  lojaConvite?: string;
  orienteConvite?: string;
  dataEvento?: string;
  horaEvento?: string;
  enderecoEvento?: string;
  origemOficio?: OrigemOficioPrancha;
  numeroOficio?: string;
  ufInstituicao?: string;
  orienteInstituicao?: string;
  nomeInstituicao?: string;
  nomePessoa?: string;
  classificacaoOficio?: string;
  outroTipoOficio?: string;
  dataRecebimentoOficio?: string;
  assuntoOficio?: string;
  destinoOficio?: DestinoOficioPrancha;
}): string {
  const loja = (params.lojaConvite || '[Nome da Loja]').trim();
  const oriente = (params.orienteConvite || '[Oriente]').trim();
  const candidatos = (params.nomesCandidatos || '').trim();

  if (params.tipoExpediente === 'oficio_prancha') {
    const origem = params.origemOficio || 'loja';
    const numero = (params.numeroOficio || '[Número]').trim();
    const destino = params.destinoOficio || 'lido_arquivado';

    let remetente = '[Remetente]';
    if (origem === 'loja') {
      const lojaRem = (params.lojaConvite || '[Nome da Loja]').trim();
      const orRem = (params.orienteConvite || '').trim();
      remetente = orRem ? `${lojaRem} (Or∴ de ${orRem})` : lojaRem;
    } else if (origem === 'instituicao') {
      const nomeInst = (
        params.nomeInstituicao || '[Nome da Instituição/Empresa]'
      ).trim();
      const orInst = (params.orienteInstituicao || '').trim();
      const ufInst = (params.ufInstituicao || '').trim();
      if (orInst && ufInst && !orInst.toUpperCase().endsWith(`-${ufInst.toUpperCase()}`)) {
        remetente = `${nomeInst} (Or∴ de ${orInst}-${ufInst})`;
      } else if (orInst) {
        remetente = `${nomeInst} (Or∴ de ${orInst})`;
      } else if (ufInst) {
        remetente = `${nomeInst} (${ufInst})`;
      } else {
        remetente = nomeInst;
      }
    } else {
      remetente = (params.nomePessoa || '[Nome do Remetente]').trim();
    }

    const classif = (params.classificacaoOficio || '').trim();
    const outroTipo = (params.outroTipoOficio || '').trim();
    const assuntoDigitado = (params.assuntoOficio || '').trim();

    const tipoBase =
      classif === 'Outros'
        ? outroTipo || 'Outros assuntos'
        : classif || '';

    const assuntoFinal =
      assuntoDigitado && tipoBase
        ? `${tipoBase} — ${assuntoDigitado}`
        : assuntoDigitado || tipoBase || '[Assunto sucinto]';

    let dataRecFmt = (params.dataRecebimentoOficio || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataRecFmt)) {
      dataRecFmt = dataRecFmt.split('-').reverse().join('/');
    }
    const trechoData = dataRecFmt ? `, recebido(a) em ${dataRecFmt},` : '';

    if (destino === 'ordem_do_dia') {
      return `Deu-se entrada ao expediente (Ofício/Prancha nº ${numero}) de ${remetente}${trechoData} sobre ${assuntoFinal}, ficando sua apreciação pautada para a Ordem do Dia desta sessão.`;
    }

    if (destino === 'sob_malhete') {
      return `Foi apresentada a Prancha / Ofício nº ${numero}, oriunda de ${remetente}${trechoData}, tratando de ${assuntoFinal}, a qual, por determinação do Venerável Mestre, ficou sob o malhete para oportuna deliberação.`;
    }

    return `Foi lido o Ofício/Prancha nº ${numero}, oriundo(a) de ${remetente}${trechoData}, tratando de ${assuntoFinal}, o qual foi devidamente anotado e arquivado no Saco de Propostas e Informações / Arquivo da Loja.`;
  }

  if (params.tipoExpediente === 'carta_consulta') {
    const nomesTxt = candidatos || '[nome(s) do(s) candidato(s)]';
    return `Carta(s) consulta(s) da ${loja}, Or∴ de ${oriente}, do(s) candidato(s) a ingresso em nossa Ordem, ${nomesTxt}, a ser(em) afixada(s) no quadro de avisos da Loja.`;
  }

  const subtipo = params.subtipoConvite || 'Iniciação';
  const irmao = (params.nomeIrmao || '').trim().replace(/^(Ir∴|IIr∴)\s*/i, '');
  const outroDetalhe = (params.outroDetalheConvite || '').trim();

  // Formata data se vier em YYYY-MM-DD para DD/MM/YYYY
  let dataFmt = (params.dataEvento || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataFmt)) {
    dataFmt = dataFmt.split('-').reverse().join('/');
  }
  const dataTexto = dataFmt || '[data]';

  const horaRaw = (params.horaEvento || '20:00').trim();
  const horaTexto = horaRaw.includes('h') ? horaRaw : `${horaRaw} horas`;
  const endereco = (params.enderecoEvento || '').trim();

  let trechoSessao = '';
  if (subtipo === 'Iniciação') {
    trechoSessao = candidatos
      ? `Sessão Magna de Iniciação do(s) candidato(s) ${candidatos}`
      : `Sessão Magna de Iniciação`;
  } else if (subtipo === 'Elevação' || subtipo === 'Exaltação') {
    trechoSessao = irmao
      ? `Sessão Magna de ${subtipo} do(s) Ir∴ (IIr∴) ${irmao}`
      : `Sessão Magna de ${subtipo}`;
  } else {
    trechoSessao = outroDetalhe
      ? `Sessão Magna de ${outroDetalhe}`
      : `Sessão Magna`;
  }

  const trechoLocal = endereco
    ? `no Templo situado à ${endereco}, Or∴ de ${oriente}`
    : `no Or∴ de ${oriente}`;

  return `Carta-convite da ${loja} para ${trechoSessao}, a ser realizada em ${dataTexto}, às ${horaTexto}, ${trechoLocal}.`;
}

/**
 * Gera a frase padrão do Resultado Geral do Saco de Propostas e Informações
 * conforme a quantidade de colunas gravadas colhidas.
 */
export function gerarFrasePadraoSacoPropostas(qtdColunas: number): string {
  if (!qtdColunas || qtdColunas <= 0) {
    return 'O saco de propostas e informações colheu apenas bons fluidos.';
  }
  const qtdFmt = String(qtdColunas).padStart(2, '0');
  return `O saco de propostas e informações colheu além de bons fluidos ${qtdFmt} colunas gravadas sendo assim decifradas pelo Venerável Mestre como:`;
}

export function obterDescricaoStatusBalaustre(
  status: StatusAprovacaoBalaustre
): string {
  const mapa: Record<StatusAprovacaoBalaustre, string> = {
    aprovado_sem_restricoes: 'aprovado sem emenda',
    aprovado_com_emendas: 'aprovado com emenda',
    rejeitado: 'rejeitado / sobrestado',
  };
  return mapa[status];
}

/**
 * Formata a frase do item 4.1 (Leitura e aprovação de Balaústres):
 * "O(s) balaústre {nº balaustres} {gestão} foi aprovado sem emenda."
 */
export function formatarFraseBalaustreLido(
  numero: number | string,
  gestaoRaw?: string,
  status: StatusAprovacaoBalaustre = 'aprovado_sem_restricoes',
  emendasObservacao?: string
): string {
  const gestaoLimpa =
    (gestaoRaw || DEFAULT_CONFIGURACAO_LOJA.gestao || '2025-2027')
      .replace(/^gest[aã]o\s*:?\s*/i, '')
      .replace(/\s*-\s*/g, '-')
      .trim() || '2025-2027';

  const statusTxt = obterDescricaoStatusBalaustre(status);
  const obs = emendasObservacao?.trim()
    ? ` (${emendasObservacao.trim()})`
    : '';

  return `O balaústre ${numero} ${gestaoLimpa} foi ${statusTxt}${obs}.`;
}

export function formatarListaBalaustresLidos(
  balaustresLidos: BalaustreFormData['balaustresLidos'],
  gestaoRaw?: string
): string[] {
  if (!balaustresLidos || balaustresLidos.length === 0) return [];

  const gestaoLimpa =
    (gestaoRaw || DEFAULT_CONFIGURACAO_LOJA.gestao || '2025-2027')
      .replace(/^gest[aã]o\s*:?\s*/i, '')
      .replace(/\s*-\s*/g, '-')
      .trim() || '2025-2027';

  // Se todos possuem o mesmo status e não há observações individuais distintas, consolida numa única frase
  const primeiroStatus = balaustresLidos[0].statusAprovacao;
  const mesmoStatusSemObs =
    balaustresLidos.length > 1 &&
    balaustresLidos.every(
      (b) =>
        b.statusAprovacao === primeiroStatus && !b.emendasObservacao?.trim()
    );

  if (mesmoStatusSemObs) {
    const nums = balaustresLidos.map((b) => String(b.numero));
    const numerosFmt =
      nums.length === 2
        ? `${nums[0]} e ${nums[1]}`
        : `${nums.slice(0, -1).join(', ')} e ${nums[nums.length - 1]}`;
    const statusTxt = obterDescricaoStatusBalaustre(primeiroStatus);
    return [
      `O balaústre ${numerosFmt} ${gestaoLimpa} foi ${statusTxt}.`,
    ];
  }

  return balaustresLidos.map((b) =>
    formatarFraseBalaustreLido(
      b.numero,
      gestaoLimpa,
      b.statusAprovacao,
      b.emendasObservacao
    )
  );
}

/**
 * Compõe o texto ritualístico do Escrutínio Secreto conforme o cenário e campos preenchidos
 */
export function comporRedacaoEscrutinio(params: {
  cenarioEscrutinio?: CenarioEscrutinioOrdemDia;
  tipoProcessoEscrutinio?: string;
  nomeCandidato?: string;
  totalVotantes?: number;
  qtdEsferasBrancas?: number;
  qtdEsferasPretas?: number;
  totalEsferasPrimeiroGiro?: number;
  resultadoProclamacao?: string;
  prazoDiasJustificativa?: string;
  dataSessaoAnterior?: string;
  statusJustificativa?: string;
}): string {
  const cenario = params.cenarioEscrutinio || 'aprovado_limpo';
  const tipoProcesso = (params.tipoProcessoEscrutinio || 'Iniciação').trim();
  const nomeCandidato = (params.nomeCandidato || '[Nome do Candidato]').trim();
  const totalVotantes = Number(params.totalVotantes ?? 0);
  const brancas = Number(params.qtdEsferasBrancas ?? 0);
  const pretas = Number(params.qtdEsferasPretas ?? 0);
  const totalEsferas = brancas + pretas;
  const totalPrimeiroGiro = Number(
    params.totalEsferasPrimeiroGiro ?? totalEsferas
  );
  const proclamacao = (
    params.resultadoProclamacao || 'APROVADO E LIMPO'
  ).trim();
  const prazoDias = (params.prazoDiasJustificativa || '15').trim();
  const dataAnterior = (params.dataSessaoAnterior || '[data da sessão anterior]').trim();
  const statusJust = (
    params.statusJustificativa ||
    'não foi apresentada qualquer justificação pelo obreiro opositor'
  ).trim();

  if (cenario === 'desfecho_sessao_posterior') {
    return `O Venerável Mestre informou à Loja que, decorrido o prazo regulamentar concedido em decorrência do escrutínio secreto realizado na sessão de ${dataAnterior} relativo ao candidato ${nomeCandidato}, ${statusJust}. Desta forma, cumpridas as exigências legais com parecer do Irmão Orador, o Venerável Mestre proclamou o candidato ${proclamacao || 'APROVADO E LIMPO'}.`;
  }

  if (cenario === 'divergencia_segundo_giro') {
    return `De ordem do Venerável Mestre, o Irmão Mestre de Cerimônias, acompanhado pelo Irmão 1º Experto, fez circular a Urna de Escrutínio Secreto entre todos os Mestres Maçons presentes, a fim de colher os votos para o processo de ${tipoProcesso} do candidato ${nomeCandidato}. Procedida à primeira apuração, verificou-se a divergência entre o número de votantes (${totalVotantes}) e o total de sufrágios recolhidos (${totalPrimeiroGiro}). Por determinação do Venerável Mestre, com parecer favorável do Irmão Orador, a primeira coleta foi tornada nula, refazendo-se imediatamente o giro da urna. Na segunda apuração, colheram-se ${brancas} esferas brancas e ${pretas} esferas pretas, total que coincidiu perfeitamente com os ${totalVotantes} Mestres presentes, proclamando o Venerável Mestre o resultado: ${proclamacao}.`;
  }

  if (cenario === 'sobrestado_1_ou_2_pretas') {
    return `De ordem do Venerável Mestre, o Irmão Mestre de Cerimônias, acompanhado pelo Irmão 1º Experto, fez circular a Urna de Escrutínio Secreto entre todos os Mestres Maçons presentes, a fim de colher os sufrágios referentes ao processo de ${tipoProcesso} do candidato ${nomeCandidato}. Concluída a coleta, a urna foi conduzida ao Altar, onde, perante o Irmão Orador que acompanhou e fiscalizou a apuração, constatou-se a presença de ${totalVotantes} Mestres votantes, tendo sido apuradas ${brancas} esferas brancas e ${pretas} esfera(s) preta(s), totalizando ${totalEsferas} votos e conferindo com o número exato de votantes. Em virtude da existência de ${pretas} voto(s) desfavorável(eis), o Venerável Mestre, nos termos do Regulamento Geral da Ordem e com o parecer favorável do Irmão Orador, sobrestou a proclamação final do resultado, facultando ao(s) Irmão(ãos) opositor(es) o prazo regulamentar de ${prazoDias} dias para apresentar(em) justificativa circunstanciada por escrito, findo o qual a matéria voltará à deliberação em sessão oportuna.`;
  }

  if (cenario === 'rejeitado_3_ou_mais_pretas') {
    return `De ordem do Venerável Mestre, o Irmão Mestre de Cerimônias, acompanhado pelo Irmão 1º Experto, fez circular a Urna de Escrutínio Secreto entre todos os Mestres Maçons presentes para a deliberação sobre o processo de ${tipoProcesso} do candidato ${nomeCandidato}. Concluída a coleta e transportada a urna ao Altar, foi realizada a contagem sob a estrita fiscalização do Irmão Orador. Apurou-se a conformidade com os ${totalVotantes} Mestres presentes, resultando em ${brancas} esferas brancas e ${pretas} esferas pretas, perfazendo o quórum integral dos votantes. Tendo o escrutínio registrado ${pretas} votos desfavoráveis, e ouvido o Irmão Orador sobre a estrita observância da legislação maçônica aplicável, o Venerável Mestre proclamou o candidato REJEITADO, determinando à Secretaria a lavratura dos registros de praxe e a comunicação de estilo à Grande Secretaria da Obediência.`;
  }

  // Cenário padrão: aprovado_limpo
  return `De ordem do Venerável Mestre, o Irmão Mestre de Cerimônias, acompanhado pelo Irmão 1º Experto, fez circular a Urna de Escrutínio Secreto entre todos os Mestres Maçons presentes, a fim de colher os votos para o processo de ${tipoProcesso} do candidato ${nomeCandidato}. Encerrada a coleta, a urna foi conduzida ao Altar do Venerável Mestre, onde, na presença e sob a conferência e fiscalização do Irmão Orador, procedeu-se à abertura e apuração. Constatou-se a presença de ${totalVotantes} Mestres votantes, tendo sido apuradas ${brancas} esferas brancas e ${pretas} esferas pretas, totalizando ${totalEsferas} votos, conferindo com o número exato de Irmãos presentes aptos a votar. Ouvido o Irmão Orador, que atestou a regularidade da contagem e considerou os trabalhos justos e perfeitos, o Venerável Mestre proclamou o resultado: candidato ${proclamacao}.`;
}

/**
 * Compõe automaticamente a redação ritualística de um item da Ordem do Dia
 * conforme o tipo selecionado (Leitura simples, Deliberação comum ou Escrutínio Secreto).
 */
export function comporRedacaoItemOrdemDia(params: {
  tipoItemOrdemDia?: TipoItemOrdemDia;
  resumoMateria?: string;
  objetoManifestacao: boolean;
  tipoManifestacao?: TipoManifestacaoOrdemDia;
  objetoVotacao: boolean;
  resultadoVotacao?: ResultadoVotacaoOrdemDia;
  cenarioEscrutinio?: CenarioEscrutinioOrdemDia;
  tipoProcessoEscrutinio?: string;
  nomeCandidato?: string;
  totalVotantes?: number;
  qtdEsferasBrancas?: number;
  qtdEsferasPretas?: number;
  totalEsferasPrimeiroGiro?: number;
  resultadoProclamacao?: string;
  prazoDiasJustificativa?: string;
  dataSessaoAnterior?: string;
  statusJustificativa?: string;
}): string {
  const tipo = params.tipoItemOrdemDia || 'deliberacao_comum';

  if (tipo === 'leitura_simples') {
    return (params.resumoMateria || '').trim();
  }

  if (tipo === 'escrutinio') {
    return comporRedacaoEscrutinio(params);
  }

  const partes: string[] = [];

  if (params.resumoMateria && params.resumoMateria.trim().length > 0) {
    partes.push(params.resumoMateria.trim());
  }

  if (params.objetoManifestacao && params.tipoManifestacao) {
    const textoManif = TEXTOS_MANIFESTACAO_ORDEM_DIA[params.tipoManifestacao];
    if (textoManif) {
      partes.push(textoManif);
    }
  }

  if (params.objetoVotacao && params.resultadoVotacao) {
    const textoVot = TEXTOS_VOTACAO_ORDEM_DIA[params.resultadoVotacao];
    if (textoVot) {
      partes.push(textoVot);
    }
  }

  return partes.join(' ');
}

/**
 * Formata uma string numérica para moeda corrente R$
 */
export function formatarMoedaBRL(valorRaw: string): string {
  const apenasDigitos = valorRaw.replace(/\D/g, '');
  if (!apenasDigitos) return 'R$ 0,00';
  const numero = parseInt(apenasDigitos, 10) / 100;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converte um inteiro (0..999) para extenso em português
 */
function centenaParaExtenso(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const unidades = [
    '',
    'um',
    'dois',
    'três',
    'quatro',
    'cinco',
    'seis',
    'sete',
    'oito',
    'nove',
  ];
  const dezADezenove = [
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ];
  const dezenas = [
    '',
    '',
    'vinte',
    'trinta',
    'quarenta',
    'cinquenta',
    'sessenta',
    'setenta',
    'oitenta',
    'noventa',
  ];
  const centenas = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ];

  const c = Math.floor(n / 100);
  const resto = n % 100;
  const d = Math.floor(resto / 10);
  const u = resto % 10;

  const partes: string[] = [];
  if (c > 0) partes.push(centenas[c]);

  if (resto >= 10 && resto <= 19) {
    partes.push(dezADezenove[resto - 10]);
  } else {
    if (d > 0) partes.push(dezenas[d]);
    if (u > 0) partes.push(unidades[u]);
  }

  return partes.join(' e ');
}

/**
 * Converte um valor monetário em string (ex: "R$ 154,50") para extenso em português:
 * "cento e cinquenta e quatro reais e cinquenta centavos"
 */
export function valorMonetarioPorExtenso(valorRaw: string): string {
  const apenasDigitos = (valorRaw || '').replace(/\D/g, '');
  if (!apenasDigitos) return 'zero reais';

  const totalCentavos = parseInt(apenasDigitos, 10);
  if (totalCentavos === 0) return 'zero reais';

  const reais = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;

  const converterInteiroReais = (valor: number): string => {
    if (valor === 0) return '';
    const milhoes = Math.floor(valor / 1_000_000);
    const milhares = Math.floor((valor % 1_000_000) / 1_000);
    const centenas = valor % 1_000;

    const blocos: string[] = [];

    if (milhoes > 0) {
      blocos.push(
        milhoes === 1
          ? 'um milhão'
          : `${centenaParaExtenso(milhoes)} milhões`
      );
    }

    if (milhares > 0) {
      blocos.push(
        milhares === 1 ? 'mil' : `${centenaParaExtenso(milhares)} mil`
      );
    }

    if (centenas > 0) {
      blocos.push(centenaParaExtenso(centenas));
    }

    let textoInteiro = '';
    if (blocos.length === 1) {
      textoInteiro = blocos[0];
    } else if (blocos.length > 1) {
      const usarConectorE =
        centenas > 0 && (centenas < 100 || centenas % 100 === 0);
      if (usarConectorE) {
        const ultimo = blocos.pop()!;
        textoInteiro = `${blocos.join(', ')} e ${ultimo}`;
      } else {
        textoInteiro = blocos.join(', ');
      }
    }

    const sufixoReal =
      valor === 1
        ? 'real'
        : milhoes > 0 && milhares === 0 && centenas === 0
        ? 'de reais'
        : 'reais';

    return `${textoInteiro} ${sufixoReal}`;
  };

  const partesFinais: string[] = [];
  if (reais > 0) {
    partesFinais.push(converterInteiroReais(reais));
  }

  if (centavos > 0) {
    const txtCentavos = centenaParaExtenso(centavos);
    partesFinais.push(
      `${txtCentavos} ${centavos === 1 ? 'centavo' : 'centavos'}`
    );
  }

  return partesFinais.join(' e ');
}

/**
 * Formata o valor do Tronco seguido do valor por extenso entre parênteses:
 * Ex: "R$ 150,00 (cento e cinquenta reais)"
 */
export function formatarTroncoComExtenso(
  valorApurado?: string,
  valorPorExtensoCustom?: string
): string {
  const numFmt = valorApurado?.trim() || 'R$ 0,00';
  const extenso =
    valorPorExtensoCustom?.trim() || valorMonetarioPorExtenso(numFmt);
  return `${numFmt} (${extenso})`;
}

/**
 * Gera a minuta completa do Balaústre em linguagem ritualística tradicional
 * utilizando os dados dinâmicos configurados para o cabeçalho da Loja.
 */
export function gerarTextoLiturgico(data: BalaustreFormData): string {
  const loja = data.configuracaoLoja || DEFAULT_CONFIGURACAO_LOJA;
  const nomeCompletoLoja = `${loja.nomeLoja}${
    loja.numeroLoja ? ` Nº ${loja.numeroLoja}` : ''
  }`;

  const introData = dataPorExtensoLiturgica(data.dataSessao);
  const descSessao = obterDescricaoTipoSessao(data.tipoSessao);
  const descGrau = obterDescricaoGrau(data.grauTrabalhos);
  const horaAberturaFmt = data.horarioAbertura.replace(':', 'h');
  const horaEncerramentoFmt = data.horarioEncerramento.replace(':', 'h');

  const c = data.cargos;
  const vm = formatarNomeIrmao(
    c.veneravelMestre.irmaoSelecionado,
    c.veneravelMestre.nomeOutro
  );
  const vig1 = formatarNomeIrmao(
    c.primeiroVigilante.irmaoSelecionado,
    c.primeiroVigilante.nomeOutro
  );
  const vig2 = formatarNomeIrmao(
    c.segundoVigilante.irmaoSelecionado,
    c.segundoVigilante.nomeOutro
  );
  const orador = formatarNomeIrmao(
    c.orador.irmaoSelecionado,
    c.orador.nomeOutro
  );
  const secretario = formatarNomeIrmao(
    c.secretario.irmaoSelecionado,
    c.secretario.nomeOutro
  );
  const tesoureiro = formatarNomeIrmao(
    c.tesoureiro.irmaoSelecionado,
    c.tesoureiro.nomeOutro
  );
  const chanceler = formatarNomeIrmao(
    c.chanceler.irmaoSelecionado,
    c.chanceler.nomeOutro
  );
  const mc = formatarNomeIrmao(
    c.mestreCerimonias.irmaoSelecionado,
    c.mestreCerimonias.nomeOutro
  );

  const rotuloCargo = (
    nomeIr: string,
    labelCargo: string
  ) => formatarRotuloCargoComSubstituto(nomeIr, labelCargo, c);

  let txt = `${nomeCompletoLoja.toUpperCase()}\n`;
  if (loja.potenciaJurisdicao || DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao) {
    txt += `${loja.potenciaJurisdicao || DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao}\n`;
  }
  const linhaReunioesRito = [
    loja.reunioesDiaHora || DEFAULT_CONFIGURACAO_LOJA.reunioesDiaHora,
    (loja.ritoPotencia || DEFAULT_CONFIGURACAO_LOJA.ritoPotencia)?.toUpperCase(),
  ]
    .filter(Boolean)
    .join(' – ');
  if (linhaReunioesRito) {
    txt += `${linhaReunioesRito}\n`;
  }
  txt += `${[loja.enderecoTemplo, loja.orienteCidadeUf].filter(Boolean).join(' – ')}\n`;
  const emailFinal = loja.emailLoja || DEFAULT_CONFIGURACAO_LOJA.emailLoja;
  if (emailFinal) {
    txt += `${emailFinal.toLowerCase().startsWith('e-mail:') ? emailFinal : `e-mail: ${emailFinal}`}\n`;
  }
  const gestaoFinal = (
    loja.gestao ||
    DEFAULT_CONFIGURACAO_LOJA.gestao ||
    ''
  ).trim();
  if (gestaoFinal) {
    txt += `${
      gestaoFinal.toLowerCase().startsWith('gestão') ||
      gestaoFinal.toLowerCase().startsWith('gestao')
        ? gestaoFinal
        : `Gestão: ${gestaoFinal}`
    }\n`;
  }
  txt += `====================================================================\n`;
  txt += `BALAÚSTRE Nº ${data.numeroBalaustre} — ${descSessao.toUpperCase()} (${descGrau})\n`;
  txt += `====================================================================\n\n`;

  // 1. ABERTURA E CARGOS
  txt += `${introData}, achando-se abertos os Augustos Trabalhos da nossa Ordem em ${descSessao} – EM ${descGrau}, reuniram-se os Obreiros às ${horaAberturaFmt}, com número legal, no Templo da ${nomeCompletoLoja}, situada à ${loja.enderecoTemplo}, com Abertura Ritualística, debaixo do Ponto Geométrico conhecido dos Filhos da V∴ ao Or∴ de ${loja.orienteCidadeUf}.\n\n`;

  const cargosAtivos = obterCargosAtivosNaSessao(c);
  if (cargosAtivos.length > 0) {
    const trechosCargos = cargosAtivos.map((item, idx) => {
      const prefixo = item.ehVeneravel
        ? `empunhando o Malhete da Sabedoria o ${item.rotuloComSubstituto} ${item.nomeFormatado}`
        : `${item.rotuloComSubstituto} ${item.nomeFormatado}`;
      if (idx === cargosAtivos.length - 1 && cargosAtivos.length > 1) {
        return `e ${prefixo}`;
      }
      return prefixo;
    });
    txt += `Os cargos em Loja foram ocupados da seguinte maneira: ${trechosCargos.join('; ')}.\n`;
  }
  txt += mc
    ? `Após o preenchimento dos lugares vagos pelo Ir∴ Mestre de Cerimônias, foi verificada a cobertura e segurança do Templo.\n\n`
    : `Após o preenchimento dos lugares vagos, foi verificada a cobertura e segurança do Templo.\n\n`;

  // 2. PRESENÇAS / QUÓRUM
  const totalPresentes =
    Number(data.quorum.qtdQuadroPresentes) +
    Number(data.quorum.qtdVisitantesPresentes);
  txt += `LIVRO DE PRESENÇAS (CHANCELARIA):\n`;
  txt += `- Irmãos do Quadro presentes: ${data.quorum.qtdQuadroPresentes}\n`;
  txt += `- Irmãos Visitantes presentes: ${data.quorum.qtdVisitantesPresentes}\n`;
  txt += `- Total de Obreiros presentes: ${totalPresentes}\n\n`;

  // 3. LEITURA E APROVAÇÃO DE BALAÚSTRES
  txt += `LEITURA DE BALAÚSTRES ANTERIORES:\n`;
  const frasesBalaustres = formatarListaBalaustresLidos(
    data.balaustresLidos,
    loja.gestao
  );
  if (frasesBalaustres.length > 0) {
    frasesBalaustres.forEach((frase) => {
      txt += `${frase}\n`;
    });
  } else {
    txt += `Leitura suprimida\n`;
  }
  txt += `\n`;

  // 4. EXPEDIENTE
  txt += `EXPEDIENTES RECEBIDOS E PRANCHAS LIDAS:\n`;
  if (data.expedientesRecebidos.length > 0) {
    data.expedientesRecebidos.forEach((exp) => {
      txt += `- ${exp.descricao}\n`;
    });
  } else {
    txt += `- Nenhum expediente constou na pasta da Secretaria.\n`;
  }
  txt += `\n`;

  // 5. SACO DE PROPOSTAS E INFORMAÇÕES
  txt += `SACO DE PROPOSTAS E INFORMAÇÕES:\n`;
  txt += `${
    data.sacoPropostasResultadoGeral?.trim() ||
    gerarFrasePadraoSacoPropostas(data.itensSacoPropostas.length)
  }\n`;
  if (data.itensSacoPropostas.length > 0) {
    data.itensSacoPropostas.forEach((item) => {
      txt += `- ${item.descricao}\n`;
    });
  }
  txt += `\n`;

  // 6. ORDEM DO DIA
  txt += `ORDEM DO DIA:\n`;
  if (data.itensOrdemDia.length > 0) {
    data.itensOrdemDia.forEach((item: OrdemDiaItem, idx: number) => {
      const redacao =
        item.textoRedacaoFinal?.trim() || comporRedacaoItemOrdemDia(item);
      txt += `${idx + 1}. ${item.titulo}:\n   ${redacao}\n\n`;
    });
  } else {
    txt += `- Nada constou na pauta da Ordem do Dia.\n\n`;
  }

  // 7. TEMPO DE INSTRUÇÃO
  txt += `TEMPO DE INSTRUÇÃO (QUARTO DE HORA DE ESTUDOS):\n`;
  if (data.tempoInstrucao.temaTitulo?.trim()) {
    const apresentador = formatarNomeIrmao(
      data.tempoInstrucao.apresentadorSelecionado,
      data.tempoInstrucao.apresentadorOutro
    );
    txt += `- Peça de Arquitetura / Instrução: "${data.tempoInstrucao.temaTitulo.trim()}"\n`;
    txt += `- Apresentador: ${apresentador || 'Não informado'}\n`;
    if (data.tempoInstrucao.resumoInstrucao?.trim()) {
      txt += `- Resumo / Síntese: ${data.tempoInstrucao.resumoInstrucao.trim()}\n`;
    }
    txt += `\n`;
  } else {
    txt += `- Não houve apresentação no Tempo de Instrução.\n\n`;
  }

  // 8. TRONCO DE BENEFICÊNCIA
  const valorTroncoCompleto = formatarTroncoComExtenso(
    data.troncoBeneficencia.valorApurado,
    data.troncoBeneficencia.valorPorExtenso
  );
  const destinoTronco =
    data.troncoBeneficencia.destinoConferencia?.trim() ||
    'A cargo e julgo da hospitalaria';
  txt += `TRONCO DE BENEFICÊNCIA (SOLIDARIEDADE):\n`;
  txt += `Fez o seu giro habitual, produzindo a medalha cunhada no valor de ${valorTroncoCompleto}. Destino: ${destinoTronco}.\n\n`;

  // 9. PALAVRA A BEM GERAL DA ORDEM E DO QUADRO EM PARTICULAR
  txt += `PALAVRA A BEM GERAL DA ORDEM E DO QUADRO EM PARTICULAR:\n\n`;

  if (data.palavraBemDaOrdem.textoConsolidadoAta?.trim()) {
    txt += `REGISTRO CONSOLIDADO DAS MANIFESTAÇÕES:\n`;
    txt += `${data.palavraBemDaOrdem.textoConsolidadoAta.trim()}\n\n`;
  }

  const formatarColuna = (
    tituloColuna: string,
    fraseSilencio: string,
    falas: BalaustreFormData['palavraBemDaOrdem']['colunaSul']
  ) => {
    txt += `${tituloColuna}:\n`;
    if (falas.length > 0) {
      falas.forEach((f) => {
        const nomeIr = formatarAutorFalaComCargoOuLoja(f, data.cargos);
        txt += `- ${nomeIr}: ${f.resumoFala.trim()}\n`;
      });
      txt += `${fraseSilencio}\n`;
    } else {
      txt += `- ${fraseSilencio}\n`;
    }
    txt += `\n`;
  };

  const ritoBrasileiro = ehRitoBrasileiro(loja.ritoPotencia);
  if (ritoBrasileiro) {
    formatarColuna(
      'COLUNA DO SUL',
      'Reinou o silêncio na coluna do Sul.',
      data.palavraBemDaOrdem.colunaSul
    );
    formatarColuna(
      'COLUNA DO NORTE',
      'Reinou o silêncio na coluna do Norte.',
      data.palavraBemDaOrdem.colunaNorte
    );
  } else {
    formatarColuna(
      'COLUNA DO NORTE',
      'Reinou o silêncio na coluna do Norte.',
      data.palavraBemDaOrdem.colunaNorte
    );
    formatarColuna(
      'COLUNA DO SUL',
      'Reinou o silêncio na coluna do Sul.',
      data.palavraBemDaOrdem.colunaSul
    );
  }
  formatarColuna(
    'COLUNA DO ORIENTE',
    'Reinou o silêncio no Oriente.',
    data.palavraBemDaOrdem.colunaOriente
  );
  formatarColuna(
    'ALTAR',
    'Reinou o silêncio no Altar.',
    data.palavraBemDaOrdem.colunaAltar || []
  );

  if (vm) {
    txt += `${vm} (${rotuloCargo(vm, 'Venerável Mestre')}):\n`;
    txt += `${
      data.palavraBemDaOrdem.palavraVeneravelMestre?.trim() ||
      'Agradeceu a presença e o zelo dos Obreiros do Quadro e Visitantes, encerrando as manifestações com votos de paz e concórdia.'
    }\n\n`;
  }

  if (orador) {
    txt += `${orador} (${rotuloCargo(orador, 'Orador')}):\n`;
    txt += `${
      data.palavraBemDaOrdem.palavraOrador?.trim() ||
      'Saudou os Irmãos presentes e visitantes, atestando que os trabalhos transcorreram de forma justa, perfeita e dentro da estrita legalidade maçônica.'
    }\n\n`;
  }

  // 10. ENCERRAMENTO E ASSINATURAS
  txt += `ENCERRAMENTO RITUALÍSTICO:\n`;
  txt += `Reinando silêncio em ambas as Colunas e no Oriente, o Venerável Mestre encerrou ritualisticamente os trabalhos às ${horaEncerramentoFmt}, com a formação da Cadeia de União e juramento de sigilo. E eu, ${secretario || 'Ir∴ Secretário'}, ${rotuloCargo(secretario, 'Secretário')}, lavrei o presente Balaústre que, após lido e achado conforme, vai assinado por mim${orador ? `, pelo Ir∴ ${rotuloCargo(orador, 'Orador')}` : ''} e pelo ${rotuloCargo(vm, 'Venerável Mestre')}.\n\n`;

  txt += `Or∴ de ${loja.orienteCidadeUf}, ${data.dataSessao.split('-').reverse().join('/')}.\n\n`;
  if (secretario) {
    txt += `____________________________________________________\n`;
    txt += `${secretario} — ${rotuloCargo(secretario, 'Secretário')}\n\n`;
  }
  if (vm) {
    txt += `____________________________________________________\n`;
    txt += `${vm} — ${rotuloCargo(vm, 'Venerável Mestre')}\n\n`;
  }
  if (orador) {
    txt += `____________________________________________________\n`;
    txt += `${orador} — ${rotuloCargo(orador, 'Orador')}\n`;
  }

  return txt;
}
