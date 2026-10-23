import lojasGobMinasRaw from './lojas_gobminas.json';

export interface LojaCatalogoItem {
  id: string;
  uf: string;
  oriente: string;
  nomeExibicao: string;
  numero?: string;
}

export const TODAS_UFS_BRASIL: string[] = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const STORAGE_KEY_LOJAS_CUSTOM = 'secretaria_lojas_visitantes_custom_v1';

/**
 * Normaliza qualquer prefixo "ARLS" para a abreviatura maçônica correta "A∴R∴L∴S∴"
 */
export function normalizarSiglaArls(nome: string): string {
  const limpo = nome.trim();
  if (!limpo) return '';
  if (/^A∴R∴L∴S∴/i.test(limpo)) {
    return limpo.replace(/^a∴r∴l∴s∴\s*/i, 'A∴R∴L∴S∴ ');
  }
  if (/^ARLS\b/i.test(limpo)) {
    return limpo.replace(/^ARLS\s*/i, 'A∴R∴L∴S∴ ');
  }
  if (/^(AUG|PALEM)/i.test(limpo)) {
    return limpo;
  }
  return `A∴R∴L∴S∴ ${limpo}`;
}

/**
 * Converte o JSON oficial do GOB-MG em itens padronizados de UF / Oriente / Loja
 */
function processarLojasGobMinas(): LojaCatalogoItem[] {
  const resultado: LojaCatalogoItem[] = [];

  (lojasGobMinasRaw as any[]).forEach((row, index) => {
    if (!row || row.numero === 'N°' || !row.nome || !row.cidade) return;

    const partesCidade = String(row.cidade).split('/');
    const oriente = (partesCidade[0] || '').trim().toUpperCase();
    const uf = (partesCidade[1] || 'MG').trim().toUpperCase();
    const num = String(row.numero || '').trim();
    const nome = String(row.nome || '').trim();

    if (!oriente || !nome) return;

    const nomeComSigla = normalizarSiglaArls(nome);
    const nomeFormatado = `${nomeComSigla}${num ? ` Nº ${num}` : ''}`;

    resultado.push({
      id: `gobmg-${num || index}-${oriente}`,
      uf,
      oriente,
      nomeExibicao: nomeFormatado,
      numero: num,
    });
  });

  return resultado;
}

const LOJAS_BASE_GOB_MG: LojaCatalogoItem[] = processarLojasGobMinas();

export function carregarLojasCustomizadas(): LojaCatalogoItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOJAS_CUSTOM);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      nomeExibicao: normalizarSiglaArls(item.nomeExibicao || ''),
    }));
  } catch {
    return [];
  }
}

export function salvarNovaLojaCustomizada(nova: Omit<LojaCatalogoItem, 'id'>): LojaCatalogoItem {
  const atuais = carregarLojasCustomizadas();
  const itemCompleto: LojaCatalogoItem = {
    ...nova,
    id: `custom-${Date.now()}`,
    uf: nova.uf.trim().toUpperCase(),
    oriente: nova.oriente.trim().toUpperCase(),
    nomeExibicao: normalizarSiglaArls(nova.nomeExibicao),
  };
  const atualizadas = [itemCompleto, ...atuais];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LOJAS_CUSTOM, JSON.stringify(atualizadas));
  }
  return itemCompleto;
}

export function obterCatalogoCompletoLojas(): LojaCatalogoItem[] {
  const custom = carregarLojasCustomizadas();
  return [...custom, ...LOJAS_BASE_GOB_MG];
}

