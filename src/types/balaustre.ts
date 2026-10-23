import { z } from 'zod';

// ============================================================================
// CONSTANTES DO QUADRO DE OBREIROS E CONFIGURAÇÃO PADRÃO DA LOJA
// ============================================================================

export const IRMAOS_QUADRO: string[] = [
  'Ir∴ ALDO BORGES DE FREITAS',
  'Ir∴ ALEXSANDER FARIA DO VAL OLIVEIRA',
  'Ir∴ ANDERSON CARDOSO COSTA',
  'Ir∴ ANDRE LUIZ BORGES',
  'Ir∴ AROLDO BOLÍVAR DE ALVARENGA',
  'Ir∴ ARTUR IASCO PEREIRA',
  'Ir∴ CARLOS ALBERTO BATISTA',
  'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
  'Ir∴ CLEUBER MARCELO PASCOA',
  'Ir∴ DOMICIO FERREIRA NEVES',
  'Ir∴ EMERSON LUIZ TEIXEIRA',
  'Ir∴ FERNANDO MAGNO ROCHA',
  'Ir∴ HENRIQUE ROSALEN',
  'Ir∴ ISAIAS FERREIRA DOS SANTOS',
  'Ir∴ JEFFERSON BATISTA DE PAULA SILVA',
  'Ir∴ JOAO CAIRO DE PAULA',
  'Ir∴ JOSE MARTINS JUNIOR',
  'Ir∴ JOSE RUBENS BUIATTI',
  'Ir∴ LEANDRO ZANATTA CARCANHOLO',
  'Ir∴ LEMUEL DELFINO ALVES',
  'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA',
  'Ir∴ LUIZ LUCIANO GARCIA',
  'Ir∴ LUIZ FERNANDO MARRA DE AQUINO',
  'Ir∴ MARCIO PATRICIO GONÇALVES DA SILVEIRA',
  'Ir∴ MARCOS FERREIRA VASCONCELOS',
  'Ir∴ MAX FERREIRA DA SILVA',
  'Ir∴ MAXIMIANO EDUARDO PEREIRA',
  'Ir∴ OTANES BARCELOS OLIVEIRA NETO',
  'Ir∴ PAULO HENRIQUE CUNHA',
  'Ir∴ RAPHAEL CARVALHO CARDOSO',
  'Ir∴ SÉRGIO ANTÔNIO ABRAÃO FREITAS',
];

export interface DiretoriaTitularMap {
  veneravelMestre: string;
  primeiroVigilante: string;
  segundoVigilante: string;
  orador: string;
  secretario: string;
  tesoureiro: string;
  chanceler: string;
  mestreCerimonias: string;
  hospitaleiro: string;
  cobridorInterno: string;
}

export const DIRETORIA_TITULAR_PADRAO: DiretoriaTitularMap = {
  veneravelMestre: 'Ir∴ MARCOS FERREIRA VASCONCELOS',
  primeiroVigilante: 'Ir∴ PAULO HENRIQUE CUNHA',
  segundoVigilante: 'Ir∴ ISAIAS FERREIRA DOS SANTOS',
  orador: 'Ir∴ EMERSON LUIZ TEIXEIRA',
  secretario: 'Ir∴ MAXIMIANO EDUARDO PEREIRA',
  tesoureiro: 'Ir∴ MAX FERREIRA DA SILVA',
  chanceler: 'Ir∴ FERNANDO MAGNO ROCHA',
  mestreCerimonias: 'Ir∴ ANDERSON CARDOSO COSTA',
  hospitaleiro: 'Ir∴ HENRIQUE ROSALEN',
  cobridorInterno: 'Ir∴ ANDRE LUIZ BORGES',
};

export const STORAGE_KEY_IRMAOS_QUADRO = 'secretaria_irmaos_quadro_v1';
export const STORAGE_KEY_IRMAOS_DETALHES =
  'secretaria_irmaos_quadro_detalhes_v1';
export const STORAGE_KEY_DIRETORIA_TITULAR = 'secretaria_diretoria_titular_v1';

export type StatusIrmaoQuadro = 'regular' | 'licenciado' | 'irregular';

export interface DetalheIrmaoMapItem {
  cim: string;
  telefone: string;
  status?: StatusIrmaoQuadro;
  membroHonorario?: boolean;
}

export interface IrmaoQuadroDetalhe extends DetalheIrmaoMapItem {
  nome: string;
}

export const LABELS_STATUS_IRMAO: Record<StatusIrmaoQuadro, string> = {
  regular: 'Regular',
  licenciado: 'Licenciado',
  irregular: 'Irregular',
};

/**
 * Gera a URL direta do WhatsApp (`https://wa.me/55...`) a partir do telefone cadastrado.
 */
export function gerarLinkWhatsApp(telefone: string): string | null {
  const digitos = (telefone || '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  const comDdi =
    digitos.startsWith('55') && digitos.length >= 12
      ? digitos
      : `55${digitos}`;
  return `https://wa.me/${comDdi}`;
}

/**
 * Aplica máscara numérica ao CIM (apenas dígitos, ex: 99999).
 */
export function aplicarMascaraCim(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 6);
}

/**
 * Aplica máscara de DDD (código de cidade) + celular: (99) 99999-9999.
 */
export function aplicarMascaraTelefoneCelular(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (!digitos) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
}

export function carregarDetalhesIrmaosQuadroLocal(): Record<
  string,
  DetalheIrmaoMapItem
> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IRMAOS_DETALHES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function salvarDetalhesIrmaosQuadroLocal(
  mapa: Record<string, DetalheIrmaoMapItem>
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_IRMAOS_DETALHES, JSON.stringify(mapa));
  } catch (err) {
    console.error('Erro ao salvar detalhes do quadro no localStorage:', err);
  }
}

export function carregarIrmaosQuadroSalvos(): string[] {
  if (typeof window === 'undefined') return [...IRMAOS_QUADRO];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IRMAOS_QUADRO);
    if (!raw) return [...IRMAOS_QUADRO];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [...IRMAOS_QUADRO];
  } catch {
    return [...IRMAOS_QUADRO];
  }
}

export function salvarIrmaosQuadroLocal(irmaos: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_IRMAOS_QUADRO, JSON.stringify(irmaos));
  } catch (err) {
    console.error('Erro ao salvar quadro de obreiros no localStorage:', err);
  }
}

export function carregarDiretoriaTitularSalva(): DiretoriaTitularMap {
  if (typeof window === 'undefined') return { ...DIRETORIA_TITULAR_PADRAO };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DIRETORIA_TITULAR);
    if (!raw) return { ...DIRETORIA_TITULAR_PADRAO };
    const parsed = JSON.parse(raw);
    return {
      ...DIRETORIA_TITULAR_PADRAO,
      ...parsed,
    };
  } catch {
    return { ...DIRETORIA_TITULAR_PADRAO };
  }
}

export function salvarDiretoriaTitularLocal(
  diretoria: DiretoriaTitularMap
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY_DIRETORIA_TITULAR,
      JSON.stringify(diretoria)
    );
  } catch (err) {
    console.error('Erro ao salvar diretoria titular no localStorage:', err);
  }
}

export const configuracaoLojaSchema = z.object({
  logoUrl: z.string().optional().default(''),
  invocacao: z
    .string()
    .optional()
    .default('À Gl∴ do Supr∴ Arq∴ do Univ∴'),
  nomeLoja: z
    .string()
    .min(1, 'Informe o nome da Loja')
    .default('LOJA MAÇÔNICA ALPHA E ÔMEGA'),
  numeroLoja: z.string().min(1, 'Informe o número da Loja').default('3402'),
  potenciaJurisdicao: z
    .string()
    .optional()
    .default('Jurisdicionada ao GRANDE ORIENTE DO BRASIL'),
  reunioesDiaHora: z
    .string()
    .optional()
    .default('Reuniões às terças-feiras – 20:00 horas'),
  ritoPotencia: z
    .string()
    .optional()
    .default('RITO BRASILEIRO'),
  enderecoTemplo: z
    .string()
    .min(1, 'Informe o endereço do Templo')
    .default('Rua do Fazendeiro, 680'),
  orienteCidadeUf: z
    .string()
    .min(1, 'Informe o Oriente (Cidade-UF)')
    .default('Uberlândia-MG'),
  emailLoja: z
    .string()
    .optional()
    .default('alphaeomega@cmt.org.br'),
  gestao: z
    .string()
    .optional()
    .default('2025-2027'),
});

export type ConfiguracaoLoja = z.infer<typeof configuracaoLojaSchema>;

export const DEFAULT_CONFIGURACAO_LOJA: ConfiguracaoLoja = {
  logoUrl: '',
  invocacao: 'À Gl∴ do Supr∴ Arq∴ do Univ∴',
  nomeLoja: 'LOJA MAÇÔNICA ALPHA E ÔMEGA',
  numeroLoja: '3402',
  potenciaJurisdicao: 'Jurisdicionada ao GRANDE ORIENTE DO BRASIL',
  reunioesDiaHora: 'Reuniões às terças-feiras – 20:00 horas',
  ritoPotencia: 'RITO BRASILEIRO',
  enderecoTemplo: 'Rua do Fazendeiro, 680',
  orienteCidadeUf: 'Uberlândia-MG',
  emailLoja: 'alphaeomega@cmt.org.br',
  gestao: '2025-2027',
};

export const STORAGE_KEY_CONFIG_LOJA = 'secretaria_configuracao_loja_v1';

export function carregarConfiguracaoLojaSalva(): ConfiguracaoLoja {
  if (typeof window === 'undefined') return DEFAULT_CONFIGURACAO_LOJA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG_LOJA);
    if (!raw) return DEFAULT_CONFIGURACAO_LOJA;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIGURACAO_LOJA,
      ...parsed,
      nomeLoja:
        parsed.nomeLoja === 'Aug∴ Resp∴ Loj∴ Simb∴ Alpha e Ômega'
          ? DEFAULT_CONFIGURACAO_LOJA.nomeLoja
          : parsed.nomeLoja || DEFAULT_CONFIGURACAO_LOJA.nomeLoja,
      potenciaJurisdicao:
        parsed.potenciaJurisdicao ||
        DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao,
      reunioesDiaHora:
        parsed.reunioesDiaHora || DEFAULT_CONFIGURACAO_LOJA.reunioesDiaHora,
      ritoPotencia:
        parsed.ritoPotencia === 'Rito Escocês Antigo e Aceito'
          ? DEFAULT_CONFIGURACAO_LOJA.ritoPotencia
          : parsed.ritoPotencia || DEFAULT_CONFIGURACAO_LOJA.ritoPotencia,
      enderecoTemplo:
        parsed.enderecoTemplo === 'Rua do Fazendeiro nº 680'
          ? DEFAULT_CONFIGURACAO_LOJA.enderecoTemplo
          : parsed.enderecoTemplo || DEFAULT_CONFIGURACAO_LOJA.enderecoTemplo,
      emailLoja: parsed.emailLoja || DEFAULT_CONFIGURACAO_LOJA.emailLoja,
      gestao: parsed.gestao || DEFAULT_CONFIGURACAO_LOJA.gestao,
    };
  } catch {
    return DEFAULT_CONFIGURACAO_LOJA;
  }
}

export function salvarConfiguracaoLojaLocal(config: ConfiguracaoLoja): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_CONFIG_LOJA, JSON.stringify(config));
}

export type GrauTrabalhos = 'aprendiz' | 'companheiro' | 'mestre';

export type TipoSessao =
  | 'ordinaria'
  | 'magna_iniciacao'
  | 'magna_elevacao'
  | 'magna_exaltacao'
  | 'magna_instalacao_posse'
  | 'magna_outra'
  | 'extraordinaria'
  | 'funebre';

export type StatusAprovacaoBalaustre =
  | 'aprovado_sem_restricoes'
  | 'aprovado_com_emendas'
  | 'rejeitado';

// ============================================================================
// SCHEMAS ZOD & INTERFACES TYPESCRIPT
// ============================================================================

export const oficialCargoSchema = z
  .object({
    irmaoSelecionado: z.string().min(1, 'Selecione um Irmão ou "outro"'),
    nomeOutro: z.string().optional(),
    isTitular: z.boolean().default(true),
  })
  .refine(
    (data) =>
      data.irmaoSelecionado !== 'outro' ||
      (data.nomeOutro !== undefined && data.nomeOutro.trim().length > 0),
    {
      message: 'Informe o nome do Irmão visitante/substituto',
      path: ['nomeOutro'],
    }
  );

export const balaustreAnteriorItemSchema = z.object({
  numero: z.coerce.number().int().positive('Nº inválido'),
  statusAprovacao: z.enum([
    'aprovado_sem_restricoes',
    'aprovado_com_emendas',
    'rejeitado',
  ]),
  emendasObservacao: z.string().optional(),
});

export const textoSimplesItemSchema = z.object({
  descricao: z.string().min(1, 'O campo não pode ficar vazio'),
});

export type TipoExpedienteRecebido =
  | 'normal'
  | 'convite'
  | 'carta_consulta'
  | 'oficio_prancha';

export type SubtipoConviteExpediente =
  | 'Iniciação'
  | 'Elevação'
  | 'Exaltação'
  | 'Outros';

export type OrigemOficioPrancha = 'loja' | 'instituicao' | 'pessoa';

export type DestinoOficioPrancha =
  | 'lido_arquivado'
  | 'ordem_do_dia'
  | 'sob_malhete';

export const TIPOS_CLASSIFICACAO_OFICIO = [
  'Ofício/Prancha Circular (Decretos e Atos da Potência)',
  'Ofício/Prancha de Convite (Sessões Magnas e Eventos)',
  'Ofício/Prancha de Solicitação de Informação',
  'Ofício/Prancha de Agradecimento',
  'Ofício/Prancha de Sindicância / Informação de Candidato',
  'Ofício/Prancha de Quite (Placet)',
  'Ofício/Prancha de Pedido de Ajuda / Filantropia',
  'Ofício/Prancha de Regularidade / Atestado',
  'Ofício/Prancha de Pêsames / Condolências',
  'Ofício/Prancha de Felicitações',
  'Ofício/Prancha de Pedido de Visitação',
  'Ofício/Prancha de Paramaçônicas (DeMolay/Filhas de Jó)',
  'Ofício/Prancha de Oposição',
  'Ofício/Prancha de Relações Exteriores / Tratados',
  'Outros',
] as const;

export const expedienteRecebidoItemSchema = z.object({
  tipoExpediente: z
    .enum(['normal', 'convite', 'carta_consulta', 'oficio_prancha'])
    .default('normal'),
  subtipoConvite: z
    .enum(['Iniciação', 'Elevação', 'Exaltação', 'Outros'])
    .optional()
    .default('Iniciação'),
  nomesCandidatos: z.string().optional().default(''),
  nomeIrmao: z.string().optional().default(''),
  outroDetalheConvite: z.string().optional().default(''),
  lojaConvite: z.string().optional().default(''),
  orienteConvite: z.string().optional().default(''),
  dataEvento: z.string().optional().default(''),
  horaEvento: z.string().optional().default('20:00'),
  enderecoEvento: z.string().optional().default(''),
  // Campos específicos para Ofício / Prancha Recebido(a) (Opção 4)
  origemOficio: z
    .enum(['loja', 'instituicao', 'pessoa'])
    .optional()
    .default('loja'),
  numeroOficio: z.string().optional().default(''),
  ufInstituicao: z.string().optional().default('MG'),
  orienteInstituicao: z.string().optional().default('UBERLÂNDIA-MG'),
  nomeInstituicao: z.string().optional().default(''),
  nomePessoa: z.string().optional().default(''),
  classificacaoOficio: z
    .string()
    .optional()
    .default('Ofício/Prancha Circular (Decretos e Atos da Potência)'),
  outroTipoOficio: z.string().optional().default(''),
  dataRecebimentoOficio: z.string().optional().default(''),
  assuntoOficio: z.string().optional().default(''),
  destinoOficio: z
    .enum(['lido_arquivado', 'ordem_do_dia', 'sob_malhete'])
    .optional()
    .default('lido_arquivado'),
  enviadoOrdemDia: z.boolean().optional().default(false),
  descricao: z.string().min(1, 'O campo não pode ficar vazio'),
});

export type TipoItemOrdemDia =
  | 'leitura_simples'
  | 'deliberacao_comum'
  | 'escrutinio';

export type CenarioEscrutinioOrdemDia =
  | 'aprovado_limpo'
  | 'divergencia_segundo_giro'
  | 'sobrestado_1_ou_2_pretas'
  | 'rejeitado_3_ou_mais_pretas'
  | 'desfecho_sessao_posterior';

export type TipoManifestacaoOrdemDia =
  | 'sem_manifestacao'
  | 'manifestacao_positiva'
  | 'manifestacao_negativa';

export type ResultadoVotacaoOrdemDia =
  | 'aprovada_unanimidade'
  | 'aprovada_maioria'
  | 'negada_unanimidade'
  | 'negada_maioria';

export const TEXTOS_MANIFESTACAO_ORDEM_DIA: Record<
  TipoManifestacaoOrdemDia,
  string
> = {
  sem_manifestacao:
    'Por determinação do Venerável Mestre e sob as ordens dos Irmãos Vigilantes, a palavra foi passada às colunas para que os irmãos que desejassem se manifestassem sobre o assunto. Não havendo manifestações, deu-se por encerrada a palavra.',
  manifestacao_positiva:
    'Por determinação do Venerável Mestre e sob as ordens dos Irmãos Vigilantes, a palavra foi passada às colunas para que os irmãos que desejassem pudessem se manifestar sobre o assunto. Houve diversas manifestações positivas por parte dos irmãos.',
  manifestacao_negativa:
    'Por determinação do Venerável Mestre e sob as ordens dos Irmãos Vigilantes, a palavra foi passada às colunas para que os irmãos que desejassem pudessem se manifestar sobre o assunto. Alguns irmãos expressaram opiniões parcialmente ou totalmente contrárias ao tema abordado, apresentando comentários e considerações a respeito.',
};

export const TEXTOS_VOTACAO_ORDEM_DIA: Record<
  ResultadoVotacaoOrdemDia,
  string
> = {
  aprovada_unanimidade:
    'Após consultar o Irmão Orador acerca da legalidade da matéria para votação e obtendo parecer favorável, o Venerável Mestre submeteu-a à votação, sendo aprovada por unanimidade pelos irmãos presentes.',
  aprovada_maioria:
    'Após consultar o Irmão Orador acerca da legalidade da matéria para votação e obtendo parecer favorável, o Venerável Mestre submeteu-a à votação, sendo aprovada por maioria dos irmãos presentes.',
  negada_unanimidade:
    'Após consultar o Irmão Orador acerca da legalidade da matéria para votação e obtendo parecer favorável, o Venerável Mestre submeteu-a à votação, sendo negada por unanimidade pelos irmãos presentes.',
  negada_maioria:
    'Após consultar o Irmão Orador acerca da legalidade da matéria para votação e obtendo parecer favorável, o Venerável Mestre submeteu-a à votação, sendo negada por maioria dos irmãos presentes.',
};

export const ordemDiaItemSchema = z.object({
  tipoItemOrdemDia: z
    .enum(['leitura_simples', 'deliberacao_comum', 'escrutinio'])
    .default('deliberacao_comum'),
  titulo: z.string().min(1, 'Informe a matéria/título'),
  resumoMateria: z.string().optional().default(''),
  objetoManifestacao: z.boolean().default(false),
  tipoManifestacao: z
    .enum([
      'sem_manifestacao',
      'manifestacao_positiva',
      'manifestacao_negativa',
    ])
    .default('sem_manifestacao'),
  objetoVotacao: z.boolean().default(false),
  resultadoVotacao: z
    .enum([
      'aprovada_unanimidade',
      'aprovada_maioria',
      'negada_unanimidade',
      'negada_maioria',
    ])
    .optional(),
  // Campos específicos de Escrutínio Secreto
  cenarioEscrutinio: z
    .enum([
      'aprovado_limpo',
      'divergencia_segundo_giro',
      'sobrestado_1_ou_2_pretas',
      'rejeitado_3_ou_mais_pretas',
      'desfecho_sessao_posterior',
    ])
    .optional()
    .default('aprovado_limpo'),
  tipoProcessoEscrutinio: z.string().optional().default('Iniciação'),
  nomeCandidato: z.string().optional().default(''),
  totalVotantes: z.coerce.number().int().min(0).optional().default(21),
  qtdEsferasBrancas: z.coerce.number().int().min(0).optional().default(21),
  qtdEsferasPretas: z.coerce.number().int().min(0).optional().default(0),
  totalEsferasPrimeiroGiro: z.coerce.number().int().min(0).optional().default(20),
  resultadoProclamacao: z.string().optional().default('APROVADO E LIMPO'),
  prazoDiasJustificativa: z.string().optional().default('15'),
  dataSessaoAnterior: z.string().optional().default(''),
  statusJustificativa: z
    .string()
    .optional()
    .default('não foi apresentada qualquer justificação pelo obreiro opositor'),
  textoRedacaoFinal: z
    .string()
    .min(1, 'O texto da deliberação não pode ficar vazio'),
});

export const LOJAS_VISITANTES_SUGERIDAS: string[] = [
  'A∴R∴L∴S∴ Acácia do Triângulo',
  'A∴R∴L∴S∴ Estrela Uberlandense',
  'A∴R∴L∴S∴ Fraternidade Uberlandense',
  'A∴R∴L∴S∴ Luz e Caridade',
  'A∴R∴L∴S∴ Ordem e Progresso',
  'A∴R∴L∴S∴ União e Paz',
  'A∴R∴L∴S∴ Vigilantes da Ordem',
];

export const ORIENTES_SUGERIDOS: string[] = [
  'Uberlândia-MG',
  'Araguari-MG',
  'Ituiutaba-MG',
  'Monte Carmelo-MG',
  'Patrocínio-MG',
  'Tupaciguara-MG',
  'Prata-MG',
  'Uberaba-MG',
  'Catalão-GO',
];

export const falaColunaItemSchema = z
  .object({
    irmaoSelecionado: z.string().min(1, 'Selecione o Irmão que usou da palavra'),
    nomeOutro: z.string().optional(),
    lojaVisitante: z.string().optional(),
    orienteVisitante: z.string().optional(),
    cargoIrmao: z.string().optional(),
    resumoFala: z.string().min(1, 'Descreva o resumo da manifestação'),
  })
  .refine(
    (data) =>
      data.irmaoSelecionado !== 'outro' ||
      (data.nomeOutro !== undefined && data.nomeOutro.trim().length > 0),
    {
      message: 'Digite o nome do Irmão',
      path: ['nomeOutro'],
    }
  );

export const balaustreSchema = z.object({
  // 0. Configurações Dinâmicas do Cabeçalho / Timbre da Loja
  configuracaoLoja: configuracaoLojaSchema,

  // 1. Cabeçalho & Metadados da Sessão
  numeroBalaustre: z.coerce
    .number()
    .int()
    .positive('O número do Balaústre deve ser maior que zero'),
  dataSessao: z.string().min(1, 'A data da sessão é obrigatória'),
  horarioAbertura: z.string().min(1, 'O horário de abertura é obrigatório'),
  grauTrabalhos: z.enum(['aprendiz', 'companheiro', 'mestre']),
  tipoSessao: z.enum([
    'ordinaria',
    'magna_iniciacao',
    'magna_elevacao',
    'magna_exaltacao',
    'magna_instalacao_posse',
    'magna_outra',
    'extraordinaria',
    'funebre',
  ]),

  // 2. Ocupação dos Cargos em Loja
  cargos: z.object({
    veneravelMestre: oficialCargoSchema,
    primeiroVigilante: oficialCargoSchema,
    segundoVigilante: oficialCargoSchema,
    orador: oficialCargoSchema,
    secretario: oficialCargoSchema,
    tesoureiro: oficialCargoSchema,
    chanceler: oficialCargoSchema,
    mestreCerimonias: oficialCargoSchema,
    hospitaleiro: oficialCargoSchema,
    cobridorInterno: oficialCargoSchema,
  }),

  // 3. Livro de Presenças & Quórum (Chancelaria)
  quorum: z.object({
    qtdQuadroPresentes: z.coerce.number().int().min(0, 'Mínimo 0'),
    qtdVisitantesPresentes: z.coerce.number().int().min(0, 'Mínimo 0'),
  }),

  // 4. Expediente e Matérias
  balaustresLidos: z.array(balaustreAnteriorItemSchema),
  expedientesRecebidos: z.array(expedienteRecebidoItemSchema),

  // 5. Saco de Propostas e Informações
  sacoPropostasResultadoGeral: z.string().optional(),
  itensSacoPropostas: z.array(textoSimplesItemSchema),

  // 6. Ordem do Dia & Instrução
  itensOrdemDia: z.array(ordemDiaItemSchema),
  tempoInstrucao: z.object({
    temaTitulo: z.string().optional(),
    apresentadorSelecionado: z.string().optional(),
    apresentadorOutro: z.string().optional(),
    resumoInstrucao: z.string().optional(),
  }),

  // 7. Tronco de Beneficência (Solidariedade)
  troncoBeneficencia: z.object({
    valorApurado: z.string().min(1, 'Informe o valor apurado (ou R$ 0,00)'),
    valorPorExtenso: z.string().optional().default('zero reais'),
    destinoConferencia: z
      .string()
      .optional()
      .default('A cargo e julgo da hospitalaria'),
  }),

  // 8. Palavra a Bem Geral e da Ordem (Ordem Ritualística)
  palavraBemDaOrdem: z.object({
    textoConsolidadoAta: z.string().optional().default(''),
    colunaSul: z.array(falaColunaItemSchema),
    colunaNorte: z.array(falaColunaItemSchema),
    colunaOriente: z.array(falaColunaItemSchema),
    colunaAltar: z.array(falaColunaItemSchema).default([]),
    palavraVeneravelMestre: z.string().optional(),
    palavraOrador: z.string().optional(),
  }),

  // 9. Encerramento
  horarioEncerramento: z
    .string()
    .min(1, 'O horário de encerramento é obrigatório'),
});

export type OficialCargoData = z.infer<typeof oficialCargoSchema>;
export type BalaustreAnteriorItem = z.infer<typeof balaustreAnteriorItemSchema>;
export type ExpedienteRecebidoItem = z.infer<
  typeof expedienteRecebidoItemSchema
>;
export type OrdemDiaItem = z.infer<typeof ordemDiaItemSchema>;
export type FalaColunaItem = z.infer<typeof falaColunaItemSchema>;
export type BalaustreFormData = z.infer<typeof balaustreSchema>;

// ============================================================================
// AUTENTICAÇÃO E GESTÃO DE ACESSO POR NÚMERO CIM (ETAPA 3)
// ============================================================================

export type PapelUsuarioCim =
  | 'secretario'
  | 'veneravel'
  | 'orador'
  | 'obreiro'
  | 'super_admin';

export interface UsuarioCim {
  id?: string;
  cim: string;
  irmaoNome: string;
  papel: PapelUsuarioCim;
  senhaAcesso: string;
  ativo: boolean;
  ultimoAcesso?: string;
}

export interface SessaoUsuarioLogado {
  cim: string;
  irmaoNome: string;
  papel: PapelUsuarioCim;
  lojaId: string;
  nomeLoja?: string;
  numeroLoja?: string;
  autenticadoEm: string;
}

export interface LojaTenant {
  id: string;
  slug: string;
  invocacao: string;
  nomeLoja: string;
  numeroLoja: string;
  potenciaJurisdicao: string;
  reunioesDiaHora: string;
  ritoPotencia: string;
  enderecoTemplo: string;
  orienteCidadeUf: string;
  emailLoja: string;
  gestao: string;
  logoUrl: string;
  ativa: boolean;
  createdAt?: string;
}

export interface PermissoesUsuario {
  ehSuperAdmin: boolean;
  podeGerenciarMultiLojas: boolean;
  podeEditarBalaustre: boolean;
  podeExcluirBalaustre: boolean;
  podeEditarQuadroDiretoria: boolean;
  podeGerenciarAcessosCim: boolean;
  podeConfigurarCabecalhoLoja: boolean;
  somenteConsulta: boolean;
}

export function obterPermissoesUsuario(
  papel?: PapelUsuarioCim
): PermissoesUsuario {
  switch (papel) {
    case 'super_admin':
      return {
        ehSuperAdmin: true,
        podeGerenciarMultiLojas: true,
        podeEditarBalaustre: true,
        podeExcluirBalaustre: true,
        podeEditarQuadroDiretoria: true,
        podeGerenciarAcessosCim: true,
        podeConfigurarCabecalhoLoja: true,
        somenteConsulta: false,
      };
    case 'secretario':
    case 'veneravel':
      return {
        ehSuperAdmin: false,
        podeGerenciarMultiLojas: false,
        podeEditarBalaustre: true,
        podeExcluirBalaustre: true,
        podeEditarQuadroDiretoria: true,
        podeGerenciarAcessosCim: true,
        podeConfigurarCabecalhoLoja: true,
        somenteConsulta: false,
      };
    case 'orador':
      return {
        ehSuperAdmin: false,
        podeGerenciarMultiLojas: false,
        podeEditarBalaustre: true,
        podeExcluirBalaustre: false,
        podeEditarQuadroDiretoria: false,
        podeGerenciarAcessosCim: false,
        podeConfigurarCabecalhoLoja: false,
        somenteConsulta: false,
      };
    case 'obreiro':
    default:
      return {
        ehSuperAdmin: false,
        podeGerenciarMultiLojas: false,
        podeEditarBalaustre: false,
        podeExcluirBalaustre: false,
        podeEditarQuadroDiretoria: false,
        podeGerenciarAcessosCim: false,
        podeConfigurarCabecalhoLoja: false,
        somenteConsulta: true,
      };
  }
}

export const LABELS_PAPEL_CIM: Record<PapelUsuarioCim, string> = {
  secretario: 'Secretário (Admin da Loja)',
  veneravel: 'Venerável Mestre (Admin da Loja)',
  orador: 'Orador / Guarda da Lei',
  obreiro: 'Obreiro / Consulta',
  super_admin: 'Super Usuário (Multi-Lojas)',
};

export const DEFAULT_USUARIOS_CIM: UsuarioCim[] = [
  {
    cim: '3402',
    irmaoNome: 'Ir∴ Maximiano Eduardo Pereira',
    papel: 'secretario',
    senhaAcesso: '3402',
    ativo: true,
  },
  {
    cim: '99999',
    irmaoNome: 'Super Administrador (Gestão Multi-Lojas)',
    papel: 'super_admin',
    senhaAcesso: '99999',
    ativo: true,
  },
];

export const STORAGE_KEY_USUARIOS_CIM = 'usuarios_cim_loja_3402';
export const STORAGE_KEY_SESSAO_LOGADA = 'sessao_cim_logada_3402';

export function carregarUsuariosCimLocal(): UsuarioCim[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USUARIOS_CIM);
    if (!raw) return DEFAULT_USUARIOS_CIM;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const temSuperAdmin = parsed.some((u: any) => u.cim === '99999');
      if (!temSuperAdmin) {
        return [
          ...parsed,
          {
            cim: '99999',
            irmaoNome: 'Super Administrador (Gestão Multi-Lojas)',
            papel: 'super_admin',
            senhaAcesso: '99999',
            ativo: true,
          },
        ];
      }
      return parsed;
    }
    return DEFAULT_USUARIOS_CIM;
  } catch {
    return DEFAULT_USUARIOS_CIM;
  }
}

export function salvarUsuariosCimLocal(usuarios: UsuarioCim[]): void {
  localStorage.setItem(STORAGE_KEY_USUARIOS_CIM, JSON.stringify(usuarios));
}

export function carregarSessaoUsuarioLogado(): SessaoUsuarioLogado | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSAO_LOGADA);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessaoUsuarioLogado;
    if (parsed && parsed.cim && parsed.irmaoNome) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function salvarSessaoUsuarioLogado(sessao: SessaoUsuarioLogado): void {
  localStorage.setItem(STORAGE_KEY_SESSAO_LOGADA, JSON.stringify(sessao));
}

export function limparSessaoUsuarioLogado(): void {
  localStorage.removeItem(STORAGE_KEY_SESSAO_LOGADA);
}

