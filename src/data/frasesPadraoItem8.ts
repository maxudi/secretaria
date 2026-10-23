// ============================================================================
// BANCO DE FRASES PADRONIZADAS E MANIFESTAÇÕES RECORRENTES — ITEM 8 DA ATA
// ============================================================================

export interface FraseManifestacao {
  id: string;
  titulo: string;
  palavraChave: string;
  categoria: string;
  cargo?: string;
  irmaoId?: string;
  textoModelo: string;
  camposVariaveis?: string[];
  ativo: boolean;
  ordem: number;
  personalizavel: boolean;
}

export const CARGOS_MACONICOS_ITEM8: string[] = [
  'Venerável Mestre',
  '1º Vigilante',
  '2º Vigilante',
  'Orador',
  'Secretário',
  'Tesoureiro',
  'Chanceler',
  'Mestre de Cerimônias',
];

export const CATEGORIAS_INICIAIS_ITEM8: string[] = [
  'Chanceler',
  'Tesoureiro',
  'Saudações e cumprimentos',
  'Irmãos visitantes',
  'Agradecimentos e hospitalidade',
  'Transmissão de TFA',
  'Convites para outras Lojas',
  'Comentários sobre trabalhos apresentados',
  'Manifestações favoráveis',
  'Manifestações contrárias ou parcialmente contrárias',
  'Considerações pessoais',
  'Justificativas de ausências e atrasos',
  'Agradecimentos e congratulações',
  'Solidariedade e assuntos pessoais',
  'Comunicados e eventos',
  'Outros Oficiais',
  'Encerramento das manifestações',
];

export const FRASES_INICIAIS_ITEM8: FraseManifestacao[] = [
  // --- CATEGORIA: CHANCELER ---
  {
    id: 'frase-chanceler-visitas-padrao',
    titulo: 'Chanceler: Certificados de visitas',
    palavraChave: 'Chanceler, visitas, certificados de visitas, oficinas',
    categoria: 'Chanceler',
    cargo: 'Chanceler',
    textoModelo:
      'Anunciou os certificados de visitas dos IIr∴ do Quadro a outras Of∴.',
    camposVariaveis: [],
    ativo: true,
    ordem: 1,
    personalizavel: true,
  },
  {
    id: 'frase-chanceler-aniversariantes-datas-palmas',
    titulo: 'Chanceler: Aniversariantes e datas comemorativas (Bateria de palmas)',
    palavraChave:
      'Chanceler, aniversariantes, datas comemorativas, bateria de palmas',
    categoria: 'Chanceler',
    cargo: 'Chanceler',
    textoModelo:
      'Por fim anunciou os aniversariantes e as datas comemorativas, solicitando bateria de palmas.',
    camposVariaveis: [],
    ativo: true,
    ordem: 2,
    personalizavel: true,
  },

  // --- CATEGORIA: TESOUREIRO ---
  {
    id: 'frase-tesoureiro-tronco-bons-fluidos',
    titulo: 'Tesoureiro: Tronco colheu bons fluidos e medalha cunhada',
    palavraChave:
      'Tesoureiro, tronco, bons fluidos, medalha cunhada, valor, reais',
    categoria: 'Tesoureiro',
    cargo: 'Tesoureiro',
    textoModelo:
      'Por fim informou que o tronco colheu além de bons fluidos a medalha cunhada de {VALOR_TRONCO}.',
    camposVariaveis: [],
    ativo: true,
    ordem: 3,
    personalizavel: true,
  },

  // --- DEMAIS CATEGORIAS ---
  {
    id: 'frase-tfa-vm',
    titulo: 'T∴F∴A∴ do Venerável Mestre',
    palavraChave: 'TFA, T∴F∴A∴, abraço, venerável, loja',
    categoria: 'Transmissão de TFA',
    textoModelo:
      'Transmitiu à Loja um Tríplice e Fraternal Abraço (T∴F∴A∴) em nome do Ven∴ M∴ e dos Obreiros da {LOJA}.',
    camposVariaveis: ['LOJA'],
    ativo: true,
    ordem: 4,
    personalizavel: true,
  },
  {
    id: 'frase-tfa-simples',
    titulo: 'Transmissão de T∴F∴A∴ de Irmão',
    palavraChave: 'TFA, T∴F∴A∴, abraço fraterno, irmão',
    categoria: 'Transmissão de TFA',
    textoModelo:
      'Deixou um Tríplice e Fraternal Abraço (T∴F∴A∴) a todos os IIr∴ presentes em nome do {IRMAO}.',
    camposVariaveis: ['IRMAO'],
    ativo: true,
    ordem: 5,
    personalizavel: true,
  },
  {
    id: 'frase-elogio-sessao',
    titulo: 'Elogio à condução da sessão',
    palavraChave: 'Elogio à sessão, condução, harmonia, trabalhos',
    categoria: 'Saudações e cumprimentos',
    textoModelo:
      'Elogiou a condução da sessão, a harmonia reinante entre as CCol∴ e a excelente organização dos trabalhos.',
    camposVariaveis: [],
    ativo: true,
    ordem: 6,
    personalizavel: true,
  },
  {
    id: 'frase-visitante-agradecimento',
    titulo: 'Agradecimento de Ir∴ Visitante pela acolhida',
    palavraChave: 'Visitante, acolhida, hospitalidade, recepção',
    categoria: 'Irmãos visitantes',
    textoModelo:
      'Agradeceu a calorosa e fraterna acolhida recebida dos IIr∴ desta Of∴, colocando sua A∴R∴L∴S∴ mãe à disposição.',
    camposVariaveis: [],
    ativo: true,
    ordem: 7,
    personalizavel: true,
  },
  {
    id: 'frase-boas-vindas-visitantes',
    titulo: 'Boas-vindas aos IIr∴ Visitantes',
    palavraChave: 'Boas-vindas, saudação, visitantes',
    categoria: 'Agradecimentos e hospitalidade',
    textoModelo:
      'Saudou fraternalmente os IIr∴ visitantes presentes, agradecendo por abrilhantarem as CCol∴ da Of∴ nesta sessão.',
    camposVariaveis: [],
    ativo: true,
    ordem: 8,
    personalizavel: true,
  },
  {
    id: 'frase-convite-visita',
    titulo: 'Convite para sessão em outra A∴R∴L∴S∴',
    palavraChave: 'Convite para visita, sessão magna, outra loja',
    categoria: 'Convites para outras Lojas',
    textoModelo:
      'Formulou convite aos IIr∴ para participarem da sessão na {LOJA}, que será realizada no dia {DATA}.',
    camposVariaveis: ['LOJA', 'DATA'],
    ativo: true,
    ordem: 9,
    personalizavel: true,
  },
  {
    id: 'frase-comentario-trabalho',
    titulo: 'Parabenização pelo Trabalho / Instrução',
    palavraChave: 'Comentário sobre o trabalho, peça de arquitetura, instrução',
    categoria: 'Comentários sobre trabalhos apresentados',
    textoModelo:
      'Parabenizou o {IRMAO} pela brilhante apresentação da Peça de Arquitetura da noite, tecendo considerações complementares sobre o tema.',
    camposVariaveis: ['IRMAO'],
    ativo: true,
    ordem: 10,
    personalizavel: true,
  },
  {
    id: 'frase-manifestacao-favoravel',
    titulo: 'Concordância e apoio à matéria',
    palavraChave: 'Favorável, apoio, concordância',
    categoria: 'Manifestações favoráveis',
    textoModelo:
      'Manifestou-se de forma inteiramente favorável às proposições apresentadas, ressaltando sua importância para o fortalecimento da Of∴.',
    camposVariaveis: [],
    ativo: true,
    ordem: 11,
    personalizavel: true,
  },
  {
    id: 'frase-opiniao-contraria',
    titulo: 'Opinião contrária / divergente',
    palavraChave: 'Opinião contrária, divergência, ressalva',
    categoria: 'Manifestações contrárias ou parcialmente contrárias',
    textoModelo:
      'Apresentou entendimento divergente sobre determinado aspecto do assunto abordado, expondo suas considerações com respeito e fraternidade.',
    camposVariaveis: [],
    ativo: true,
    ordem: 12,
    personalizavel: true,
  },
  {
    id: 'frase-justificativa-ausencia',
    titulo: 'Justificativa de ausência em sessão anterior',
    palavraChave: 'Justificativa de ausência, falta, sessão anterior',
    categoria: 'Justificativas de ausências e atrasos',
    textoModelo:
      'Justificou sua ausência em sessão anterior por motivos profissionais e particulares pertinentes.',
    camposVariaveis: [],
    ativo: true,
    ordem: 13,
    personalizavel: true,
  },
  {
    id: 'frase-justificativa-terceiro',
    titulo: 'Justificativa de ausência de outro Ir∴',
    palavraChave: 'Justificativa de ausência de irmão, escusas',
    categoria: 'Justificativas de ausências e atrasos',
    textoModelo:
      'Apresentou justificativa de ausência em nome do {IRMAO}, impossibilitado de comparecer aos trabalhos desta noite.',
    camposVariaveis: ['IRMAO'],
    ativo: true,
    ordem: 14,
    personalizavel: true,
  },
  {
    id: 'frase-congratulacoes',
    titulo: 'Congratulações e felicitações a Ir∴',
    palavraChave: 'Parabéns, congratulações, homenagem',
    categoria: 'Agradecimentos e congratulações',
    textoModelo:
      'Dirigiu votos de congratulações ao {IRMAO}, destacando sua dedicação e exemplo maçônico.',
    camposVariaveis: ['IRMAO'],
    ativo: true,
    ordem: 15,
    personalizavel: true,
  },
  {
    id: 'frase-solidariedade-saude',
    titulo: 'Informações sobre saúde de Ir∴ ou familiar',
    palavraChave: 'Solidariedade, saúde, hospitalaria, visita fraterna',
    categoria: 'Solidariedade e assuntos pessoais',
    textoModelo:
      'Trouxe notícias sobre o estado de saúde do {IRMAO}, solicitando vibrações positivas ao G∴A∴D∴U∴ de todos os IIr∴ para sua pronta recuperação.',
    camposVariaveis: ['IRMAO'],
    ativo: true,
    ordem: 16,
    personalizavel: true,
  },
  {
    id: 'frase-comunicado-evento',
    titulo: 'Comunicado sobre evento ou confraternização',
    palavraChave: 'Evento, ágape, confraternização, comunicado',
    categoria: 'Comunicados e eventos',
    textoModelo:
      'Comunicou aos IIr∴ os detalhes referentes ao evento "{EVENTO}", convidando a família maçônica a participar.',
    camposVariaveis: ['EVENTO'],
    ativo: true,
    ordem: 17,
    personalizavel: true,
  },
  {
    id: 'frase-consideracao-pessoal',
    titulo: 'Reflexão filosófica e consideração pessoal',
    palavraChave: 'Reflexão, experiência pessoal, filosofia',
    categoria: 'Considerações pessoais',
    textoModelo:
      'Compartilhou uma reflexão pessoal acerca dos ensinamentos morais da Maçonaria e sua aplicação na vida cotidiana.',
    camposVariaveis: [],
    ativo: true,
    ordem: 18,
    personalizavel: true,
  },
  {
    id: 'frase-orador-legalidade',
    titulo: 'Orador: Ratificação de Legalidade dos Trabalhos',
    palavraChave: 'Orador, guarda da lei, legalidade, justo e perfeito',
    categoria: 'Outros Oficiais',
    cargo: 'Orador',
    textoModelo:
      'Por fim, o Ir∴ Orador ratificou que os trabalhos transcorreram de forma justa e perfeita, em estrita observância às Leis e Regulamentos que regem a Ordem Maçônica.',
    camposVariaveis: [],
    ativo: true,
    ordem: 19,
    personalizavel: true,
  },
  {
    id: 'frase-secretario-comunicado',
    titulo: 'Secretário: Comunicação Administrativa da Secretaria',
    palavraChave: 'Secretário, pranchas, administração, secretaria',
    categoria: 'Outros Oficiais',
    cargo: 'Secretário',
    textoModelo:
      'Informou que a pasta da Secretaria encontra-se em dia e colocou a Secretaria à disposição dos IIr∴ do Quadro.',
    camposVariaveis: [],
    ativo: true,
    ordem: 20,
    personalizavel: true,
  },
  {
    id: 'frase-vm-encerramento',
    titulo: 'Ven∴ M∴: Agradecimento e Encerramento',
    palavraChave: 'Venerável Mestre, encerramento, agradecimento final',
    categoria: 'Encerramento das manifestações',
    cargo: 'Venerável Mestre',
    textoModelo:
      'Agradeceu a presença e a dedicação dos IIr∴ do Quadro e Visitantes, convidando a todos para o ágape fraternal após o encerramento ritualístico.',
    camposVariaveis: [],
    ativo: true,
    ordem: 21,
    personalizavel: true,
  },
];

const STORAGE_KEY_FRASES_ITEM8 = 'secretaria_frases_item8_v3';
const STORAGE_KEY_CATEGORIAS_ITEM8 = 'secretaria_categorias_item8_v2';

export function carregarFrasesItem8(): FraseManifestacao[] {
  if (typeof window === 'undefined') return FRASES_INICIAIS_ITEM8;
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_FRASES_ITEM8);
    if (!salvo) return FRASES_INICIAIS_ITEM8;
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : FRASES_INICIAIS_ITEM8;
  } catch {
    return FRASES_INICIAIS_ITEM8;
  }
}

export function salvarFrasesItem8(frases: FraseManifestacao[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_FRASES_ITEM8, JSON.stringify(frases));
}

export function carregarCategoriasItem8(): string[] {
  if (typeof window === 'undefined') return CATEGORIAS_INICIAIS_ITEM8;
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_CATEGORIAS_ITEM8);
    if (!salvo) return CATEGORIAS_INICIAIS_ITEM8;
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : CATEGORIAS_INICIAIS_ITEM8;
  } catch {
    return CATEGORIAS_INICIAIS_ITEM8;
  }
}

export function salvarCategoriasItem8(categorias: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_CATEGORIAS_ITEM8, JSON.stringify(categorias));
}

/**
 * Extrai automaticamente variáveis no formato {NOME_VARIAVEL} de um texto modelo,
 * ignorando {VALOR_TRONCO} que é preenchido automaticamente pelo campo do Item 7.
 */
export function extrairCamposVariaveis(textoModelo: string): string[] {
  const regex = /\{([A-Z0-9_À-Ú]+)\}/gi;
  const encontrados = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(textoModelo)) !== null) {
    const varName = match[1].toUpperCase();
    if (varName !== 'VALOR_TRONCO') {
      encontrados.add(varName);
    }
  }
  return Array.from(encontrados);
}
