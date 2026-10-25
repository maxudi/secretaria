import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  BalaustreFormData,
  carregarConfiguracaoLojaSalva,
  carregarDetalhesIrmaosQuadroLocal,
  carregarDiretoriaTitularSalva,
  carregarIrmaosQuadroSalvos,
  carregarUsuariosCimLocal,
  ConfiguracaoLoja,
  DEFAULT_CONFIGURACAO_LOJA,
  DiretoriaTitularMap,
  LojaTenant,
  PapelUsuarioCim,
  salvarConfiguracaoLojaLocal,
  salvarDetalhesIrmaosQuadroLocal,
  salvarDiretoriaTitularLocal,
  salvarIrmaosQuadroLocal,
  salvarSessaoUsuarioLogado,
  salvarUsuariosCimLocal,
  SessaoUsuarioLogado,
  UsuarioCim,
} from '../types/balaustre';
import {
  comporRedacaoItemOrdemDia,
  formatarAutorFalaComCargoOuLoja,
  formatarNomeIrmao,
  gerarTextoLiturgico,
} from '../utils/liturgyFormatter';

export const DEFAULT_LOJA_ALPHA_OMEGA_ID =
  (import.meta.env?.VITE_DEFAULT_LOJA_ID as string | undefined) ||
  '00000000-0000-0000-0000-000000003402';

const rawSupabaseUrl =
  (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ||
  'https://lnharsdbknxwpjcfsahd.supabase.co';
const supabaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/+$/, '');

const supabaseKey =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'sb_publishable_DGa55H4tMOmS1TZQZ_ZIOw_NMAciObX';

export const supabaseClient: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Obtém sincronicamente o último número de Balaústre conhecido localmente para a Loja ativa.
 * Para a Loja 3402 (Alpha e Ômega), parte do último Balaústre cadastrado (57); para novas Lojas, parte de 0.
 */
export function obterUltimoNumeroBalaustreLocal(
  lojaId: string = DEFAULT_LOJA_ALPHA_OMEGA_ID
): number {
  let maior = lojaId === DEFAULT_LOJA_ALPHA_OMEGA_ID ? 57 : 0;
  if (typeof window === 'undefined') return maior;

  try {
    const chavesAntigasDescartar = new Set([
      '53:2026-09-29',
      '55:2026-10-13',
      '56:2026-10-20',
    ]);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('balaustre_3402_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const lojaDoRegistro = parsed?.loja_id || DEFAULT_LOJA_ALPHA_OMEGA_ID;
          if (parsed && parsed.numero_balaustre && lojaDoRegistro === lojaId) {
            if (
              chavesAntigasDescartar.has(
                `${parsed.numero_balaustre}:${parsed.data_sessao}`
              )
            ) {
              continue;
            }
            const num = Number(parsed.numero_balaustre) || 0;
            if (num > maior) maior = num;
          }
        }
      }
    }
  } catch {
    // Ignora falha de leitura local
  }

  return maior;
}

/**
 * Carrega o Quadro de Obreiros, a Diretoria Titular, a Configuração da Loja e o último Nº de Balaústre do Supabase
 * (fazendo fallback seguro para localStorage caso o RLS ainda bloqueie ou esteja offline).
 */
export async function sincronizarDadosIniciaisSupabase(
  lojaId: string = DEFAULT_LOJA_ALPHA_OMEGA_ID
): Promise<{
  irmaos: string[];
  diretoria: DiretoriaTitularMap;
  configLoja?: Partial<ConfiguracaoLoja>;
  ultimoNumeroBalaustre: number;
  sincronizadoNuvem: boolean;
}> {
  const ehLoja3402 = lojaId === DEFAULT_LOJA_ALPHA_OMEGA_ID;
  const irmaosLocal = carregarIrmaosQuadroSalvos(lojaId);
  const diretoriaLocal = carregarDiretoriaTitularSalva(lojaId);
  const ultimoLocal = obterUltimoNumeroBalaustreLocal(lojaId);

  if (!supabaseClient) {
    return {
      irmaos: irmaosLocal,
      diretoria: diretoriaLocal,
      ultimoNumeroBalaustre: ultimoLocal,
      sincronizadoNuvem: false,
    };
  }

  try {
    const [resIrmaos, resDiretoria, resLoja, resUltimoBal] = await Promise.all([
      supabaseClient
        .from('irmaos_quadro')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('ativo', true)
        .order('nome_exibicao', { ascending: true }),
      supabaseClient
        .from('gestoes_diretoria')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('ativa', true)
        .limit(1)
        .maybeSingle(),
      supabaseClient
        .from('lojas')
        .select('*')
        .eq('id', lojaId)
        .maybeSingle(),
      supabaseClient
        .from('balaustres')
        .select('numero_balaustre')
        .eq('loja_id', lojaId)
        .order('numero_balaustre', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let irmaosFinais = irmaosLocal;
    let sincronizado = false;

    if (!resIrmaos.error && Array.isArray(resIrmaos.data)) {
      if (resIrmaos.data.length > 0) {
        irmaosFinais = resIrmaos.data.map((r: any) => String(r.nome_exibicao));
        salvarIrmaosQuadroLocal(irmaosFinais, lojaId);

        const mapaDetalhes = carregarDetalhesIrmaosQuadroLocal();
        for (const r of resIrmaos.data as any[]) {
          const nome = String(r.nome_exibicao);
          const existente = mapaDetalhes[nome];
          const statusBanco =
            r.situacao === 'licenciado' || r.situacao === 'irregular'
              ? r.situacao
              : existente?.status || 'regular';
          const honorarioBanco =
            typeof r.membro_honorario === 'boolean'
              ? r.membro_honorario
              : Boolean(existente?.membroHonorario);

          mapaDetalhes[nome] = {
            cim: r.cim ? String(r.cim) : existente?.cim || '',
            telefone: r.telefone ? String(r.telefone) : existente?.telefone || '',
            status: statusBanco,
            membroHonorario: honorarioBanco,
          };
        }
        salvarDetalhesIrmaosQuadroLocal(mapaDetalhes);
        sincronizado = true;
      } else if (!ehLoja3402) {
        irmaosFinais = [];
        salvarIrmaosQuadroLocal([], lojaId);
      }
    }

    let diretoriaFinal = diretoriaLocal;
    if (!resDiretoria.error && resDiretoria.data) {
      const d = resDiretoria.data as any;
      diretoriaFinal = {
        veneravelMestre:
          d.veneravel_mestre_nome ??
          (ehLoja3402 ? diretoriaLocal.veneravelMestre : ''),
        primeiroVigilante:
          d.primeiro_vigilante_nome ??
          (ehLoja3402 ? diretoriaLocal.primeiroVigilante : ''),
        segundoVigilante:
          d.segundo_vigilante_nome ??
          (ehLoja3402 ? diretoriaLocal.segundoVigilante : ''),
        orador: d.orador_nome ?? (ehLoja3402 ? diretoriaLocal.orador : ''),
        secretario:
          d.secretario_nome ?? (ehLoja3402 ? diretoriaLocal.secretario : ''),
        tesoureiro:
          d.tesoureiro_nome ?? (ehLoja3402 ? diretoriaLocal.tesoureiro : ''),
        chanceler:
          d.chanceler_nome ?? (ehLoja3402 ? diretoriaLocal.chanceler : ''),
        mestreCerimonias:
          d.mestre_cerimonias_nome ??
          (ehLoja3402 ? diretoriaLocal.mestreCerimonias : ''),
        hospitaleiro:
          d.hospitaleiro_nome ?? (ehLoja3402 ? diretoriaLocal.hospitaleiro : ''),
        cobridorInterno:
          d.cobridor_interno_nome ??
          (ehLoja3402 ? diretoriaLocal.cobridorInterno : ''),
      };
      salvarDiretoriaTitularLocal(diretoriaFinal, lojaId);
      sincronizado = true;
    } else if (!resDiretoria.error && !resDiretoria.data && !ehLoja3402) {
      diretoriaFinal = {
        veneravelMestre: '',
        primeiroVigilante: '',
        segundoVigilante: '',
        orador: '',
        secretario: '',
        tesoureiro: '',
        chanceler: '',
        mestreCerimonias: '',
        hospitaleiro: '',
        cobridorInterno: '',
      };
      salvarDiretoriaTitularLocal(diretoriaFinal, lojaId);
    }

    let configLojaNuvem: Partial<ConfiguracaoLoja> | undefined;
    if (!resLoja.error && resLoja.data) {
      const l = resLoja.data as any;
      configLojaNuvem = {
        invocacao: l.invocacao || DEFAULT_CONFIGURACAO_LOJA.invocacao,
        nomeLoja: l.nome_loja || DEFAULT_CONFIGURACAO_LOJA.nomeLoja,
        numeroLoja: l.numero_loja || DEFAULT_CONFIGURACAO_LOJA.numeroLoja,
        potenciaJurisdicao:
          l.potencia_jurisdicao || DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao,
        reunioesDiaHora:
          l.reunioes_dia_hora || DEFAULT_CONFIGURACAO_LOJA.reunioesDiaHora,
        ritoPotencia: l.rito_potencia || DEFAULT_CONFIGURACAO_LOJA.ritoPotencia,
        enderecoTemplo:
          l.endereco_templo || DEFAULT_CONFIGURACAO_LOJA.enderecoTemplo,
        orienteCidadeUf:
          l.oriente_cidade_uf || DEFAULT_CONFIGURACAO_LOJA.orienteCidadeUf,
        emailLoja: l.email_loja || DEFAULT_CONFIGURACAO_LOJA.emailLoja,
        gestao: l.gestao_atual || DEFAULT_CONFIGURACAO_LOJA.gestao,
        logoUrl: l.logo_url || '',
      };
      sincronizado = true;
    }

    const numeroNuvem = Number((resUltimoBal?.data as any)?.numero_balaustre) || 0;
    const ultimoNumeroFinal = Math.max(ultimoLocal, numeroNuvem);

    return {
      irmaos: irmaosFinais,
      diretoria: diretoriaFinal,
      configLoja: configLojaNuvem,
      ultimoNumeroBalaustre: ultimoNumeroFinal,
      sincronizadoNuvem: sincronizado,
    };
  } catch {
    return {
      irmaos: irmaosLocal,
      diretoria: diretoriaLocal,
      ultimoNumeroBalaustre: ultimoLocal,
      sincronizadoNuvem: false,
    };
  }
}

/**
 * Salva o Quadro de Obreiros e a Diretoria Titular no localStorage e sincroniza com o Supabase.
 */
export async function salvarQuadroEDiretoriaSupabase(params: {
  irmaos: string[];
  diretoria: DiretoriaTitularMap;
  periodoGestao: string;
  lojaId?: string;
}): Promise<{ salvouNuvem: boolean; mensagem: string }> {
  const lojaId = params.lojaId || DEFAULT_LOJA_ALPHA_OMEGA_ID;
  const irmaosOrdenados = [...params.irmaos].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  // 1. Salva sempre no localStorage imediatamente (isolado por lojaId)
  salvarIrmaosQuadroLocal(irmaosOrdenados, lojaId);
  salvarDiretoriaTitularLocal(params.diretoria, lojaId);

  if (!supabaseClient) {
    return {
      salvouNuvem: false,
      mensagem: 'Quadro e Diretoria salvos localmente!',
    };
  }

  try {
    const periodoLimpo =
      params.periodoGestao.replace(/^gest[aã]o\s*:?\s*/i, '').trim() ||
      '2025-2027';

    // 2. Atualiza a Diretoria Titular na tabela `gestoes_diretoria`
    const { error: errDir } = await supabaseClient
      .from('gestoes_diretoria')
      .upsert(
        {
          loja_id: lojaId,
          periodo_gestao: periodoLimpo,
          ativa: true,
          veneravel_mestre_nome: params.diretoria.veneravelMestre,
          primeiro_vigilante_nome: params.diretoria.primeiroVigilante,
          segundo_vigilante_nome: params.diretoria.segundoVigilante,
          orador_nome: params.diretoria.orador,
          secretario_nome: params.diretoria.secretario,
          tesoureiro_nome: params.diretoria.tesoureiro,
          chanceler_nome: params.diretoria.chanceler,
          mestre_cerimonias_nome: params.diretoria.mestreCerimonias,
          hospitaleiro_nome: params.diretoria.hospitaleiro,
          cobridor_interno_nome: params.diretoria.cobridorInterno,
        },
        { onConflict: 'loja_id,periodo_gestao' }
      );

    // 3. Sincroniza os Irmãos do Quadro na tabela `irmaos_quadro` (incluindo CIM, Telefone, Status e Membro Honorário)
    const mapaDetalhes = carregarDetalhesIrmaosQuadroLocal();
    const rowsIrmaosComHonorario = irmaosOrdenados.map((nomeExibicao) => {
      const det = mapaDetalhes[nomeExibicao];
      const situacaoValida =
        det?.status === 'licenciado' || det?.status === 'irregular'
          ? det.status
          : ('regular' as const);
      return {
        loja_id: lojaId,
        nome_exibicao: nomeExibicao,
        nome_civil: nomeExibicao.replace(/^Ir∴\s*/i, '').trim(),
        cim: det?.cim?.trim() || null,
        telefone: det?.telefone?.trim() || null,
        grau: 'mestre' as const,
        situacao: situacaoValida,
        membro_honorario: Boolean(det?.membroHonorario),
        ativo: true,
      };
    });

    let { error: errIrmaos } = await supabaseClient
      .from('irmaos_quadro')
      .upsert(rowsIrmaosComHonorario, { onConflict: 'loja_id,nome_exibicao' });

    // Caso a coluna `membro_honorario` ainda não tenha sido adicionada no banco, grava sem ela
    if (errIrmaos) {
      const rowsSemColunaExtra = rowsIrmaosComHonorario.map(
        ({ membro_honorario: _mh, ...resto }) => resto
      );
      const retry = await supabaseClient
        .from('irmaos_quadro')
        .upsert(rowsSemColunaExtra, { onConflict: 'loja_id,nome_exibicao' });
      errIrmaos = retry.error;
    }

    // Desativa irmãos que foram removidos da lista
    await supabaseClient
      .from('irmaos_quadro')
      .update({ ativo: false })
      .eq('loja_id', lojaId)
      .not('nome_exibicao', 'in', `(${irmaosOrdenados.map((i) => `"${i.replace(/"/g, '')}"`).join(',')})`);

    // Atualiza também gestao_atual na tabela `lojas`
    await supabaseClient
      .from('lojas')
      .update({ gestao_atual: periodoLimpo })
      .eq('id', lojaId);

    if (errDir || errIrmaos) {
      return {
        salvouNuvem: false,
        mensagem:
          'Quadro e Diretoria salvos localmente (execute a Migration 005 no SQL Editor do Supabase para liberar a gravação em nuvem).',
      };
    }

    return {
      salvouNuvem: true,
      mensagem: `Quadro (${irmaosOrdenados.length} Irmãos) e Diretoria (${periodoLimpo}) sincronizados com sucesso no Supabase!`,
    };
  } catch {
    return {
      salvouNuvem: false,
      mensagem: 'Quadro e Diretoria salvos localmente!',
    };
  }
}

/**
 * Grava imediatamente no banco `public.irmaos_quadro` do Supabase os dados de um Irmão
 * (Nome, CIM, Telefone, Situação Regular/Licenciado/Irregular e Membro Honorário).
 */
export async function sincronizarIrmaoIndividualSupabase(params: {
  nomeExibicao: string;
  nomeAntigo?: string;
  cim?: string;
  telefone?: string;
  status?: 'regular' | 'licenciado' | 'irregular';
  membroHonorario?: boolean;
  lojaId?: string;
}): Promise<{ salvouNuvem: boolean; erro?: string }> {
  if (!supabaseClient) return { salvouNuvem: false };
  const lojaId = params.lojaId || DEFAULT_LOJA_ALPHA_OMEGA_ID;

  try {
    // Se mudou o nome do Irmão, desativa/atualiza o registro antigo
    if (params.nomeAntigo && params.nomeAntigo !== params.nomeExibicao) {
      await supabaseClient
        .from('irmaos_quadro')
        .delete()
        .eq('loja_id', lojaId)
        .eq('nome_exibicao', params.nomeAntigo);
    }

    const payloadCompleto = {
      loja_id: lojaId,
      nome_exibicao: params.nomeExibicao,
      nome_civil: params.nomeExibicao.replace(/^Ir∴\s*/i, '').trim(),
      cim: params.cim?.trim() || null,
      telefone: params.telefone?.trim() || null,
      grau: 'mestre' as const,
      situacao: params.status || ('regular' as const),
      membro_honorario: Boolean(params.membroHonorario),
      ativo: true,
    };

    const { error } = await supabaseClient
      .from('irmaos_quadro')
      .upsert(payloadCompleto, { onConflict: 'loja_id,nome_exibicao' });

    if (error) {
      return { salvouNuvem: false, erro: error.message };
    }
    return { salvouNuvem: true };
  } catch (err: any) {
    return { salvouNuvem: false, erro: err?.message };
  }
}

/**
 * Faz o upload da Logomarca da Loja diretamente para o bucket `logomarcas` no Supabase Storage
 * e retorna a URL pública da imagem (com fallback em Base64 caso o bucket esteja sem permissão RLS).
 */
export async function uploadLogoLojaSupabase(
  file: File,
  lojaId: string = DEFAULT_LOJA_ALPHA_OMEGA_ID
): Promise<{
  url: string;
  salvouBucket: boolean;
  mensagem: string;
}> {
  const lerComoDataUrl = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao ler imagem local'));
      reader.readAsDataURL(file);
    });

  if (!supabaseClient) {
    const dataUrl = await lerComoDataUrl();
    return {
      url: dataUrl,
      salvouBucket: false,
      mensagem: 'Imagem carregada localmente.',
    };
  }

  try {
    const ext =
      file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
      'png';
    const filePath = `lojas/${lojaId}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('logomarcas')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/png',
      });

    if (uploadError) {
      const dataUrl = await lerComoDataUrl();
      return {
        url: dataUrl,
        salvouBucket: false,
        mensagem: `Imagem aplicada (execute a Migration 006 no Supabase para liberar gravação direta no bucket 'logomarcas': ${uploadError.message}).`,
      };
    }

    const { data: pubData } = supabaseClient.storage
      .from('logomarcas')
      .getPublicUrl(filePath);

    const publicUrl = pubData?.publicUrl || '';
    if (publicUrl) {
      await supabaseClient
        .from('lojas')
        .update({ logo_url: publicUrl })
        .eq('id', lojaId);
      return {
        url: publicUrl,
        salvouBucket: true,
        mensagem:
          'Logomarca enviada com sucesso para o bucket "logomarcas" no Supabase!',
      };
    }

    const fallbackUrl = await lerComoDataUrl();
    return {
      url: fallbackUrl,
      salvouBucket: false,
      mensagem: 'Logomarca carregada.',
    };
  } catch (err: any) {
    const fallbackUrl = await lerComoDataUrl();
    return {
      url: fallbackUrl,
      salvouBucket: false,
      mensagem: `Logomarca carregada localmente (${err?.message || 'erro no storage'}).`,
    };
  }
}

/**
 * Salva as configurações de cabeçalho e logomarca da Loja no localStorage e na tabela `public.lojas` do Supabase.
 */
export async function salvarConfiguracaoLojaSupabase(
  config: ConfiguracaoLoja,
  lojaId: string = DEFAULT_LOJA_ALPHA_OMEGA_ID
): Promise<void> {
  salvarConfiguracaoLojaLocal(config);
  if (!supabaseClient) return;

  try {
    const slugGerado =
      `${config.nomeLoja}-${config.numeroLoja}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `loja-${config.numeroLoja}`;

    await supabaseClient.from('lojas').upsert(
      {
        id: lojaId,
        slug:
          lojaId === DEFAULT_LOJA_ALPHA_OMEGA_ID
            ? 'alpha-e-omega-3402'
            : slugGerado,
        invocacao: config.invocacao || DEFAULT_CONFIGURACAO_LOJA.invocacao,
        nome_loja: config.nomeLoja,
        numero_loja: config.numeroLoja,
        potencia_jurisdicao:
          config.potenciaJurisdicao ||
          DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao,
        reunioes_dia_hora:
          config.reunioesDiaHora || DEFAULT_CONFIGURACAO_LOJA.reunioesDiaHora,
        rito_potencia:
          config.ritoPotencia || DEFAULT_CONFIGURACAO_LOJA.ritoPotencia,
        endereco_templo: config.enderecoTemplo,
        oriente_cidade_uf: config.orienteCidadeUf,
        email_loja: config.emailLoja || null,
        gestao_atual: config.gestao || '2025-2027',
        logo_url: config.logoUrl || null,
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('Aviso ao sincronizar configuração da Loja com Supabase:', err);
  }
}

/**
 * Representa o registro persistido na tabela `public.balaustres` do PostgreSQL / Supabase.
 */
export interface BalaustreSupabaseRow {
  id?: string;
  loja_id: string;
  numero_balaustre: number;
  periodo_gestao: string;
  data_sessao: string;
  horario_abertura: string;
  horario_encerramento: string;
  grau_trabalhos: BalaustreFormData['grauTrabalhos'];
  tipo_sessao: BalaustreFormData['tipoSessao'];
  qtd_quadro_presentes: number;
  qtd_visitantes_presentes: number;
  saco_propostas_resultado_geral: string | null;
  instrucao_tema_titulo: string | null;
  instrucao_apresentador_nome: string | null;
  instrucao_resumo: string | null;
  tronco_valor_apurado: string;
  tronco_valor_por_extenso: string;
  tronco_destino: string | null;
  texto_consolidado_item8: string | null;
  palavra_orador: string | null;
  palavra_veneravel_mestre: string | null;
  emendas_ressalvas_final: string | null;
  configuracao_loja_json: BalaustreFormData['configuracaoLoja'];
  cargos_json: BalaustreFormData['cargos'];
  balaustres_lidos_json: BalaustreFormData['balaustresLidos'];
  expedientes_json: BalaustreFormData['expedientesRecebidos'];
  saco_propostas_itens_json: BalaustreFormData['itensSacoPropostas'];
  ordem_dia_json: BalaustreFormData['itensOrdemDia'];
  tempo_instrucao_json: BalaustreFormData['tempoInstrucao'];
  palavra_bem_da_ordem_json: BalaustreFormData['palavraBemDaOrdem'];
  texto_liturgico_gerado: string;
  created_at?: string;
}

/**
 * Converte os dados tipados do formulário para o payload relacional + JSONB do PostgreSQL/Supabase.
 */
export function mapFormDataToSupabaseRow(
  data: BalaustreFormData,
  lojaId: string = DEFAULT_LOJA_ALPHA_OMEGA_ID
): BalaustreSupabaseRow {
  const gestao =
    (
      data.configuracaoLoja?.gestao ||
      DEFAULT_CONFIGURACAO_LOJA.gestao ||
      '2025-2027'
    )
      .replace(/^gest[aã]o\s*:?\s*/i, '')
      .trim() || '2025-2027';

  const apresentadorInstrucao = data.tempoInstrucao.apresentadorSelecionado
    ? formatarNomeIrmao(
        data.tempoInstrucao.apresentadorSelecionado,
        data.tempoInstrucao.apresentadorOutro
      )
    : null;

  return {
    loja_id: lojaId,
    numero_balaustre: data.numeroBalaustre,
    periodo_gestao: gestao,
    data_sessao: data.dataSessao,
    horario_abertura: data.horarioAbertura,
    horario_encerramento: data.horarioEncerramento,
    grau_trabalhos: data.grauTrabalhos,
    tipo_sessao: data.tipoSessao,
    qtd_quadro_presentes: data.quorum.qtdQuadroPresentes,
    qtd_visitantes_presentes: data.quorum.qtdVisitantesPresentes,
    saco_propostas_resultado_geral: data.sacoPropostasResultadoGeral || null,
    instrucao_tema_titulo: data.tempoInstrucao.temaTitulo || null,
    instrucao_apresentador_nome: apresentadorInstrucao,
    instrucao_resumo: data.tempoInstrucao.resumoInstrucao || null,
    tronco_valor_apurado: data.troncoBeneficencia.valorApurado,
    tronco_valor_por_extenso:
      data.troncoBeneficencia.valorPorExtenso || 'zero reais',
    tronco_destino: data.troncoBeneficencia.destinoConferencia || null,
    texto_consolidado_item8:
      data.palavraBemDaOrdem.textoConsolidadoAta || null,
    palavra_orador: data.palavraBemDaOrdem.palavraOrador || null,
    palavra_veneravel_mestre:
      data.palavraBemDaOrdem.palavraVeneravelMestre || null,
    emendas_ressalvas_final: null,
    configuracao_loja_json: data.configuracaoLoja,
    cargos_json: data.cargos,
    balaustres_lidos_json: data.balaustresLidos,
    expedientes_json: data.expedientesRecebidos,
    saco_propostas_itens_json: data.itensSacoPropostas,
    ordem_dia_json: data.itensOrdemDia,
    tempo_instrucao_json: data.tempoInstrucao,
    palavra_bem_da_ordem_json: data.palavraBemDaOrdem,
    texto_liturgico_gerado: gerarTextoLiturgico(data),
  };
}

/**
 * Grava o Balaústre e suas tabelas filhas relacionais no Supabase (ou em fallback local caso .env não esteja ativo).
 */
export async function salvarBalaustreSupabase(
  data: BalaustreFormData,
  lojaId: string = DEFAULT_LOJA_ALPHA_OMEGA_ID
): Promise<{ success: boolean; row: BalaustreSupabaseRow; message: string }> {
  const payload = mapFormDataToSupabaseRow(data, lojaId);

  if (supabaseClient) {
    const { data: savedRow, error } = await supabaseClient
      .from('balaustres')
      .upsert(payload, {
        onConflict: 'loja_id,numero_balaustre,periodo_gestao',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar no Supabase: ${error.message}`);
    }

    const balaustreId = savedRow?.id;

    // Sincroniza também as tabelas relacionais filhas caso o ID tenha sido retornado
    if (balaustreId) {
      // 1. Balaústres lidos (Item 4.1)
      await supabaseClient
        .from('balaustres_lidos_sessao')
        .delete()
        .eq('balaustre_id', balaustreId);

      if (data.balaustresLidos.length > 0) {
        await supabaseClient.from('balaustres_lidos_sessao').insert(
          data.balaustresLidos.map((b, i) => ({
            balaustre_id: balaustreId,
            loja_id: lojaId,
            numero_balaustre_lido: b.numero,
            periodo_gestao: payload.periodo_gestao,
            status_aprovacao: b.statusAprovacao,
            emendas_observacao: b.emendasObservacao || null,
            ordem: i + 1,
          }))
        );
      }

      // 2. Expedientes recebidos (Item 4.2)
      await supabaseClient
        .from('balaustre_expedientes')
        .delete()
        .eq('balaustre_id', balaustreId);

      if (data.expedientesRecebidos.length > 0) {
        await supabaseClient.from('balaustre_expedientes').insert(
          data.expedientesRecebidos.map((e, i) => ({
            balaustre_id: balaustreId,
            loja_id: lojaId,
            tipo_expediente: e.tipoExpediente || 'normal',
            subtipo_convite: e.subtipoConvite || null,
            nomes_candidatos: e.nomesCandidatos || null,
            nome_irmao: e.nomeIrmao || null,
            outro_detalhe_convite: e.outroDetalheConvite || null,
            loja_remetente: e.lojaConvite || null,
            oriente_remetente: e.orienteConvite || null,
            data_evento: e.dataEvento || null,
            hora_evento: e.horaEvento || null,
            endereco_evento: e.enderecoEvento || null,
            origem_oficio: e.origemOficio || null,
            numero_oficio: e.numeroOficio || null,
            uf_instituicao: e.ufInstituicao || null,
            oriente_instituicao: e.orienteInstituicao || null,
            nome_instituicao: e.nomeInstituicao || null,
            nome_pessoa: e.nomePessoa || null,
            classificacao_oficio: e.classificacaoOficio || null,
            outro_tipo_oficio: e.outroTipoOficio || null,
            data_recebimento_oficio: e.dataRecebimentoOficio || null,
            assunto_oficio: e.assuntoOficio || null,
            destino_oficio: e.destinoOficio || null,
            enviado_ordem_dia: Boolean(e.enviadoOrdemDia),
            descricao_final: e.descricao,
            ordem: i + 1,
          }))
        );
      }

      // 3. Ordem do Dia e Escrutínios (Item 6.1)
      await supabaseClient
        .from('balaustre_ordem_dia')
        .delete()
        .eq('balaustre_id', balaustreId);

      if (data.itensOrdemDia.length > 0) {
        await supabaseClient.from('balaustre_ordem_dia').insert(
          data.itensOrdemDia.map((od, i) => ({
            balaustre_id: balaustreId,
            loja_id: lojaId,
            tipo_item: od.tipoItemOrdemDia || 'deliberacao_comum',
            titulo: od.titulo,
            resumo_materia: od.resumoMateria || null,
            objeto_manifestacao: Boolean(od.objetoManifestacao),
            tipo_manifestacao: od.tipoManifestacao || null,
            objeto_votacao: Boolean(od.objetoVotacao),
            resultado_votacao: od.resultadoVotacao || null,
            cenario_escrutinio: od.cenarioEscrutinio || null,
            tipo_processo_escrutinio: od.tipoProcessoEscrutinio || null,
            nome_candidato: od.nomeCandidato || null,
            total_votantes: od.totalVotantes ?? null,
            qtd_esferas_brancas: od.qtdEsferasBrancas ?? null,
            qtd_esferas_pretas: od.qtdEsferasPretas ?? null,
            total_esferas_primeiro_giro: od.totalEsferasPrimeiroGiro ?? null,
            resultado_proclamacao: od.resultadoProclamacao || null,
            prazo_dias_justificativa: od.prazoDiasJustificativa || null,
            data_sessao_anterior: od.dataSessaoAnterior || null,
            status_justificativa: od.statusJustificativa || null,
            texto_redacao_final:
              od.textoRedacaoFinal?.trim() || comporRedacaoItemOrdemDia(od),
            ordem: i + 1,
          }))
        );
      }

      // 4. Manifestações nas Colunas e Altar (Item 8)
      await supabaseClient
        .from('balaustre_manifestacoes_colunas')
        .delete()
        .eq('balaustre_id', balaustreId);

      const mapaColunas: {
        coluna: 'sul' | 'norte' | 'oriente' | 'altar';
        itens: BalaustreFormData['palavraBemDaOrdem']['colunaSul'];
      }[] = [
        { coluna: 'sul', itens: data.palavraBemDaOrdem.colunaSul || [] },
        { coluna: 'norte', itens: data.palavraBemDaOrdem.colunaNorte || [] },
        {
          coluna: 'oriente',
          itens: data.palavraBemDaOrdem.colunaOriente || [],
        },
        { coluna: 'altar', itens: data.palavraBemDaOrdem.colunaAltar || [] },
      ];

      const falasParaInserir = mapaColunas.flatMap(({ coluna, itens }) =>
        itens.map((f, i) => ({
          balaustre_id: balaustreId,
          loja_id: lojaId,
          coluna,
          irmao_nome: formatarAutorFalaComCargoOuLoja(f, data.cargos),
          eh_visitante: f.irmaoSelecionado === 'outro',
          loja_visitante: f.lojaVisitante || null,
          oriente_visitante: f.orienteVisitante || null,
          cargo_na_sessao: f.cargoIrmao || null,
          resumo_fala: f.resumoFala,
          ordem: i + 1,
        }))
      );

      if (falasParaInserir.length > 0) {
        await supabaseClient
          .from('balaustre_manifestacoes_colunas')
          .insert(falasParaInserir);
      }
    }

    // Guarda também no cache local para consulta rápida
    localStorage.setItem(
      `balaustre_3402_${data.numeroBalaustre}`,
      JSON.stringify(savedRow ?? payload)
    );
    localStorage.setItem(
      'ultimo_numero_balaustre_3402',
      String(data.numeroBalaustre)
    );

    return {
      success: true,
      row: savedRow ?? payload,
      message: `Balaústre Nº ${data.numeroBalaustre}-${payload.periodo_gestao} gravado com sucesso no banco de dados Supabase!`,
    };
  }

  // Fallback local (localStorage) enquanto variáveis .env não estão definidas
  await new Promise((resolve) => setTimeout(resolve, 400));
  localStorage.setItem(
    `balaustre_3402_${data.numeroBalaustre}`,
    JSON.stringify(payload)
  );
  localStorage.setItem(
    'ultimo_numero_balaustre_3402',
    String(data.numeroBalaustre)
  );

  return {
    success: true,
    row: payload,
    message: `Balaústre Nº ${data.numeroBalaustre}-${payload.periodo_gestao} validado e salvo localmente (configure VITE_SUPABASE_URL no .env para persistência em nuvem).`,
  };
}

// ============================================================================
// ETAPA 3: AUTENTICAÇÃO POR CIM E HISTÓRICO DE BALAÚSTRES
// ============================================================================

/**
 * Carrega a lista de credenciais CIM da Loja no Supabase (`public.usuarios_cim`) com fallback local.
 */
export async function carregarUsuariosCimSupabase(
  lojaId: string = DEFAULT_LOJA_ALPHA_OMEGA_ID
): Promise<UsuarioCim[]> {
  const local = carregarUsuariosCimLocal();
  if (!supabaseClient) return local;

  try {
    const { data, error } = await supabaseClient
      .from('usuarios_cim')
      .select('*')
      .eq('loja_id', lojaId)
      .order('cim', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const lista: UsuarioCim[] = data.map((r: any) => ({
        id: r.id,
        cim: String(r.cim),
        irmaoNome: String(r.irmao_nome),
        papel: (r.papel || 'secretario') as PapelUsuarioCim,
        senhaAcesso: String(r.senha_acesso || ''),
        ativo: Boolean(r.ativo ?? true),
        ultimoAcesso: r.ultimo_acesso || undefined,
      }));
      salvarUsuariosCimLocal(lista);
      return lista;
    }
    return local;
  } catch {
    return local;
  }
}

/**
 * Salva/sincroniza os acessos por CIM no localStorage e na tabela `public.usuarios_cim` do Supabase.
 */
export async function salvarUsuariosCimSupabase(
  usuarios: UsuarioCim[],
  lojaId: string = DEFAULT_LOJA_ALPHA_OMEGA_ID
): Promise<{ salvouNuvem: boolean; mensagem: string }> {
  salvarUsuariosCimLocal(usuarios);

  if (!supabaseClient) {
    return {
      salvouNuvem: false,
      mensagem: 'Credenciais CIM salvas localmente!',
    };
  }

  try {
    const rows = usuarios.map((u) => ({
      loja_id: lojaId,
      cim: u.cim.trim(),
      irmao_nome: u.irmaoNome,
      papel: u.papel,
      senha_acesso: u.senhaAcesso,
      ativo: u.ativo,
    }));

    const { error } = await supabaseClient
      .from('usuarios_cim')
      .upsert(rows, { onConflict: 'loja_id,cim' });

    if (error) {
      return {
        salvouNuvem: false,
        mensagem:
          'Acessos CIM salvos localmente (rode a Migration 005 no Supabase para criar a tabela `usuarios_cim` em nuvem).',
      };
    }

    return {
      salvouNuvem: true,
      mensagem: `Acessos CIM (${usuarios.length}) sincronizados com sucesso no Supabase!`,
    };
  } catch {
    return {
      salvouNuvem: false,
      mensagem: 'Credenciais CIM salvas localmente!',
    };
  }
}

/**
 * Autentica um Irmão pelo seu Número CIM e Senha de Acesso (Multi-Tenant).
 * Identifica automaticamente a qual Loja (`loja_id`) pertence o CIM no Supabase
 * (ou autentica como `super_admin` para gestão de todas as Lojas).
 */
export async function autenticarPorCim(
  cimDigitado: string,
  senhaDigitada: string,
  lojaIdPreferencial?: string
): Promise<{
  sucesso: boolean;
  sessao?: SessaoUsuarioLogado;
  mensagem: string;
}> {
  const cimLimpo = cimDigitado.trim();
  const senhaLimpa = senhaDigitada.trim();

  if (!cimLimpo || !senhaLimpa) {
    return {
      sucesso: false,
      mensagem: 'Informe o número do CIM e a senha de acesso.',
    };
  }

  let usuarioEncontrado:
    | (UsuarioCim & { lojaId: string; nomeLoja?: string; numeroLoja?: string })
    | undefined;

  // 1. Consulta diretamente na tabela `usuarios_cim` do Supabase (Multi-Tenant: busca em todas as Lojas)
  if (supabaseClient) {
    try {
      const { data: rowsCim, error } = await supabaseClient
        .from('usuarios_cim')
        .select('*')
        .eq('cim', cimLimpo)
        .eq('ativo', true);

      if (!error && Array.isArray(rowsCim) && rowsCim.length > 0) {
        const matchRow =
          (lojaIdPreferencial
            ? rowsCim.find((r: any) => r.loja_id === lojaIdPreferencial)
            : undefined) || rowsCim[0];

        if (matchRow) {
          // Busca informações da Loja vinculada a este CIM
          const { data: lojaRow } = await supabaseClient
            .from('lojas')
            .select('*')
            .eq('id', matchRow.loja_id)
            .maybeSingle();

          if (
            lojaRow &&
            (lojaRow.ativo === false || lojaRow.ativa === false) &&
            matchRow.papel !== 'super_admin'
          ) {
            return {
              sucesso: false,
              mensagem: `A assinatura/acesso da ${lojaRow.nome_loja} Nº ${lojaRow.numero_loja} encontra-se suspensa pelo Super Administrador.`,
            };
          }

          usuarioEncontrado = {
            id: matchRow.id,
            cim: String(matchRow.cim),
            irmaoNome: String(matchRow.irmao_nome),
            papel: (matchRow.papel || 'secretario') as PapelUsuarioCim,
            senhaAcesso: String(matchRow.senha_acesso || ''),
            ativo: Boolean(matchRow.ativo ?? true),
            lojaId: String(matchRow.loja_id || DEFAULT_LOJA_ALPHA_OMEGA_ID),
            nomeLoja: lojaRow?.nome_loja || undefined,
            numeroLoja: lojaRow?.numero_loja || undefined,
          };
        }
      }
    } catch {
      // Fallback para lista local
    }
  }

  // 2. Fallback para lista local (incluindo CIM 3402 e Super Admin 99999)
  if (!usuarioEncontrado) {
    const listaLocal = carregarUsuariosCimLocal();
    const localMatch = listaLocal.find(
      (u) => u.cim.trim() === cimLimpo && u.ativo !== false
    );
    if (localMatch) {
      usuarioEncontrado = {
        ...localMatch,
        lojaId: lojaIdPreferencial || DEFAULT_LOJA_ALPHA_OMEGA_ID,
      };
    }
  }

  if (!usuarioEncontrado) {
    return {
      sucesso: false,
      mensagem: `CIM "${cimLimpo}" não encontrado ou inativo no Quadro de Acessos.`,
    };
  }

  if (usuarioEncontrado.senhaAcesso !== senhaLimpa) {
    return {
      sucesso: false,
      mensagem: 'Senha de acesso incorreta para o CIM informado.',
    };
  }

  const sessao: SessaoUsuarioLogado = {
    cim: usuarioEncontrado.cim,
    irmaoNome: usuarioEncontrado.irmaoNome,
    papel: usuarioEncontrado.papel,
    lojaId: usuarioEncontrado.lojaId,
    nomeLoja: usuarioEncontrado.nomeLoja,
    numeroLoja: usuarioEncontrado.numeroLoja,
    autenticadoEm: new Date().toISOString(),
  };

  salvarSessaoUsuarioLogado(sessao);

  // Registra o timestamp de último acesso no Supabase em background
  if (supabaseClient) {
    supabaseClient
      .from('usuarios_cim')
      .update({ ultimo_acesso: sessao.autenticadoEm })
      .eq('loja_id', sessao.lojaId)
      .eq('cim', usuarioEncontrado.cim)
      .then(() => {});
  }

  return {
    sucesso: true,
    sessao,
    mensagem: `Bem-vindo, ${usuarioEncontrado.irmaoNome} (CIM ${usuarioEncontrado.cim})!`,
  };
}

// ============================================================================
// GESTÃO MULTI-TENANT DE LOJAS E USUÁRIOS ADMIN (SUPER USUÁRIO)
// ============================================================================

const STORAGE_KEY_LOJAS_TENANTS = 'secretaria_lojas_tenants_v1';

const LOJA_PADRAO_TENANT: LojaTenant = {
  id: DEFAULT_LOJA_ALPHA_OMEGA_ID,
  slug: 'alpha-e-omega-3402',
  invocacao: DEFAULT_CONFIGURACAO_LOJA.invocacao || 'À Gl∴ do Supr∴ Arq∴ do Univ∴',
  nomeLoja: DEFAULT_CONFIGURACAO_LOJA.nomeLoja,
  numeroLoja: DEFAULT_CONFIGURACAO_LOJA.numeroLoja,
  potenciaJurisdicao:
    DEFAULT_CONFIGURACAO_LOJA.potenciaJurisdicao ||
    'Jurisdicionada ao GRANDE ORIENTE DO BRASIL',
  reunioesDiaHora:
    DEFAULT_CONFIGURACAO_LOJA.reunioesDiaHora ||
    'Reuniões às terças-feiras – 20:00 horas',
  ritoPotencia: DEFAULT_CONFIGURACAO_LOJA.ritoPotencia || 'RITO BRASILEIRO',
  enderecoTemplo: DEFAULT_CONFIGURACAO_LOJA.enderecoTemplo,
  orienteCidadeUf: DEFAULT_CONFIGURACAO_LOJA.orienteCidadeUf,
  emailLoja: DEFAULT_CONFIGURACAO_LOJA.emailLoja || '',
  gestao: DEFAULT_CONFIGURACAO_LOJA.gestao || '2025-2027',
  logoUrl: DEFAULT_CONFIGURACAO_LOJA.logoUrl || '',
  ativa: true,
};

export async function listarTodasLojasTenantSupabase(): Promise<LojaTenant[]> {
  let lojasLocais: LojaTenant[] = [LOJA_PADRAO_TENANT];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOJAS_TENANTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        lojasLocais = parsed;
      }
    }
  } catch {
    // Ignora erro local
  }

  if (!supabaseClient) return lojasLocais;

  try {
    const { data, error } = await supabaseClient
      .from('lojas')
      .select('*')
      .order('numero_loja', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapeadas: LojaTenant[] = data.map((l: any) => ({
        id: String(l.id),
        slug: String(l.slug || ''),
        invocacao:
          l.invocacao ||
          DEFAULT_CONFIGURACAO_LOJA.invocacao ||
          'À Gl∴ do Supr∴ Arq∴ do Univ∴',
        nomeLoja: String(l.nome_loja || ''),
        numeroLoja: String(l.numero_loja || ''),
        potenciaJurisdicao: String(
          l.potencia_jurisdicao || 'Jurisdicionada ao GRANDE ORIENTE DO BRASIL'
        ),
        reunioesDiaHora: String(
          l.reunioes_dia_hora || 'Reuniões às terças-feiras – 20:00 horas'
        ),
        ritoPotencia: String(l.rito_potencia || 'RITO BRASILEIRO'),
        enderecoTemplo: String(l.endereco_templo || ''),
        orienteCidadeUf: String(l.oriente_cidade_uf || ''),
        emailLoja: String(l.email_loja || ''),
        gestao: String(l.gestao_atual || '2025-2027'),
        logoUrl: String(l.logo_url || ''),
        ativa: l.ativo !== false && l.ativa !== false,
        createdAt: l.created_at,
      }));
      localStorage.setItem(STORAGE_KEY_LOJAS_TENANTS, JSON.stringify(mapeadas));
      return mapeadas;
    }
  } catch {
    // Fallback local
  }

  return lojasLocais;
}

/**
 * Cadastra (ou atualiza) uma Loja Cliente no sistema Multi-Tenant, faz upload opcional da Logomarca
 * no bucket `logomarcas` e já gera automaticamente o Usuário Admin da Loja (`secretario` ou `veneravel`)
 * na tabela `usuarios_cim` + `irmaos_quadro`.
 */
export async function criarOuAtualizarLojaComAdminSupabase(params: {
  id?: string;
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
  adminCim?: string;
  adminNome?: string;
  adminPapel?: 'secretario' | 'veneravel';
  adminSenha?: string;
  adminTelefone?: string;
}): Promise<{
  sucesso: boolean;
  loja?: LojaTenant;
  mensagem: string;
}> {
  const lojaId =
    params.id ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`);

  const slug =
    `${params.nomeLoja}-${params.numeroLoja}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `loja-${params.numeroLoja}`;

  const novaLoja: LojaTenant = {
    id: lojaId,
    slug,
    invocacao: 'À Gl∴ do Supr∴ Arq∴ do Univ∴',
    nomeLoja: params.nomeLoja.trim().toUpperCase(),
    numeroLoja: params.numeroLoja.trim(),
    potenciaJurisdicao:
      params.potenciaJurisdicao.trim() ||
      'Jurisdicionada ao GRANDE ORIENTE DO BRASIL',
    reunioesDiaHora:
      params.reunioesDiaHora.trim() ||
      'Reuniões às terças-feiras – 20:00 horas',
    ritoPotencia:
      params.ritoPotencia.trim().toUpperCase() || 'RITO BRASILEIRO',
    enderecoTemplo: params.enderecoTemplo.trim(),
    orienteCidadeUf: params.orienteCidadeUf.trim(),
    emailLoja: params.emailLoja.trim(),
    gestao: params.gestao.trim() || '2025-2027',
    logoUrl: params.logoUrl.trim(),
    ativa: true,
  };

  // Atualiza cache local de Lojas
  const listaAtual = await listarTodasLojasTenantSupabase();
  const novaLista = [
    ...listaAtual.filter((l) => l.id !== lojaId),
    novaLoja,
  ];
  localStorage.setItem(STORAGE_KEY_LOJAS_TENANTS, JSON.stringify(novaLista));

  if (!supabaseClient) {
    return {
      sucesso: true,
      loja: novaLoja,
      mensagem: `Loja ${novaLoja.nomeLoja} Nº ${novaLoja.numeroLoja} salva localmente!`,
    };
  }

  try {
    // 1. Grava ou atualiza na tabela `public.lojas`
    const { error: errLoja } = await supabaseClient.from('lojas').upsert(
      {
        id: novaLoja.id,
        slug: novaLoja.slug,
        invocacao: novaLoja.invocacao,
        nome_loja: novaLoja.nomeLoja,
        numero_loja: novaLoja.numeroLoja,
        potencia_jurisdicao: novaLoja.potenciaJurisdicao,
        reunioes_dia_hora: novaLoja.reunioesDiaHora,
        rito_potencia: novaLoja.ritoPotencia,
        endereco_templo: novaLoja.enderecoTemplo,
        oriente_cidade_uf: novaLoja.orienteCidadeUf,
        email_loja: novaLoja.emailLoja || null,
        gestao_atual: novaLoja.gestao,
        logo_url: novaLoja.logoUrl || null,
        ativo: true,
      },
      { onConflict: 'id' }
    );

    if (errLoja) {
      return {
        sucesso: false,
        loja: novaLoja,
        mensagem: `Erro ao gravar Loja no Supabase: ${errLoja.message} (verifique se executou a Migration 006).`,
      };
    }

    // 2. Se informou dados do Admin da Loja (CIM + Nome + Senha), cadastra no Quadro, Diretoria e `usuarios_cim`
    if (params.adminCim?.trim() && params.adminSenha?.trim()) {
      const cimAdmin = params.adminCim.trim();
      const rawNome =
        params.adminNome?.trim() ||
        `Admin ${novaLoja.nomeLoja} Nº ${novaLoja.numeroLoja}`;
      const nomeFormatado = rawNome.startsWith('Ir∴')
        ? rawNome
        : `Ir∴ ${rawNome}`;
      const papelAdmin = params.adminPapel || 'secretario';

      // Cadastra o irmão no Quadro daquela Loja
      await supabaseClient.from('irmaos_quadro').upsert(
        {
          loja_id: novaLoja.id,
          nome_exibicao: nomeFormatado,
          nome_civil: nomeFormatado.replace(/^Ir∴\s*/i, '').trim(),
          cim: cimAdmin,
          telefone: params.adminTelefone?.trim() || null,
          grau: 'mestre',
          situacao: 'regular',
          membro_honorario: false,
          ativo: true,
        },
        { onConflict: 'loja_id,nome_exibicao' }
      );

      // Cria a gestão de diretoria inicial da nova Loja se ainda não existir
      await supabaseClient.from('gestoes_diretoria').upsert(
        {
          loja_id: novaLoja.id,
          periodo_gestao: novaLoja.gestao,
          ativa: true,
          veneravel_mestre_nome:
            papelAdmin === 'veneravel' ? nomeFormatado : nomeFormatado,
          primeiro_vigilante_nome: nomeFormatado,
          segundo_vigilante_nome: nomeFormatado,
          orador_nome: nomeFormatado,
          secretario_nome: nomeFormatado,
          tesoureiro_nome: nomeFormatado,
          chanceler_nome: nomeFormatado,
          mestre_cerimonias_nome: nomeFormatado,
          hospitaleiro_nome: nomeFormatado,
          cobridor_interno_nome: nomeFormatado,
        },
        { onConflict: 'loja_id,periodo_gestao' }
      );

      // Cria a credencial de login em `usuarios_cim`
      const { error: errCim } = await supabaseClient
        .from('usuarios_cim')
        .upsert(
          {
            loja_id: novaLoja.id,
            cim: cimAdmin,
            irmao_nome: nomeFormatado,
            papel: papelAdmin,
            senha_acesso: params.adminSenha.trim(),
            ativo: true,
          },
          { onConflict: 'loja_id,cim' }
        );

      if (errCim) {
        return {
          sucesso: true,
          loja: novaLoja,
          mensagem: `Loja cadastrada, mas houve aviso ao criar o CIM Admin: ${errCim.message}`,
        };
      }

      return {
        sucesso: true,
        loja: novaLoja,
        mensagem: `Loja "${novaLoja.nomeLoja} Nº ${novaLoja.numeroLoja}" criada com sucesso e Usuário Admin (CIM: ${cimAdmin} / Senha: ${params.adminSenha.trim()}) liberado!`,
      };
    }

    return {
      sucesso: true,
      loja: novaLoja,
      mensagem: `Dados da "${novaLoja.nomeLoja} Nº ${novaLoja.numeroLoja}" salvos com sucesso no Supabase!`,
    };
  } catch (err: any) {
    return {
      sucesso: false,
      loja: novaLoja,
      mensagem: err?.message || 'Erro ao salvar Loja no Supabase.',
    };
  }
}

export async function alternarStatusLojaTenantSupabase(
  lojaId: string,
  ativa: boolean
): Promise<void> {
  if (!supabaseClient) return;
  await supabaseClient.from('lojas').update({ ativo: ativa }).eq('id', lojaId);
}

const SEED_BALAUSTRE_57_ROW: BalaustreSupabaseRow = {
  loja_id: DEFAULT_LOJA_ALPHA_OMEGA_ID,
  numero_balaustre: 57,
  periodo_gestao: '2025-2027',
  data_sessao: '2026-10-20',
  horario_abertura: '20:00',
  horario_encerramento: '21:58',
  grau_trabalhos: 'aprendiz',
  tipo_sessao: 'ordinaria',
  qtd_quadro_presentes: 18,
  qtd_visitantes_presentes: 0,
  saco_propostas_resultado_geral:
    'O saco de propostas e informações colheu além de bons fluidos 02 colunas gravadas sendo assim decifradas pelo Venerável Mestre como:',
  instrucao_tema_titulo: 'A Convivência Maçônica',
  instrucao_apresentador_nome: 'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
  instrucao_resumo:
    'O irmão discorreu de forma didática sobre preceitos de convivência.',
  tronco_valor_apurado: 'R$ 71,00',
  tronco_valor_por_extenso: 'setenta e um reais',
  tronco_destino: 'A cargo e julgo da hospitalaria',
  texto_consolidado_item8: '',
  palavra_veneravel_mestre:
    'Fez uso da palavra tecendo considerações sobre a peça de arquitetura apresentada pelo Ir∴ Carlos, destacando que mais do que um trabalho formal, tratou-se de uma verdadeira reflexão conduzida com método didático exemplar que manteve a atenção de todos. Enfatizou que postulados como respeito, tolerância, ética e moralidade exigem autenticidade e prática individual primordial, sendo impossível exteriorizá-los sinceramente ao próximo sem antes vivenciá-los de corpo e alma consigo mesmo. Corroborou as preocupações levantadas acerca da proliferação e sustentabilidade das oficinas no Oriente de Uberlândia — que hoje totaliza trinta e três Lojas —, pontuando que muitas enfrentam severas crises e esvaziamento decorrentes de dissidências e repetição de vícios comuns. Revelou o dilema administrativo da Loja, que conta com cerca de seis obreiros afastados que adimplam suas obrigações financeiras mas não comparecem às sessões, gerando uma contradição prática entre o rigor da lei maçônica (que prevê sanções e exclusão por faltas e inadimplência) e a dependência financeira para manutenção do Templo. No tocante à ritualística, ponderou que as falhas recorrentes advêm da carência de instrução e da baixa adesão dos obreiros aos encontros e programas de estudo, como o CEMAP, advertindo que o atingimento do Mestrado ou de graus superiores não exime o maçom de revisitar periodicamente as bases e instruções dos Graus Simbólicos (1, 2 e 3). Ressaltou que correções de postura e liturgia devem ser fraternais e discretas — orientando o Irmão em particular —, a fim de não romper a egrégora do Templo. Agradeceu as ponderações trazidas pelo Ir∴ Luiz Fernando e, dirigindo-se afetuosamente ao Ir∴ Anderson ("Turquinho"), ponderou que a presença física e o compromisso dos obreiros em Loja sobrepõem-se a formalidades menores, concitando todos a trocarem as distrações profanas pelo convívio no Templo, preservando a assiduidade e o cumprimento do Regimento Interno. Renovou agradecimentos a todos que prestigiaram o recente jantar de confraternização da Oficina, ressaltando o clima festivo e harmonioso da ocasião. Por fim, prestando esclarecimentos à indagação do Ir∴ Luciano sobre a atuação da Loja em prol do Ir∴ Paulo, relatou diálogo direto mantido com a irmã do enfermo. Informou que a alta hospitalar está prevista entre quarta e quinta-feira, após o término da antibioticoterapia, salientando que o obreiro apresenta sequelas significativas, episódios de lapsos de memória e ausência de controle esfincteriano, dependendo inteiramente de cuidados contínuos. Detalhou que, em articulação com o Ir∴ Alexandre, foram examinadas alternativas legais e assistenciais, esclarecendo que a família não dispõe de condições de contratar três turnos de cuidadores e que a irmã já se dedica aos cuidados da genitora acamada. Noticiou que a transferência hospitalar foi inviabilizada pela saturação do sistema público e que o paciente será inserido no programa municipal "Melhor em Casa". Alertou a Oficina para a grave lacuna legislativa e assistencial existente para o acolhimento de pessoas na faixa dos dezoito aos cinquenta e nove anos — uma vez que a grande maioria das instituições de longa permanência destina-se exclusivamente a idosos —, servindo de alerta para o planejamento pessoal e familiar de todos os Irmãos. Informou que a família logrou viabilizar vaga em uma clínica adequada, reafirmando que a Loja tem ofertado todo o suporte material, suporte de mobilidade e amparo fraternal ao seu alcance, buscando amenizar o sofrimento vivenciado na Unidade de Atendimento Integrado (UAI) em razão de sua compleição física avantajada. Concluiu exortando os presentes a elevarem vibrações e preces em favor da recuperação do valoroso Irmão e informou que o horário de visitação na UAI Planalto ocorre diariamente das 9h30 às 10h30.',
  palavra_orador:
    'Usando da palavra em conclusão aos trabalhos da ordem do dia, registrou a ausência de Irmãos visitantes na presente sessão, atestando que os trabalhos transcorreram de forma justa, perfeita e dentro da legalidade maçônica.',
  emendas_ressalvas_final: null,
  configuracao_loja_json: DEFAULT_CONFIGURACAO_LOJA,
  cargos_json: {
    veneravelMestre: {
      irmaoSelecionado: 'Ir∴ MARCOS FERREIRA VASCONCELOS',
      nomeOutro: '',
      isTitular: true,
    },
    primeiroVigilante: {
      irmaoSelecionado: 'Ir∴ ISAIAS FERREIRA DOS SANTOS',
      nomeOutro: '',
      isTitular: false,
    },
    segundoVigilante: {
      irmaoSelecionado: 'Ir∴ JOSE RUBENS BUIATTI',
      nomeOutro: '',
      isTitular: false,
    },
    orador: {
      irmaoSelecionado: 'Ir∴ ANDRE LUIZ BORGES',
      nomeOutro: '',
      isTitular: false,
    },
    secretario: {
      irmaoSelecionado: 'Ir∴ MAXIMIANO EDUARDO PEREIRA',
      nomeOutro: '',
      isTitular: true,
    },
    tesoureiro: {
      irmaoSelecionado: 'Ir∴ MAX FERREIRA DA SILVA',
      nomeOutro: '',
      isTitular: true,
    },
    chanceler: {
      irmaoSelecionado: 'Ir∴ FERNANDO MAGNO ROCHA',
      nomeOutro: '',
      isTitular: true,
    },
    mestreCerimonias: {
      irmaoSelecionado: 'Ir∴ ANDERSON CARDOSO COSTA',
      nomeOutro: '',
      isTitular: true,
    },
    hospitaleiro: {
      irmaoSelecionado: 'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA',
      nomeOutro: '',
      isTitular: true,
    },
    cobridorInterno: {
      irmaoSelecionado: 'Ir∴ LUIZ FERNANDO MARRA DE AQUINO',
      nomeOutro: '',
      isTitular: true,
    },
  },
  balaustres_lidos_json: [
    {
      numero: 56,
      statusAprovacao: 'aprovado_sem_restricoes',
      emendasObservacao: '',
    },
  ],
  expedientes_json: [
    {
      tipoExpediente: 'convite',
      subtipoConvite: 'Iniciação',
      nomesCandidatos:
        'Edênio Aparecido de Freitas, Hugo Rafael da Silva Borges e Cézio Wilson Carneiro',
      nomeIrmao: '',
      outroDetalheConvite: '',
      lojaConvite: 'A∴R∴L∴S∴ SÃO JOÃO DA ESCÓCIA Nº 221',
      orienteConvite: 'INDIANÓPOLIS-MG',
      dataEvento: '2026-10-31',
      horaEvento: '18:00',
      enderecoEvento: 'Rua Tiradentes, nº 776',
      origemOficio: 'loja',
      numeroOficio: '',
      ufInstituicao: 'MG',
      orienteInstituicao: 'INDIANÓPOLIS-MG',
      nomeInstituicao: 'A∴R∴L∴S∴ SÃO JOÃO DA ESCÓCIA Nº 221',
      nomePessoa: '',
      classificacaoOficio:
        'Ofício/Prancha de Convite (Sessões Magnas e Eventos)',
      outroTipoOficio: '',
      dataRecebimentoOficio: '2026-10-20',
      assuntoOficio: '',
      destinoOficio: 'lido_arquivado',
      enviadoOrdemDia: false,
      descricao:
        'Carta-convite da A∴R∴L∴S∴ SÃO JOÃO DA ESCÓCIA Nº 221 para Sessão Magna de Iniciação do(s) candidato(s) Edênio Aparecido de Freitas, Hugo Rafael da Silva Borges e Cézio Wilson Carneiro, a ser realizada em 31/10/2026, às 18:00 horas, no Templo situado à Rua Tiradentes, nº 776, Or∴ de INDIANÓPOLIS-MG.',
    },
  ],
  saco_propostas_itens_json: [
    {
      descricao:
        '02 Certificados de visitas a irmãos do quadro a outras oficinas.',
    },
  ],
  ordem_dia_json: [],
  tempo_instrucao_json: {
    temaTitulo: 'A Convivência Maçônica',
    apresentadorSelecionado: 'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
    apresentadorOutro: '',
    resumoInstrucao:
      'O irmão discorreu de forma didática sobre preceitos de convivência.',
  },
  palavra_bem_da_ordem_json: {
    textoConsolidadoAta: '',
    colunaSul: [
      {
        irmaoSelecionado: 'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Fez uso da palavra prestando informações acerca do estado de saúde do Ir∴ Paulo, relatando que este apresentou um quadro de edema cerebral, contudo já se encontra mais comunicativo, com previsão médica de alta hospitalar para a próxima quinta-feira. Em seguida, congratulou o Ir∴ Carlos pela brilhante apresentação de sua peça de arquitetura, destacando não apenas a relevância do tema, mas a forma inspiradora com que foi exposto, enfatizando a importância da dedicação na vida maçônica, virtude sem a qual nenhuma obra se edifica. Na oportunidade, concitou os Irmãos do Quadro a indicarem entidades beneficentes ou pessoas que desenvolvam trabalhos relevantes em prol da sociedade para receberem o auxílio da oficina. Noticiou ainda o encerramento da rifa beneficente, cuja bicicleta foi doada pelo Past Venerável, informando a venda de cento e nove bilhetes com custo de quarenta reais, apurando um saldo líquido superior a um mil reais. Ressaltou que, por vezes, os recursos do Tronco de Beneficência não são suficientes para atender a todas as demandas sociais, externando sinceros agradecimentos a todos os Irmãos que diuturnamente apoiam a Hospitalaria, lembrando que a caridade praticada não exalta a individualidade de ninguém, mas expressa a união e a força de todos os obreiros em prol do bem comum.',
      },
      {
        irmaoSelecionado: 'Ir∴ LUIZ LUCIANO GARCIA',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Manifestou sua imensa satisfação e alegria por ter sido contemplado com a bicicleta na ação beneficente conduzida pelo Ir∴ Lindomar. Em gesto de fraternidade e desprendimento, informou que estava devolvendo o bem sorteado à Oficina para a realização de uma nova campanha, expressando profunda gratidão pelo prêmio e ressaltando que, com essa nova destinação, a Loja alcançará ainda mais êxito em suas iniciativas, ampliando o auxílio aos mais necessitados.',
      },
      {
        irmaoSelecionado: 'Ir∴ FERNANDO MAGNO ROCHA',
        nomeOutro: '',
        cargoIrmao: 'Chanceler',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Inicialmente, apresentou escusas aos Irmãos pelo atraso ao adentrar ao Templo e pelo equívoco involuntário no porte do Livro de Presenças. Em seguida, congratulou calorosamente o Ir∴ Carlos pela primorosa peça de arquitetura apresentada, relatando que as reflexões expostas lhe trouxeram à memória ensinamentos do saudoso Ir∴ Fontes. Destacou que, para além da vigilância constante sobre sentimentos e pensamentos — lembrança vívida transmitida pela dualidade do Pavimento Mosaico —, faz-se imperioso domar as paixões e controlar a própria língua, assemelhando-a a uma flecha certeira que, uma vez disparada, jamais retorna. Pontuou a exigência moral de dominar esse ímpeto interior, mormente em momentos de dissensão ou divergência de opiniões. Exortou os presentes a deixarem as aflições e vicissitudes do mundo profano além dos limites do Pórtico, lembrando que no seio da Oficina reina a concórdia, ninguém sendo responsável pelos dissabores externos e encontrando-se todos reunidos com o propósito de prestar mútuo amparo fraternal, desde que este seja expressamente solicitado. Por fim anunciou os certificados de visitas dos IIr∴ do Quadro a outras Of∴, renovando seus pedidos de escusas ao concluir sua manifestação.',
      },
      {
        irmaoSelecionado: 'Ir∴ JOSE RUBENS BUIATTI',
        nomeOutro: '',
        cargoIrmao: '2º Vigilante substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Iniciou sua manifestação parabenizando a apresentação da peça de arquitetura, exaltando a liberdade de pensamento, de expressão e a consciência demonstradas, externando sincero agradecimento pelo aprendizado compartilhado. Em seguida, teceu profunda e contundente reflexão sobre a resistência humana diante de verdades que confrontam dogmas estabelecidos, lamentando a hostilidade e a intolerância frequentemente direcionadas àqueles que ousam referendar certas constatações. Evocou exemplos históricos de incompreensão e perseguição ao livre-pensar, citando o sacrifício do Cristo e, em tempos mais recentes, as perseguições e a queima de obras do Dr. Odilon — traçando paralelo com os episódios inquisitoriais e de censura ocorridos na Espanha —, evidenciando como a sociedade muitas vezes reage com ódio e violência à lucidez que desvela as próprias incoerências e hipocrisias humanas. Ressaltou que a verdadeira sabedoria não decorre exclusivamente de erudição formal, ponderando que um trabalhador simples, como o gari que recolhe os resíduos em nossas portas, frequentemente demonstra discernimento e clareza existencial superiores aos de indivíduos tidos por cultos, que por vezes sequer compreendem o propósito do próprio viver. Concluiu concitando os obreiros ao cultivo do respeito, da tolerância e da dedicação sincera — valores que exigem autodomínio, renúncia ao orgulho e a capacidade de conter impulsos e acolher verdades incômodas —, advertindo contra o ceticismo exacerbado e estéril que questiona mesmo os postulados retos e justos, enfraquecendo a união e a edificação interior.',
      },
    ],
    colunaNorte: [
      {
        irmaoSelecionado: 'Ir∴ ANDERSON CARDOSO COSTA',
        nomeOutro: '',
        cargoIrmao: 'Mestre de Cerimônias',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Iniciou sua fala parabenizando a peça de arquitetura apresentada pelo Ir∴ Carlos, elogiando tanto o excelente conteúdo quanto a brilhante exposição. Em seguida, justificou sua ausência para a próxima semana em virtude de viagem profissional agendada, solicitando a gentileza do Ir∴ Luciano para cobrir seus encargos e funções em Loja no referido período. Aproveitando os trabalhos em andamento da comissão de revisão do Regimento Interno da Oficina, submeteu à apreciação dos Irmãos uma proposta de reflexão quanto à viabilidade legal e fraternal de transformar as sessões ordinárias em quinzenais. Ponderou que o perfil contemporâneo dos obreiros impõe crescentes desafios para conciliar as obrigações profissionais e familiares com as atividades maçônicas, relatando suas próprias dificuldades de frequência decorrentes de compromissos laborais, sugerindo que o modelo quinzenal — já adotado com êxito por diversas oficinas da jurisdição — poderia proporcionar maior equilíbrio e potencializar a assiduidade dos membros do Quadro. Observou que, conquanto a Loja mantenha uma média saudável de frequência em torno de 60%, a semana intercalada sem sessão administrativa permitiria aos obreiros realizarem visitas a outras oficinas da região, exemplificando a importância do intercâmbio com Lojas coirmãs, a exemplo da Cavaleiros de Aço, frisando que a visitação ativa fomenta a reciprocidade e atrai valorosos visitantes ao nosso Templo. Concluiu consignando que tais apontamentos servem de subsídio para análise da comissão temática e posterior deliberação sob a condução do Venerável Mestre.',
      },
      {
        irmaoSelecionado: 'Ir∴ LUIZ FERNANDO MARRA DE AQUINO',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Iniciou congratulando o Ir∴ Carlos pela excelência da peça de arquitetura apresentada. Em seguida, teceu considerações acerca da manifestação do Ir∴ Anderson, ponderando que as exigências do cotidiano contemporâneo de fato impõem sacrifícios a todos; contudo, manifestou ceticismo quanto à eficácia da periodicidade quinzenal no aumento da frequência, avaliando que os obreiros habitualmente assíduos continuarão comparecendo, sem alteração substancial no comprometimento geral do Quadro. Retomando a reflexão sobre o domínio das emoções e o simbolismo do "dragão", ponderou que expressar posicionamentos firmes em defesa dos preceitos da Ordem não equivale a disparar flechas ofensivas, mas reflete seu zelo rigoroso pela liturgia e pela regularidade ritualística, confessando o incômodo que sente ao testemunhar descuidos e relaxamentos no cumprimento dos costumes maçônicos. Observou que, a exemplo das ponderações do Ir∴ Paulo, cansou de desempenhar o papel de repreensor contínuo e ser mal interpretado por apontar falhas, razão pela qual procurou conter suas manifestações. Não obstante, externou veemente inconformismo com o relaxamento no rigor indumentário dos obreiros verificado em sessões e instruções, relatando episódios em que constatou desdém e o uso de trajes e calçados totalmente incompatíveis com o decoro litúrgico, a exemplo de botinas e vestimentas desleixadas. Enfatizou que o uso do balandrau facilitou a vestimenta maçônica em relação ao terno tradicional, mas não isenta o obreiro da compostura básica, do uso de sapatos pretos (ou tênis pretos discretos quando inevitável) e de calça social preta condigna, ressalvando que exceções pontuais apenas se justificam por motivos de saúde. Concluiu exortando os Irmãos a manterem a postura, a reverência e o esmero formal que o Templo exige, renovando escusas à Oficina caso seu desabafo tenha soado áspero, reiterando que sua intenção não é semear discórdia, mas zelar pela preservação da tradição e do respeito aos trabalhos.',
      },
      {
        irmaoSelecionado: 'Ir∴ MAX FERREIRA DA SILVA',
        nomeOutro: '',
        cargoIrmao: 'Tesoureiro',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Congratulou o Ir∴ Carlos pela magnífica peça de arquitetura, qualificando-a como altamente instrutiva. Destacou que as considerações apresentadas acerca do respeito e da tolerância lhe evocaram passagens do Evangelho, em especial o preceito sobre honrar pai e mãe, uma das lições bíblicas que mais admira pela sua beleza e profundidade moral. Por fim informou que o tronco colheu além de bons fluidos a medalha cunhada de R$ 74,00 (setenta e quatro reais).',
      },
      {
        irmaoSelecionado: 'Ir∴ ISAIAS FERREIRA DOS SANTOS',
        nomeOutro: '',
        cargoIrmao: '1º Vigilante substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Iniciou sua manifestação ponderando que é salutar e construtivo presenciar posicionamentos firmes em Loja, enaltecendo a postura do Ir∴ Luiz Fernando ao expressar o que é correto e justo com franqueza e sem ofensas. Em seguida, dirigiu calorosas congratulações ao Ir∴ Carlos pelo trabalho apresentado, enfatizando a conduta exemplar do expositor, que primou pelo respeito ao consultar previamente sobre a oportunidade de sua apresentação, demonstrou tolerância ao compartilhar experiências vivenciadas no seio familiar e revelou notável dedicação no preparo da instrução. Destacou a relevância dos debates em plenário, citando as reflexões trazidas pelo Ir∴ José Rubens, e lembrou aos presentes o recente momento de confraternização vivido pela Oficina, ambiente que evidenciou a vivência prática do respeito, da harmonia e da tolerância fraternal. Por fim, quanto à proposta aventada pelo Ir∴ Anderson referente à periodicidade das sessões, avaliou a ideia como legítima e válida para reflexão, ponderando, contudo, a necessidade de cautela e exame detalhado, em razão dos inúmeros pormenores, reflexos práticos e exigências normativas que cercam a matéria.',
      },
    ],
    colunaOriente: [
      {
        irmaoSelecionado: 'Ir∴ ALDO BORGES DE FREITAS',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Fez uso da palavra noticiando aos Irmãos a sagração recente de mais duas Oficinas no Oriente de Uberlândia, as quais passarão a funcionar nas dependências da Rua Tiradentes. Relatou diálogo mantido com um Irmão sobre o tema, ponderando que, diferentemente do surgimento da Loja Alpha e Ômega — que nasceu agregada a um propósito sólido, como a revitalização do centro comunitário —, as novas oficinas foram erigidas com número bastante reduzido de obreiros, sem o preenchimento ideal de suas colunas e carecendo de um objetivo institucional bem delineado desde sua gênese. Em seguida, congratulou efusivamente o Ir∴ Carlos ("Carlinhos") pela peça de arquitetura apresentada, afirmando que o expositor praticamente esgotou o tema proposto com brilhantismo. A partir da reflexão sobre a convivência fraternal, reconheceu a complexidade inerente às relações humanas e a necessidade indispensável do exercício da tolerância diária. Ressaltou o aprendizado de contemplar prioritariamente as virtudes do semelhante em detrimento de suas falhas, observando que a inclinação natural profana é apontar defeitos, quando na verdade todo homem admitido na Ordem possui valorosos predicados. Exemplificou essa dinâmica citando o Ir∴ Lindomar que, a despeito das naturais imperfeições inerentes a qualquer ser humano, reúne destacadas virtudes, concluindo que o reconhecimento das qualidades fraternais mútuas constitui a verdadeira ferramenta para edificar e sustentar as Colunas da Loja em perfeita harmonia.',
      },
    ],
    colunaAltar: [
      {
        irmaoSelecionado: 'Ir∴ DOMICIO FERREIRA NEVES',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Dirigiu a palavra ao Ir∴ Carlos ("Carlinhos"), enaltecendo a instrução apresentada e destacando como ponto basilar o princípio do respeito mútuo. Enfatizou que o respeito ultrapassa a mera consideração formal entre obreiros, alcançando a família maçônica em sua plenitude, advertindo que o rompimento dessa salvaguarda moral quase sempre conduz à ruína da convivência fraternal e da harmonia em Loja. Ao concluir sua manifestação, solicitou ao Venerável Mestre que, antes do encerramento dos trabalhos, fosse concedido um minuto de silêncio e reflexão, permitindo que cada Irmão, segundo sua crença individual, elevasse preces e vibrações de Luz e gratidão em sufrágio e memória dos entes queridos falecidos, Maria de Fátima Ferreira de Sá e Valter Tiago de Sá, para que alcancem amparo e serenidade no Oriente Eterno.',
      },
    ],
    palavraVeneravelMestre:
      'Fez uso da palavra tecendo considerações sobre a peça de arquitetura apresentada pelo Ir∴ Carlos, destacando que mais do que um trabalho formal, tratou-se de uma verdadeira reflexão conduzida com método didático exemplar que manteve a atenção de todos. Enfatizou que postulados como respeito, tolerância, ética e moralidade exigem autenticidade e prática individual primordial, sendo impossível exteriorizá-los sinceramente ao próximo sem antes vivenciá-los de corpo e alma consigo mesmo. Corroborou as preocupações levantadas acerca da proliferação e sustentabilidade das oficinas no Oriente de Uberlândia — que hoje totaliza trinta e três Lojas —, pontuando que muitas enfrentam severas crises e esvaziamento decorrentes de dissidências e repetição de vícios comuns. Revelou o dilema administrativo da Loja, que conta com cerca de seis obreiros afastados que adimplam suas obrigações financeiras mas não comparecem às sessões, gerando uma contradição prática entre o rigor da lei maçônica (que prevê sanções e exclusão por faltas e inadimplência) e a dependência financeira para manutenção do Templo. No tocante à ritualística, ponderou que as falhas recorrentes advêm da carência de instrução e da baixa adesão dos obreiros aos encontros e programas de estudo, como o CEMAP, advertindo que o atingimento do Mestrado ou de graus superiores não exime o maçom de revisitar periodicamente as bases e instruções dos Graus Simbólicos (1, 2 e 3). Ressaltou que correções de postura e liturgia devem ser fraternais e discretas — orientando o Irmão em particular —, a fim de não romper a egrégora do Templo. Agradeceu as ponderações trazidas pelo Ir∴ Luiz Fernando e, dirigindo-se afetuosamente ao Ir∴ Anderson ("Turquinho"), ponderou que a presença física e o compromisso dos obreiros em Loja sobrepõem-se a formalidades menores, concitando todos a trocarem as distrações profanas pelo convívio no Templo, preservando a assiduidade e o cumprimento do Regimento Interno. Renovou agradecimentos a todos que prestigiaram o recente jantar de confraternização da Oficina, ressaltando o clima festivo e harmonioso da ocasião. Por fim, prestando esclarecimentos à indagação do Ir∴ Luciano sobre a atuação da Loja em prol do Ir∴ Paulo, relatou diálogo direto mantido com a irmã do enfermo. Informou que a alta hospitalar está prevista entre quarta e quinta-feira, após o término da antibioticoterapia, salientando que o obreiro apresenta sequelas significativas, episódios de lapsos de memória e ausência de controle esfincteriano, dependendo inteiramente de cuidados contínuos. Detalhou que, em articulação com o Ir∴ Alexandre, foram examinadas alternativas legais e assistenciais, esclarecendo que a família não dispõe de condições de contratar três turnos de cuidadores e que a irmã já se dedica aos cuidados da genitora acamada. Noticiou que a transferência hospitalar foi inviabilizada pela saturação do sistema público e que o paciente será inserido no programa municipal "Melhor em Casa". Alertou a Oficina para a grave lacuna legislativa e assistencial existente para o acolhimento de pessoas na faixa dos dezoito aos cinquenta e nove anos — uma vez que a grande maioria das instituições de longa permanência destina-se exclusivamente a idosos —, servindo de alerta para o planejamento pessoal e familiar de todos os Irmãos. Informou que a família logrou viabilizar vaga em uma clínica adequada, reafirmando que a Loja tem ofertado todo o suporte material, suporte de mobilidade e amparo fraternal ao seu alcance, buscando amenizar o sofrimento vivenciado na Unidade de Atendimento Integrado (UAI) em razão de sua compleição física avantajada. Concluiu exortando os presentes a elevarem vibrações e preces em favor da recuperação do valoroso Irmão e informou que o horário de visitação na UAI Planalto ocorre diariamente das 9h30 às 10h30.',
    palavraOrador:
      'Usando da palavra em conclusão aos trabalhos da ordem do dia, registrou a ausência de Irmãos visitantes na presente sessão, atestando que os trabalhos transcorreram de forma justa, perfeita e dentro da legalidade maçônica.',
  },
  texto_liturgico_gerado:
    'Balaústre Nº 57 (20/10/2026) — Sessão Ordinária no Grau 1 (Aprendiz Maçom) — Loja Maçônica Alpha e Ômega Nº 3402.',
};

const SEED_BALAUSTRE_56_ROW: BalaustreSupabaseRow = {
  loja_id: DEFAULT_LOJA_ALPHA_OMEGA_ID,
  numero_balaustre: 56,
  periodo_gestao: '2025-2027',
  data_sessao: '2026-10-13',
  horario_abertura: '20:00',
  horario_encerramento: '21:39',
  grau_trabalhos: 'aprendiz',
  tipo_sessao: 'ordinaria',
  qtd_quadro_presentes: 18,
  qtd_visitantes_presentes: 3,
  saco_propostas_resultado_geral:
    'O Saco de Proposta e Informações colheu além dos bons fluidos 2 colunas gravadas assim decifradas pelo VM:',
  instrucao_tema_titulo: 'O tempo',
  instrucao_apresentador_nome: 'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA',
  instrucao_resumo:
    'Por comunicação do Ir∴ 2º Vig∴, é ocupado por nosso valoroso Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA, que apresentou o belo Trabalho "O tempo", sendo aplaudido ao final dos trabalhos.',
  tronco_valor_apurado: 'R$ 91,00',
  tronco_valor_por_extenso: 'noventa e um reais',
  tronco_destino: 'A cargo e julgo da hospitalaria',
  texto_consolidado_item8: '',
  palavra_veneravel_mestre:
    'Ponderou que a sessão transcorreu sob a égide de profundas inquietações e reflexões, resgatando preceitos da campanha do "Setembro Amarelo" e a necessidade de atenção aos sinais que antecedem quadros depressivos severos. Reportou-se à mensagem com pedido de quit-placet enviada pelo Ir∴ Paulo em 06/10/2026, destacando que as entrelinhas continham teor preocupante de despedida pessoal, procedendo à sua releitura para sensibilizar a Oficina quanto à urgência do cuidado fraternal. Diante do questionamento em plenário sobre a possibilidade de sobrestar o andamento do pedido de quitamento face ao delicado estado clínico do Irmão, informou que consultará a legislação maçônica aplicável. Concedeu um minuto de silêncio a favor do pleno restabelecimento da saúde do Ir∴ Paulo. Em seguida, submeteu à apreciação do plenário o adiamento da Sessão de Finanças, visando estrita observância ao prazo regulamentar de convocação de 15 dias de antecedência, medida que foi aprovada por unanimidade. Por fim, reforçou o convite para o almoço de confraternização da Oficina a realizar-se no próximo sábado na chácara do Ir∴ Domício.',
  palavra_orador:
    'O Orador agradeceu nominalmente a visita dos valorosos irmãos. Ressaltou que, diante da regularidade dos procedimentos realizados, a sessão ocorreu em conformidade com as leis e regulamentos da Ordem.',
  emendas_ressalvas_final: null,
  configuracao_loja_json: DEFAULT_CONFIGURACAO_LOJA,
  cargos_json: {
    veneravelMestre: {
      irmaoSelecionado: 'Ir∴ MARCOS FERREIRA VASCONCELOS',
      nomeOutro: '',
      isTitular: true,
    },
    primeiroVigilante: {
      irmaoSelecionado: 'Ir∴ ISAIAS FERREIRA DOS SANTOS',
      nomeOutro: '',
      isTitular: false,
    },
    segundoVigilante: {
      irmaoSelecionado: 'Ir∴ JOSE RUBENS BUIATTI',
      nomeOutro: '',
      isTitular: false,
    },
    orador: {
      irmaoSelecionado: 'Ir∴ EMERSON LUIZ TEIXEIRA',
      nomeOutro: '',
      isTitular: true,
    },
    secretario: {
      irmaoSelecionado: 'Ir∴ MAXIMIANO EDUARDO PEREIRA',
      nomeOutro: '',
      isTitular: true,
    },
    tesoureiro: {
      irmaoSelecionado: 'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
      nomeOutro: '',
      isTitular: false,
    },
    chanceler: {
      irmaoSelecionado: 'Ir∴ FERNANDO MAGNO ROCHA',
      nomeOutro: '',
      isTitular: true,
    },
    mestreCerimonias: {
      irmaoSelecionado: 'Ir∴ ANDERSON CARDOSO COSTA',
      nomeOutro: '',
      isTitular: true,
    },
    hospitaleiro: {
      irmaoSelecionado: 'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA',
      nomeOutro: '',
      isTitular: true,
    },
    cobridorInterno: {
      irmaoSelecionado: 'Ir∴ LUIZ FERNANDO MARRA DE AQUINO',
      nomeOutro: '',
      isTitular: true,
    },
  },
  balaustres_lidos_json: [
    {
      numero: 55,
      statusAprovacao: 'aprovado_sem_restricoes',
      emendasObservacao: '',
    },
  ],
  expedientes_json: [
    {
      tipoExpediente: 'convite',
      subtipoConvite: 'Outros',
      nomesCandidatos: '',
      nomeIrmao: 'Daniel Francisco Cano',
      outroDetalheConvite:
        'Sessão de comemoração dos 12 Anos da ARLS Guardiões do Triângulo nº 353 e Reconhecimento como Membro Honorário da Loja do Poderoso Irmão Daniel Francisco Cano',
      lojaConvite: 'A∴R∴L∴S∴ GUARDIÕES DO TRIÂNGULO Nº 353',
      orienteConvite: 'UBERLÂNDIA-MG',
      dataEvento: '2026-10-20',
      horaEvento: '20:00',
      enderecoEvento: 'Templo da ARLS TAKEO IWACE 2271',
      origemOficio: 'loja',
      numeroOficio: '',
      ufInstituicao: 'MG',
      orienteInstituicao: 'UBERLÂNDIA-MG',
      nomeInstituicao: 'A∴R∴L∴S∴ GUARDIÕES DO TRIÂNGULO Nº 353',
      nomePessoa: '',
      classificacaoOficio:
        'Ofício/Prancha de Convite (Sessões Magnas e Eventos)',
      outroTipoOficio: '',
      dataRecebimentoOficio: '2026-10-13',
      assuntoOficio: '',
      destinoOficio: 'lido_arquivado',
      enviadoOrdemDia: false,
      descricao:
        'Carta convite para sessão de comemoração dos 12 Anos da ARLS Guardiões do Triângulo nº 353, a ser realizada às 20h00 do dia 20 de outubro de 2026, próxima Terça-Feira, no Templo da ARLS TAKEO IWACE 2271, onde teremos o Reconhecimento como Membro Honorário da Loja do Poderoso irmão Daniel Francisco Cano.',
    },
  ],
  saco_propostas_itens_json: [
    {
      descricao: '01 certificado de visita de irmão do quadro a outra oficina;',
    },
    {
      descricao:
        '01 prancha recebida de indicação de candidato a ser lida na ordem do dia.',
    },
  ],
  ordem_dia_json: [
    {
      tipoItemOrdemDia: 'deliberacao_comum',
      titulo:
        '1ª Leitura de indicação de candidato (Diego Rogers do Val Oliveira)',
      resumoMateria:
        'Foi realizada a primeira leitura da proposta de ingresso à Ordem do profano Diego Rogers do Val Oliveira, apresentada pelo Venerável Mestre.',
      objetoManifestacao: true,
      tipoManifestacao: 'sem_manifestacao',
      objetoVotacao: true,
      resultadoVotacao: 'aprovada_unanimidade',
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: 'Diego Rogers do Val Oliveira',
      totalVotantes: 18,
      qtdEsferasBrancas: 18,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 18,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Foi realizada a primeira leitura da proposta de ingresso à Ordem do profano Diego Rogers do Val Oliveira, apresentada pelo Venerável Mestre. Em seguida, a palavra foi colocada à disposição entre as Colunas para manifestações e comentários dos Irmãos. Não havendo oposições, colheu-se as conclusões do Irmão Orador, que se manifestou favorável ao prosseguimento do processo. Submetida a matéria à deliberação do plenário, o prosseguimento do ato foi aprovado por unanimidade dos Irmãos presentes.',
    },
    {
      tipoItemOrdemDia: 'deliberacao_comum',
      titulo: '2ª Leitura de indicação de candidato (André Luiz Lobato)',
      resumoMateria:
        'Foi realizada a segunda leitura da proposta de ingresso à Ordem do profano André Luiz Lobato, apresentada pelo Venerável Mestre.',
      objetoManifestacao: true,
      tipoManifestacao: 'sem_manifestacao',
      objetoVotacao: true,
      resultadoVotacao: 'aprovada_unanimidade',
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: 'André Luiz Lobato',
      totalVotantes: 18,
      qtdEsferasBrancas: 18,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 18,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Foi realizada a segunda leitura da proposta de ingresso à Ordem do profano André Luiz Lobato, apresentada pelo Venerável Mestre. Em seguida, a palavra foi colocada à disposição entre as Colunas para manifestações e comentários dos Irmãos. Não havendo oposições, colheu-se as conclusões do Irmão Orador, que se manifestou favorável ao prosseguimento do processo. Submetida a matéria à deliberação do plenário, o prosseguimento do ato foi aprovado por unanimidade dos Irmãos presentes.',
    },
    {
      tipoItemOrdemDia: 'deliberacao_comum',
      titulo:
        'Proposta de Expedição de Placet Ex-Officio (Ir∴ Ronan Carlos Alves Mendes)',
      resumoMateria:
        'Procedeu-se à leitura da proposta de expedição de Placet Ex-Officio do Irmão Ronan Carlos Alves Mendes.',
      objetoManifestacao: true,
      tipoManifestacao: 'manifestacao_positiva',
      objetoVotacao: true,
      resultadoVotacao: 'aprovada_unanimidade',
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: 'Ronan Carlos Alves Mendes',
      totalVotantes: 18,
      qtdEsferasBrancas: 18,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 18,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Procedeu-se à leitura da proposta de expedição de Placet Ex-Officio do Irmão Ronan Carlos Alves Mendes, tendo o Venerável Mestre esclarecido que o Irmão reside no exterior, não manifestou intenção de permanecer no quadro e acumula faltas e débitos, onerando a Oficina com o custeio de suas capitações perante o GOB e o GOB-MG. Franqueada a palavra, o Irmão Anderson pontuou que o débito pago pela Loja deve constar como devido diretamente a ela, o que foi acolhido para regularização pela Secretaria; já o Irmão Isaías questionou sobre a comunicação aos demais corpos maçônicos, sendo confirmado o cumprimento de todos os trâmites regulamentares. Ouvido o parecer favorável do Irmão Orador, a matéria foi à votação e a expedição do Placet Ex-Officio foi aprovada por unanimidade.',
    },
  ],
  tempo_instrucao_json: {
    temaTitulo: 'O tempo',
    apresentadorSelecionado: 'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA',
    apresentadorOutro: '',
    resumoInstrucao:
      'Por comunicação do Ir∴ 2º Vig∴, é ocupado por nosso valoroso Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA, que apresentou o belo Trabalho "O tempo", sendo aplaudido ao final dos trabalhos.',
  },
  palavra_bem_da_ordem_json: {
    textoConsolidadoAta: '',
    colunaSul: [
      {
        irmaoSelecionado: 'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Teceu profundas considerações e reflexões acerca da vulnerabilidade humana e dos momentos difíceis enfrentados pelos obreiros, citando com preocupação o caso recente do Ir∴ Paulo e rememorando a dolorosa perda pelo falecimento do Ir∴ Gil. Alertou sobre os perigos do isolamento pessoal, enfatizando a importância imperiosa de manter e fortalecer os laços de união, escuta e apoio recíproco no seio da Oficina. Em seguida, tratou da realização do sorteio de uma rifa beneficente pendente na Loja, cuja execução havia sido postergada em virtude de reuniões anteriores suspensas por motivo de fortes chuvas.',
      },
      {
        irmaoSelecionado: 'Ir∴ FERNANDO MAGNO ROCHA',
        nomeOutro: '',
        cargoIrmao: 'Chanceler',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Parabenizou o irmão Lindomar pelo trabalho apresentado, fez a leitura de certificados de visitas e anunciou os irmãos aniversariantes.',
      },
    ],
    colunaNorte: [
      {
        irmaoSelecionado: 'outro',
        nomeOutro: 'IVAN FERREIRA DE ASSIS',
        cargoIrmao: '',
        lojaVisitante: 'A∴R∴L∴S∴ Estrela Uberlandense',
        orienteVisitante: 'Uberlândia-MG',
        resumoFala:
          'Agradeceu a calorosa acolhida dispensada pelos Irmãos e pelo Venerável Mestre, destacando a qualidade dos trabalhos da Oficina e estendendo convite solene ao quadro para a Sessão Magna de Iniciação a realizar-se em sua Loja no próximo dia 29, às 19h30.',
      },
      {
        irmaoSelecionado: 'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
        nomeOutro: '',
        cargoIrmao: 'Tesoureiro substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Anunciou que o Tronco de Beneficência colheu a medalha cunhada no valor de R$ 91,00 (noventa e um reais) que ficaram a cargo e julgo da hospitalaria.',
      },
      {
        irmaoSelecionado: 'Ir∴ LEMUEL DELFINO ALVES',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Justificou suas ausências recentes devido à sobrecarga profissional e falta de mão de obra. Parabenizou o trabalho apresentado e repercutiu a manifestação do Ir∴ Lindomar, rememorando ponderações trazidas em momento pretérito pelo Ir∴ Domício sobre a necessidade de pedir auxílio, frisando que aquele que carece de amparo deve expressar sua necessidade, não cabendo aos demais apenas supor suas demandas.',
      },
      {
        irmaoSelecionado: 'Ir∴ ISAIAS FERREIRA DOS SANTOS',
        nomeOutro: '',
        cargoIrmao: '1º Vigilante substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Parabenizou o Ir∴ Lindomar pela reflexão apresentada sobre o tempo, observando que o tempo divino difere do ritmo acelerado do homem, que muitas vezes age com pressa e negligencia momentos vitais; partilhou breve relato pessoal e manifestou solidariedade diante do quadro de saúde enfrentado pelo Ir∴ Paulo.',
      },
    ],
    colunaOriente: [
      {
        irmaoSelecionado: 'Ir∴ MAXIMIANO EDUARDO PEREIRA',
        nomeOutro: '',
        cargoIrmao: 'Secretário',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Em atenção às considerações dos IIr∴ Lindomar e Lemuel, ponderou sobre a situação de Irmãos em condição de vulnerabilidade ou isolamento que eventualmente não conseguem solicitar ajuda ativa. Comprometeu-se — solicitando ser cobrado pelos presentes — a desenvolver um aplicativo institucional automatizado, inspirado na sistemática de plano de chamada, para checagem rotineira do bem-estar dos membros; caso o Irmão não responda, o sistema emitirá alertas para que a Oficina providencie imediato amparo fraternal.',
      },
    ],
    colunaAltar: [
      {
        irmaoSelecionado: 'outro',
        nomeOutro: 'MARCO AURÉLIO',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Parabenizou a apresentação do Ir∴ Lindomar, ressaltando a relevância da reflexão trazida sobre o tempo, enfatizando que este constitui o bem mais precioso e irrecuperável que possuímos na vida. Em complemento, compartilhou uma mensagem acerca da preciosidade e da percepção do tempo em nossas vidas. Concluiu conclamando a todos a valorizarem cada instante compartilhado com a família e com os Irmãos, visto que o tempo não retrocede. Por fim, reforçou o convite ao quadro para a programação festiva do dia 17 de novembro, que contará com reunião às 10h00 e uma confraternização ("mesa de boteco") a partir das 20h00.',
      },
    ],
    palavraVeneravelMestre:
      'Ponderou que a sessão transcorreu sob a égide de profundas inquietações e reflexões, resgatando preceitos da campanha do "Setembro Amarelo" e a necessidade de atenção aos sinais que antecedem quadros depressivos severos. Reportou-se à mensagem com pedido de quit-placet enviada pelo Ir∴ Paulo em 06/10/2026, destacando que as entrelinhas continham teor preocupante de despedida pessoal, procedendo à sua releitura para sensibilizar a Oficina quanto à urgência do cuidado fraternal. Diante do questionamento em plenário sobre a possibilidade de sobrestar o andamento do pedido de quitamento face ao delicado estado clínico do Irmão, informou que consultará a legislação maçônica aplicável. Concedeu um minuto de silêncio a favor do pleno restabelecimento da saúde do Ir∴ Paulo. Em seguida, submeteu à apreciação do plenário o adiamento da Sessão de Finanças, visando estrita observância ao prazo regulamentar de convocação de 15 dias de antecedência, medida que foi aprovada por unanimidade. Por fim, reforçou o convite para o almoço de confraternização da Oficina a realizar-se no próximo sábado na chácara do Ir∴ Domício.',
    palavraOrador:
      'O Orador agradeceu nominalmente a visita dos valorosos irmãos. Ressaltou que, diante da regularidade dos procedimentos realizados, a sessão ocorreu em conformidade com as leis e regulamentos da Ordem.',
  },
  texto_liturgico_gerado:
    'Balaústre Nº 56 (13/10/2026) — Sessão Ordinária no Grau 1 (Aprendiz Maçom) — Loja Maçônica Alpha e Ômega Nº 3402.',
};

const SEED_BALAUSTRE_54_ROW: BalaustreSupabaseRow = {
  loja_id: DEFAULT_LOJA_ALPHA_OMEGA_ID,
  numero_balaustre: 54,
  periodo_gestao: '2025-2027',
  data_sessao: '2026-09-29',
  horario_abertura: '19:30',
  horario_encerramento: '21:39',
  grau_trabalhos: 'aprendiz',
  tipo_sessao: 'magna_outra',
  qtd_quadro_presentes: 18,
  qtd_visitantes_presentes: 88,
  saco_propostas_resultado_geral:
    'Suprimido. Com determinação do VM para guarda de honra ao irmão mestre de cerimônias, foi dado entrada ao Pavilhão Nacional.',
  instrucao_tema_titulo:
    'Peça sobre o início do Rito Brasileiro e a fundação da Loja Alpha e Ômega',
  instrucao_apresentador_nome: 'Ir∴ ALDO BORGES DE FREITAS',
  instrucao_resumo:
    'Apresentada conjuntamente pelos Irmãos Fundadores da Loja: Ir∴ Aldo Borges de Freitas, Ir∴ José Rubens Buiatti e Ir∴ André Luiz Borges.',
  tronco_valor_apurado: 'R$ 504,00',
  tronco_valor_por_extenso: 'quinhentos e quatro reais',
  tronco_destino: 'A cargo e julgo da hospitalaria',
  texto_consolidado_item8:
    'Sob saudação do irmão Antônio Macine e novamente com a formação da guarda de honra foi dada saída ao Pavilhão Nacional.',
  palavra_veneravel_mestre:
    'Agradeceu a presença dos 18 Irmãos do Quadro e 88 Irmãos Visitantes na Sessão Magna Comemorativa aos 25 Anos do Rito Brasileiro e encerrou ritualisticamente os trabalhos.',
  palavra_orador:
    'Atestou que os trabalhos da Sessão Magna Comemorativa transcorreram com solenidade, justeza e perfeição.',
  emendas_ressalvas_final: null,
  configuracao_loja_json: DEFAULT_CONFIGURACAO_LOJA,
  cargos_json: {
    veneravelMestre: {
      irmaoSelecionado: 'Ir∴ MARCOS FERREIRA VASCONCELOS',
      nomeOutro: '',
      isTitular: true,
    },
    primeiroVigilante: {
      irmaoSelecionado: 'Ir∴ PAULO HENRIQUE CUNHA',
      nomeOutro: '',
      isTitular: true,
    },
    segundoVigilante: {
      irmaoSelecionado: 'Ir∴ ISAIAS FERREIRA DOS SANTOS',
      nomeOutro: '',
      isTitular: true,
    },
    orador: {
      irmaoSelecionado: 'Ir∴ EMERSON LUIZ TEIXEIRA',
      nomeOutro: '',
      isTitular: true,
    },
    secretario: {
      irmaoSelecionado: 'Ir∴ MAXIMIANO EDUARDO PEREIRA',
      nomeOutro: '',
      isTitular: true,
    },
    tesoureiro: {
      irmaoSelecionado: 'Ir∴ MAX FERREIRA DA SILVA',
      nomeOutro: '',
      isTitular: true,
    },
    chanceler: {
      irmaoSelecionado: 'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
      nomeOutro: '',
      isTitular: false,
    },
    mestreCerimonias: {
      irmaoSelecionado: 'Ir∴ ANDERSON CARDOSO COSTA',
      nomeOutro: '',
      isTitular: true,
    },
    hospitaleiro: {
      irmaoSelecionado: 'Ir∴ HENRIQUE ROSALEN',
      nomeOutro: '',
      isTitular: true,
    },
    cobridorInterno: {
      irmaoSelecionado: 'Ir∴ ANDRE LUIZ BORGES',
      nomeOutro: '',
      isTitular: true,
    },
  },
  balaustres_lidos_json: [],
  expedientes_json: [],
  saco_propostas_itens_json: [],
  ordem_dia_json: [
    {
      tipoItemOrdemDia: 'leitura_simples',
      titulo:
        'Histórico do Rito Brasileiro e Fundação da Loja Alpha e Ômega',
      resumoMateria:
        'Leitura de peça sobre o início do Rito Brasileiro e a fundação da Loja Alpha e Ômega pelos irmãos Aldo, José Rubens e André (Fundadores da Loja).',
      objetoManifestacao: false,
      tipoManifestacao: 'sem_manifestacao',
      objetoVotacao: false,
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 18,
      qtdEsferasBrancas: 18,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 18,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Leitura de peça sobre o início do Rito Brasileiro e a fundação da Loja Alpha e Ômega pelos irmãos Aldo, José Rubens e André (Fundadores da Loja).',
    },
    {
      tipoItemOrdemDia: 'leitura_simples',
      titulo: 'Entrega de Homenagens às Autoridades do Rito Brasileiro',
      resumoMateria:
        'Entrega de Homenagens aos seguintes visitantes: Irmão Juliano Coelho Braga (Soberano Primaz do Rito Brasileiro); e Irmão Antonio Jair Amarante Garcia (Delegado do Rito Brasileiro).',
      objetoManifestacao: false,
      tipoManifestacao: 'sem_manifestacao',
      objetoVotacao: false,
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 18,
      qtdEsferasBrancas: 18,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 18,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Entrega de Homenagens aos seguintes visitantes: Irmão Juliano Coelho Braga (Soberano Primaz do Rito Brasileiro); e Irmão Antonio Jair Amarante Garcia (Delegado do Rito Brasileiro).',
    },
    {
      tipoItemOrdemDia: 'leitura_simples',
      titulo: 'Entrega de Homenagens aos Visitantes representando suas Lojas',
      resumoMateria:
        'Entrega de Homenagens aos seguintes visitantes representando suas Lojas: Irmão Belmiro Abreu Cunha; Irmão Hailton Barreiros de Oliveira; Irmão Gustavo dos Santos Faria; Irmão Leonardo (Filantropia e Trabalho); Irmão Ildo Cesar; Irmão Jaci; Irmão Bruno Teodoro Bilória; e Irmão Claudio Manuel Resende.',
      objetoManifestacao: false,
      tipoManifestacao: 'sem_manifestacao',
      objetoVotacao: false,
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 18,
      qtdEsferasBrancas: 18,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 18,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Entrega de Homenagens aos seguintes visitantes representando suas Lojas: Irmão Belmiro Abreu Cunha; Irmão Hailton Barreiros de Oliveira; Irmão Gustavo dos Santos Faria; Irmão Leonardo (Filantropia e Trabalho); Irmão Ildo Cesar; Irmão Jaci; Irmão Bruno Teodoro Bilória; e Irmão Claudio Manuel Resende.',
    },
    {
      tipoItemOrdemDia: 'leitura_simples',
      titulo:
        'Entrega de Homenagens aos Irmãos de Maior e Menor Idade Presentes',
      resumoMateria:
        'Entrega de Homenagem ao irmão de maior idade presente: com 89 anos, Irmão Alceu Alves de Souza (ARLS Fraternidade Sertaneja). Entrega de Homenagem ao irmão de menor idade presente: com 33 anos, Irmão Heonard Fernandes.',
      objetoManifestacao: false,
      tipoManifestacao: 'sem_manifestacao',
      objetoVotacao: false,
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 18,
      qtdEsferasBrancas: 18,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 18,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Entrega de Homenagem ao irmão de maior idade presente: com 89 anos, Irmão Alceu Alves de Souza (ARLS Fraternidade Sertaneja). Entrega de Homenagem ao irmão de menor idade presente: com 33 anos, Irmão Heonard Fernandes.',
    },
    {
      tipoItemOrdemDia: 'leitura_simples',
      titulo:
        'Mensagem de Homenagem em nome da Loja Filantropia e Trabalho',
      resumoMateria:
        'Manifestação do Irmão Leonardo e leitura de homenagem pelo Irmão Secretário.',
      objetoManifestacao: false,
      tipoManifestacao: 'sem_manifestacao',
      objetoVotacao: false,
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 18,
      qtdEsferasBrancas: 18,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 18,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Em ato contínuo, pediu a palavra o irmão Leonardo, o qual, em nome da Filantropia e em tom de gratidão, manifestou seus agradecimentos à A∴R∴L∴S∴ Alpha e Ômega nº 3402 pela louvável iniciativa de celebrar esta data especial. Ressaltou a relevância do Rito Brasileiro e a contribuição que este traz continuadamente para a Maçonaria, enviando um fraterno abraço a todos os Irmãos praticantes do Rito Brasileiro e dos demais Ritos presentes. Rogando ao Supremo Arquiteto do Universo que a todos proteja, solicitou ao Irmão Secretário que procedesse à leitura de uma mensagem de homenagem ao Rito Brasileiro. Atendendo ao pedido, o Irmão Secretário proferiu a seguinte homenagem: "Rendemos nossas homenagens aos que iniciaram essa caminhada e aos que continuam."',
    },
    {
      tipoItemOrdemDia: 'leitura_simples',
      titulo:
        'Homenagens e Comenda do Supremo Conclave do Brasil (Soberano Primaz Ir∴ Juliano Coelho Braga)',
      resumoMateria:
        'Entrega de Diploma Especial Comemorativo dos 25 Anos do Rito Brasileiro no Triângulo Mineiro e concessão de Comenda ao Ir∴ Claudio Manuel.',
      objetoManifestacao: true,
      tipoManifestacao: 'manifestacao_positiva',
      objetoVotacao: false,
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 18,
      qtdEsferasBrancas: 18,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 18,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Homenagens do Supremo Conclave do Brasil repassadas pelo Soberano Primaz do Rito Brasileiro, Irmão Juliano Coelho Braga: Diploma especial comemorativo dos 25 anos do Rito Brasileiro no Triângulo Mineiro a Lojas do Rito Brasileiro de Uberlândia e Região presentes: A∴R∴L∴S∴ Alpha e Ômega; A∴R∴L∴S∴ Fraternidade Sertaneja; A∴R∴L∴S∴ Edson Alves; A∴R∴L∴S∴ Caminhos de DeMolay (Oriente de Frutal); A∴R∴L∴S∴ Vigilantes da Ordem; A∴R∴L∴S∴ Acadêmica Sabedoria e Justiça (Oriente de Prata); e A∴R∴L∴S∴ Philantropia e Trabalho (Oriente de Araguari). Em nome do Supremo Conclave o Soberano Primaz concedeu ao Irmão Claudio Manuel uma comenda por todo trabalho desenvolvido em prol do Rito Brasileiro ao longo de seus anos na Ordem. Ao final das homenagens os Irmãos Roni Emerson Gonçalves, presidente do CMT representando todos os Irmãos visitantes, Irmão Claudio, falando em nome de todas as Lojas do Rito Brasileiro, Irmão Belmiro e o Irmão Juliano teceram comentários elogiosos sobre a sessão e o Rito Brasileiro.',
    },
  ],
  tempo_instrucao_json: {
    temaTitulo:
      'Peça sobre o início do Rito Brasileiro e a fundação da Loja Alpha e Ômega',
    apresentadorSelecionado: 'Ir∴ ALDO BORGES DE FREITAS',
    apresentadorOutro: '',
    resumoInstrucao:
      'Apresentada conjuntamente pelos Irmãos Fundadores da Loja: Ir∴ Aldo Borges de Freitas, Ir∴ José Rubens Buiatti e Ir∴ André Luiz Borges.',
  },
  palavra_bem_da_ordem_json: {
    textoConsolidadoAta:
      'Sob saudação do irmão Antônio Macine e novamente com a formação da guarda de honra foi dada saída ao Pavilhão Nacional.',
    colunaSul: [],
    colunaNorte: [],
    colunaOriente: [
      {
        irmaoSelecionado: 'outro',
        nomeOutro: 'RONI EMERSON GONÇALVES (PRESIDENTE DO CMT)',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: 'Uberlândia-MG',
        resumoFala:
          'Representando todos os Irmãos visitantes, teceu comentários elogiosos sobre a Sessão Magna Comemorativa e o Rito Brasileiro.',
      },
      {
        irmaoSelecionado: 'outro',
        nomeOutro: 'CLAUDIO MANUEL RESENDE',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: 'Uberlândia-MG',
        resumoFala:
          'Falando em nome de todas as Lojas do Rito Brasileiro após receber comenda do Supremo Conclave, teceu comentários elogiosos sobre a sessão e o Rito Brasileiro.',
      },
      {
        irmaoSelecionado: 'outro',
        nomeOutro: 'BELMIRO ABREU CUNHA',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: 'Uberlândia-MG',
        resumoFala:
          'Teceu comentários elogiosos sobre a sessão comemorativa e o Rito Brasileiro.',
      },
      {
        irmaoSelecionado: 'outro',
        nomeOutro:
          'JULIANO COELHO BRAGA (SOBERANO PRIMAZ DO RITO BRASILEIRO)',
        cargoIrmao: '',
        lojaVisitante: 'Supremo Conclave do Brasil',
        orienteVisitante: '',
        resumoFala:
          'Repassou as homenagens e diplomas especiais comemorativos dos 25 anos do Rito Brasileiro no Triângulo Mineiro e teceu comentários elogiosos sobre a sessão e o Rito Brasileiro.',
      },
    ],
    colunaAltar: [],
    palavraVeneravelMestre:
      'Agradeceu a presença dos 18 Irmãos do Quadro e 88 Irmãos Visitantes na Sessão Magna Comemorativa aos 25 Anos do Rito Brasileiro e encerrou ritualisticamente os trabalhos.',
    palavraOrador:
      'Atestou que os trabalhos da Sessão Magna Comemorativa transcorreram com solenidade, justeza e perfeição.',
  },
  texto_liturgico_gerado:
    'Balaústre Nº 54 (29/09/2026) — Sessão Magna Comemorativa aos 25 Anos do Rito Brasileiro — Loja Maçônica Alpha e Ômega Nº 3402.',
};

const SEED_BALAUSTRE_46_ROW: BalaustreSupabaseRow = {
  loja_id: DEFAULT_LOJA_ALPHA_OMEGA_ID,
  numero_balaustre: 46,
  periodo_gestao: '2025-2027',
  data_sessao: '2026-08-04',
  horario_abertura: '20:00',
  horario_encerramento: '22:25',
  grau_trabalhos: 'aprendiz',
  tipo_sessao: 'ordinaria',
  qtd_quadro_presentes: 19,
  qtd_visitantes_presentes: 1,
  saco_propostas_resultado_geral:
    'O Saco de Proposta e Informações colheu além dos bons fluidos, 01 colunas gravadas que foram decifradas pelo V∴ Mestre, como sendo:',
  instrucao_tema_titulo: 'Vícios e Virtudes',
  instrucao_apresentador_nome: 'Ir∴ PAULO HENRIQUE CUNHA',
  instrucao_resumo:
    'Por comunicação do Ir∴ 2º vigilante, a palavra foi passada ao nosso Irmão Paulo que nos brindou com o Trabalho "Vícios e Virtudes".',
  tronco_valor_apurado: 'R$ 101,85',
  tronco_valor_por_extenso: 'cento e um reais e oitenta e cinco centavos',
  tronco_destino: 'A cargo e julgo da Hospitalaria',
  texto_consolidado_item8: '',
  palavra_veneravel_mestre:
    'O Venerável Mestre destacou o elevado nível intelectual e o caráter democrático da sessão, ressaltando que as matérias complexas devem sempre ser submetidas à deliberação soberana da Assembleia. Conclamou o Quadro ao estudo aprofundado e constante da ritualística do Rito Brasileiro, visando a evitar a absorção indevida de costumes alheios ao Rito e ao fortalecimento das sessões. Expressou solidariedade e agradecimento ao Irmão Secretário pela dedicação e zelo com a documentação da Loja mesmo diante de adversidades pessoais.',
  palavra_orador:
    'O Ir∴ Orador Emerson constatou a ausência de visitantes na sessão. Registrou os cumprimentos ao Irmão Márcio pelo retorno e declarou que a sessão transcorreu em perfeita conformidade com as leis, regulamentos e costumes da Ordem.',
  emendas_ressalvas_final: null,
  configuracao_loja_json: DEFAULT_CONFIGURACAO_LOJA,
  cargos_json: {
    veneravelMestre: {
      irmaoSelecionado: 'Ir∴ MARCOS FERREIRA VASCONCELOS',
      nomeOutro: '',
      isTitular: true,
    },
    primeiroVigilante: {
      irmaoSelecionado: 'Ir∴ PAULO HENRIQUE CUNHA',
      nomeOutro: '',
      isTitular: true,
    },
    segundoVigilante: {
      irmaoSelecionado: 'Ir∴ JOSE RUBENS BUIATTI',
      nomeOutro: '',
      isTitular: false,
    },
    orador: {
      irmaoSelecionado: 'Ir∴ EMERSON LUIZ TEIXEIRA',
      nomeOutro: '',
      isTitular: true,
    },
    secretario: {
      irmaoSelecionado: 'Ir∴ MAXIMIANO EDUARDO PEREIRA',
      nomeOutro: '',
      isTitular: true,
    },
    tesoureiro: {
      irmaoSelecionado: 'Ir∴ ALDO BORGES DE FREITAS',
      nomeOutro: '',
      isTitular: false,
    },
    chanceler: {
      irmaoSelecionado: 'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
      nomeOutro: '',
      isTitular: false,
    },
    mestreCerimonias: {
      irmaoSelecionado: 'Ir∴ ANDERSON CARDOSO COSTA',
      nomeOutro: '',
      isTitular: true,
    },
    hospitaleiro: {
      irmaoSelecionado: 'Ir∴ HENRIQUE ROSALEN',
      nomeOutro: '',
      isTitular: true,
    },
    cobridorInterno: {
      irmaoSelecionado: 'Ir∴ ANDRE LUIZ BORGES',
      nomeOutro: '',
      isTitular: true,
    },
  },
  balaustres_lidos_json: [
    {
      numero: 45,
      statusAprovacao: 'aprovado_sem_restricoes',
      emendasObservacao: '',
    },
  ],
  expedientes_json: [
    {
      tipoExpediente: 'convite',
      subtipoConvite: 'Exaltação',
      nomesCandidatos:
        'Carlos Felix do Valle Junior, Cláudio Rocha Junqueira, Eloy Orlando Paiva Lima e Fernando Rodrigues Joel Batista',
      nomeIrmao: '',
      outroDetalheConvite: '',
      lojaConvite: 'Loja Maçônica Obreiros da Caridade nº 2573',
      orienteConvite: 'UBERLÂNDIA-MG',
      dataEvento: '2026-08-14',
      horaEvento: '19:30',
      enderecoEvento: 'Templo da Fundação Maçônica',
      origemOficio: 'loja',
      numeroOficio: '',
      ufInstituicao: 'MG',
      orienteInstituicao: 'UBERLÂNDIA-MG',
      nomeInstituicao: 'Loja Maçônica Obreiros da Caridade nº 2573',
      nomePessoa: '',
      classificacaoOficio:
        'Ofício/Prancha de Convite (Sessões Magnas e Eventos)',
      outroTipoOficio: '',
      dataRecebimentoOficio: '2026-08-04',
      assuntoOficio: '',
      destinoOficio: 'lido_arquivado',
      enviadoOrdemDia: false,
      descricao:
        'Carta convite da Loja Maçônica Obreiros da Caridade nº 2573, Benfeitora da Ordem, para Sessão Magna de Exaltação a ser realizada no dia 14 de Agosto de 2026, às 19h30min, no Templo da Fundação Maçônica, onde serão exaltados os irmãos Carlos Felix do Valle Junior, Cláudio Rocha Junqueira, Eloy Orlando Paiva Lima e Fernando Rodrigues Joel Batista.',
    },
    {
      tipoExpediente: 'convite',
      subtipoConvite: 'Elevação',
      nomesCandidatos: 'Veloel do Carmo Júnior e William Pereira Comácio',
      nomeIrmao: '',
      outroDetalheConvite: '',
      lojaConvite: 'A∴R∴L∴S∴ Renascer nº 286',
      orienteConvite: 'UBERLÂNDIA-MG',
      dataEvento: '2026-08-25',
      horaEvento: '19:30',
      enderecoEvento: 'Av. Rio Branco, 1518 – Uberlândia/MG',
      origemOficio: 'loja',
      numeroOficio: '',
      ufInstituicao: 'MG',
      orienteInstituicao: 'UBERLÂNDIA-MG',
      nomeInstituicao: 'A∴R∴L∴S∴ Renascer nº 286',
      nomePessoa: '',
      classificacaoOficio:
        'Ofício/Prancha de Convite (Sessões Magnas e Eventos)',
      outroTipoOficio: '',
      dataRecebimentoOficio: '2026-08-04',
      assuntoOficio: '',
      destinoOficio: 'lido_arquivado',
      enviadoOrdemDia: false,
      descricao:
        'Carta convite da A∴R∴L∴S∴ Renascer nº 286, para Sessão Magna de Elevação a ser realizada no dia 25/08/2026, às 19h30m, na Av. Rio Branco, 1518 – Uberlândia/MG, onde serão elevados os irmãos Veloel do Carmo Júnior e William Pereira Comácio.',
    },
    {
      tipoExpediente: 'convite',
      subtipoConvite: 'Iniciação',
      nomesCandidatos:
        'Hélio de Freitas Melgaço Júnior e Maikholl Nemer Vieira Rodrigues',
      nomeIrmao: '',
      outroDetalheConvite: '',
      lojaConvite: 'A∴R∴L∴S∴ Confraria de São João nº 354',
      orienteConvite: 'UBERLÂNDIA-MG',
      dataEvento: '2026-08-10',
      horaEvento: '19:30',
      enderecoEvento:
        'Rua João Limírio dos Anjos, 1025, antiga 40, Bairro Santa Mônica – Uberlândia/MG',
      origemOficio: 'loja',
      numeroOficio: '',
      ufInstituicao: 'MG',
      orienteInstituicao: 'UBERLÂNDIA-MG',
      nomeInstituicao: 'A∴R∴L∴S∴ Confraria de São João nº 354',
      nomePessoa: '',
      classificacaoOficio:
        'Ofício/Prancha de Convite (Sessões Magnas e Eventos)',
      outroTipoOficio: '',
      dataRecebimentoOficio: '2026-08-04',
      assuntoOficio: '',
      destinoOficio: 'lido_arquivado',
      enviadoOrdemDia: false,
      descricao:
        'Carta convite da A∴R∴L∴S∴ Confraria de São João nº 354, para Sessão Magna de Iniciação (sob o Rito York Americano) a ser realizada no dia 10 de Agosto de 2026, às 19h30, na Rua João Limírio dos Anjos, 1025, antiga 40, Bairro Santa Mônica – Uberlândia/MG, onde serão iniciados os candidatos Hélio de Freitas Melgaço Júnior e Maikholl Nemer Vieira Rodrigues.',
    },
    {
      tipoExpediente: 'normal',
      subtipoConvite: 'Outros',
      nomesCandidatos: '',
      nomeIrmao: '',
      outroDetalheConvite: '',
      lojaConvite: 'A∴R∴L∴S∴ Estrela Uberlandense',
      orienteConvite: 'UBERLÂNDIA-MG',
      dataEvento: '',
      horaEvento: '20:00',
      enderecoEvento: '',
      origemOficio: 'loja',
      numeroOficio: '',
      ufInstituicao: 'MG',
      orienteInstituicao: 'UBERLÂNDIA-MG',
      nomeInstituicao: 'A∴R∴L∴S∴ Estrela Uberlandense',
      nomePessoa: '',
      classificacaoOficio: 'Outros',
      outroTipoOficio: '',
      dataRecebimentoOficio: '2026-08-04',
      assuntoOficio: '',
      destinoOficio: 'lido_arquivado',
      enviadoOrdemDia: false,
      descricao:
        'Informações de diversas lojas sobre o início de suas atividades com convite da Loja Estrela Uberlandense para sua sessão.',
    },
  ],
  saco_propostas_itens_json: [
    {
      descricao:
        '01 Certificados de visita de irmão do nosso quadro a outra Oficina;',
    },
  ],
  ordem_dia_json: [
    {
      tipoItemOrdemDia: 'deliberacao_comum',
      titulo:
        'Posicionamento da Loja internamente e nos grupos de WhatsApp durante o período eleitoral',
      resumoMateria:
        'Discussão e deliberação sobre o bloqueio dos grupos de WhatsApp durante o período eleitoral e manifestação de Irmãos candidatos em Loja.',
      objetoManifestacao: true,
      tipoManifestacao: 'manifestacao_positiva',
      objetoVotacao: true,
      resultadoVotacao: 'aprovada_maioria',
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 19,
      qtdEsferasBrancas: 19,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 19,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Foi discutido de maneira efusiva os aspectos gerais da proposta sendo apresentada a proposta sobre bloqueio dos grupos de whatsapp durante o período de eleição. Sendo aprovado por maioria simples o NÃO BLOQUEIO do grupo e a penalização caso ocorra postagens relacionadas sobre política. Seguinte texto: "Postagens sobre política serão imediatamente apagadas por qualquer administrador e, em caso de reincidência, o Irmão será suspenso do grupo até o término do processo eleitoral, momento em que poderá retornar". Discussão sobre a possibilidade de irmãos Candidatos se manifestarem em loja, sendo aprovado por unanimidade que aquele que solicitar terá 5 (cinco) minutos de fala e os candidatos que não fazem parte da ordem podem enviar ofícios a serem lidos no mesmo tempo.',
    },
    {
      tipoItemOrdemDia: 'leitura_simples',
      titulo: 'Apresentação da dinâmica do jantar de aniversário da Loja',
      resumoMateria: 'Apresentado dinâmica de jantar de aniversário da Loja.',
      objetoManifestacao: false,
      tipoManifestacao: 'sem_manifestacao',
      objetoVotacao: false,
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 19,
      qtdEsferasBrancas: 19,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 19,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Apresentado dinâmica de jantar de aniversário da Loja.',
    },
    {
      tipoItemOrdemDia: 'escrutinio',
      titulo: 'Escrutínio secreto de profano: Wallace Junior Santos Nascimento',
      resumoMateria:
        'Escrutínio secreto do candidato Sr. Wallace Junior Santos Nascimento.',
      objetoManifestacao: true,
      tipoManifestacao: 'manifestacao_positiva',
      objetoVotacao: true,
      resultadoVotacao: 'aprovada_unanimidade',
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: 'Wallace Junior Santos Nascimento',
      totalVotantes: 19,
      qtdEsferasBrancas: 19,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 19,
      resultadoProclamacao: 'LIMPO E PURO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'O Venerável Mestre procedeu então ao escrutínio secreto do primeiro candidato, Sr. Wallace Junior Santos Nascimento, lendo todo o expediente referente à documentação do candidato, bem como o parecer da Comissão de Admissão e Graus. Em seguida colocou a palavra nas colunas, sendo que na coluna do sul reinou o silêncio, na coluna do Norte o Ir∴ Otanes informa conhecer o candidato, fazendo considerações elogiosas. Reinou silêncio no Oriente e no altar. O Venerável Mestre consultou o Irmão Orador sobre a legalidade do ato. O Orador comentou sobre os procedimentos do escrutínio à luz dos nossos regulamentos. Os irmãos Mestre de Cerimônias e Experto distribuíram as esferas, tendo o escrutínio apresentado o resultado de 19 esferas brancas e nenhuma esfera preta, número esse que coincidiu com o número de irmãos presentes à sessão, sendo assim o Venerável Mestre declarou o candidato limpo e puro. O Venerável Mestre informou e pediu uma bateria de alegria para os apresentantes e sindicantes do candidato que são: Apresentante: o Irmão Domicio; Sindicantes: os Irmãos Lindomar, Emerson e Luiz Luciano.',
    },
  ],
  tempo_instrucao_json: {
    temaTitulo: 'Vícios e Virtudes',
    apresentadorSelecionado: 'Ir∴ PAULO HENRIQUE CUNHA',
    apresentadorOutro: '',
    resumoInstrucao:
      'Por comunicação do Ir∴ 2º vigilante, a palavra foi passada ao nosso Irmão Paulo que nos brindou com o Trabalho "Vícios e Virtudes".',
  },
  palavra_bem_da_ordem_json: {
    textoConsolidadoAta: '',
    colunaSul: [
      {
        irmaoSelecionado: 'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Expressou seus agradecimentos iniciais e apresentou o relatório de atividades da Comissão de Beneficência. Detalhou a rotina de doações promovida pela Oficina nas periferias da cidade e relatou a crescente demanda por auxílio manifestada por diversas entidades filantrópicas e sociais locais. Informou que, visando ao fortalecimento do caixa da Beneficência para o atendimento contínuo de famílias em vulnerabilidade social e aquisição de suprimentos e equipamentos (como cadeiras de rodas), a Comissão organizou uma rifa solidária no valor de R$ 15,00 por bilhete, totalizando 200 números, com sorteio previsto para o final do mês de setembro. Solicitou o empenho e a adesão de todo o Quadro na aquisição e venda dos bilhetes.',
      },
      {
        irmaoSelecionado: 'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
        nomeOutro: '',
        cargoIrmao: 'Chanceler substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Anunciou os certificados de visitas de irmãos do quadro a outras oficinas. Em seguida, teceu reflexões acerca da participação do maçom no debate político. Sustentou que a política deve ser objeto de discussão consciente e questionamento, refutando a postura de acomodação ou omissão dos cidadãos perante os representantes públicos. Defendeu a necessidade de avaliação criteriosa e cobrança direta dos mandatários, ressaltando o papel histórico e o compromisso da Ordem com o progresso social.',
      },
    ],
    colunaNorte: [
      {
        irmaoSelecionado: 'Ir∴ MARCIO PATRICIO GONÇALVES DA SILVEIRA',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Manifestou sua satisfação e alegria pelo retorno aos trabalhos presenciais da Oficina após um período de oito meses de ausência, colocando-se à disposição do Quadro.',
      },
      {
        irmaoSelecionado: 'Ir∴ OTANES BARCELOS OLIVEIRA NETO',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Congratulou a Oficina pela condução dos trabalhos da noite e pelo nível das discussões apresentadas. Registrou seu apoio às reflexões sobre o engajamento político consciente do cidadão e conclamou os Irmãos a colaborarem ativamente com a venda das rifas da Comissão de Beneficência.',
      },
      {
        irmaoSelecionado: 'Ir∴ LUIZ FERNANDO MARRA DE AQUINO',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Declarou seu apoio à campanha da Beneficência, comprometendo-se com a venda dos bilhetes da rifa. Parabenizou o trabalho apresentado pelo Irmão Paulo, tecendo comentários acerca da observância ritualística, destacando a importância da execução precisa do Rito Brasileiro para a elevação e a padronização dos trabalhos em Templo, ressaltando que suas contribuições visam ao aprimoramento coletivo da Oficina.',
      },
      {
        irmaoSelecionado: 'Ir∴ ALDO BORGES DE FREITAS',
        nomeOutro: '',
        cargoIrmao: 'Tesoureiro substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Cumprimentou o Irmão Márcio pelo retorno ao Templo e elogiou a riqueza dos temas debatidos na Ordem do Dia. Destacou a importância do respeito mútuo na convivência de opiniões e diversidades de pensamento. Registrou, por fim, que o tronco colheu a medalha cunhada de R$ 101,85 (cento e um reais e oitenta e cinco centavos), que ficaram a cargo e julgo da Hospitalaria.',
      },
      {
        irmaoSelecionado: 'Ir∴ PAULO HENRIQUE CUNHA',
        nomeOutro: '',
        cargoIrmao: '1º Vigilante',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Alinhou-se aos posicionamentos sobre a importância da discussão política consciente, ponderando que a omissão representa uma tomada de posição. Defendeu que a atuação do maçom e da sociedade deve ser balizada pelo princípio da justiça e pela responsabilidade individual sobre os próprios atos e manifestações públicas. Declarou também seu apoio às ações da Comissão de Beneficência.',
      },
    ],
    colunaOriente: [
      {
        irmaoSelecionado: 'Ir∴ MAXIMIANO EDUARDO PEREIRA',
        nomeOutro: '',
        cargoIrmao: 'Secretário',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Parabenizou a apresentação da Peça de Arquitetura da noite, correlacionando as alegorias conceituais apresentadas ao papel do ordenamento jurídico como estrutura de proteção e harmonia social. Compartilhou a experiência de utilização de ferramentas de inteligência artificial (como a plataforma NotebookLM) para a organização e consulta célere das normas do Regulamento Geral, do Regimento Interno e dos Códigos Maçônicos. Explicou a fundamentação regimental dos seus votos em propostas administrativas da sessão, ressaltando o dever do cumprimento das normas internas e a necessidade de prevenção de conflitos em meios digitais de comunicação. Por fim, prestou um depoimento pessoal em tom de desabafo sobre o acompanhamento da enfermidade de seu pai, refletindo sobre a importância do perdão, do diálogo preventivo e da empatia nas relações humanas e fraternais.',
      },
    ],
    colunaAltar: [],
    palavraVeneravelMestre:
      'O Venerável Mestre destacou o elevado nível intelectual e o caráter democrático da sessão, ressaltando que as matérias complexas devem sempre ser submetidas à deliberação soberana da Assembleia. Conclamou o Quadro ao estudo aprofundado e constante da ritualística do Rito Brasileiro, visando a evitar a absorção indevida de costumes alheios ao Rito e ao fortalecimento das sessões. Expressou solidariedade e agradecimento ao Irmão Secretário pela dedicação e zelo com a documentação da Loja mesmo diante de adversidades pessoais.',
    palavraOrador:
      'O Ir∴ Orador Emerson constatou a ausência de visitantes na sessão. Registrou os cumprimentos ao Irmão Márcio pelo retorno e declarou que a sessão transcorreu em perfeita conformidade com as leis, regulamentos e costumes da Ordem.',
  },
  texto_liturgico_gerado:
    'Balaústre Nº 46 (04/08/2026) — Sessão Ordinária no Grau 1 (Aprendiz Maçom) — Loja Maçônica Alpha e Ômega Nº 3402.',
};

const SEED_BALAUSTRE_44_ROW: BalaustreSupabaseRow = {
  loja_id: DEFAULT_LOJA_ALPHA_OMEGA_ID,
  numero_balaustre: 44,
  periodo_gestao: '2025-2027',
  data_sessao: '2026-06-30',
  horario_abertura: '20:00',
  horario_encerramento: '21:27',
  grau_trabalhos: 'aprendiz',
  tipo_sessao: 'ordinaria',
  qtd_quadro_presentes: 14,
  qtd_visitantes_presentes: 0,
  saco_propostas_resultado_geral:
    'O Saco de Proposta e Informações colheu além dos bons fluidos 1 colunas gravadas assim decifradas pelo VM:',
  instrucao_tema_titulo: 'São João Batista e a Maçonaria',
  instrucao_apresentador_nome: 'Ir∴ LEMUEL DELFINO ALVES',
  instrucao_resumo:
    'Por comunicação do Ir∴ 2º Vig∴, é ocupado por nosso valoroso Ir∴ LEMUEL DELFINO ALVES, que apresentou o belo Trabalho "São João Batista e a Maçonaria", sendo aplaudido ao final dos trabalhos.',
  tronco_valor_apurado: 'R$ 171,00',
  tronco_valor_por_extenso: 'cento e setenta e um reais',
  tronco_destino: 'A cargo e julgo da Hospitalaria',
  texto_consolidado_item8: '',
  palavra_veneravel_mestre:
    'Parabenizou o irmão Lemuel pelo trabalho apresentado sobre São João Batista, destacando a importância da mensagem transmitida e fazendo referência ao exemplo de São João como aquele que proclama a verdade, mesmo diante das adversidades, sem buscar reconhecimento pessoal. Na sequência, informou que será apresentada uma proposta referente à organização dos jantares da Loja, conforme tratativas realizadas com o Venerável Mestre. Comunicou que, nas próximas sessões, será finalizado o projeto para apresentação aos irmãos, visando à deliberação sobre a divisão dos jantares em turnos, conforme aprovação realizada anteriormente.',
  palavra_orador:
    'O Orador destacou que a sessão transcorreu de forma equilibrada, contando com a presença de 12 irmãos Mestres, um irmão Aprendiz e um irmão Companheiro, formando o número adequado para o desenvolvimento dos trabalhos em sua plenitude. Ressaltou que, diante da regularidade dos procedimentos realizados, a sessão ocorreu em conformidade com as leis e regulamentos da Ordem.',
  emendas_ressalvas_final: null,
  configuracao_loja_json: DEFAULT_CONFIGURACAO_LOJA,
  cargos_json: {
    veneravelMestre: {
      irmaoSelecionado: 'Ir∴ PAULO HENRIQUE CUNHA',
      nomeOutro: '',
      isTitular: false,
    },
    primeiroVigilante: {
      irmaoSelecionado: 'Ir∴ ISAIAS FERREIRA DOS SANTOS',
      nomeOutro: '',
      isTitular: false,
    },
    segundoVigilante: {
      irmaoSelecionado: 'Ir∴ JOSE RUBENS BUIATTI',
      nomeOutro: '',
      isTitular: false,
    },
    orador: {
      irmaoSelecionado: 'Ir∴ ALDO BORGES DE FREITAS',
      nomeOutro: '',
      isTitular: false,
    },
    secretario: {
      irmaoSelecionado: 'Ir∴ MAXIMIANO EDUARDO PEREIRA',
      nomeOutro: '',
      isTitular: true,
    },
    tesoureiro: {
      irmaoSelecionado: 'Ir∴ HENRIQUE ROSALEN',
      nomeOutro: '',
      isTitular: false,
    },
    chanceler: {
      irmaoSelecionado: 'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
      nomeOutro: '',
      isTitular: false,
    },
    mestreCerimonias: {
      irmaoSelecionado: 'Ir∴ ANDERSON CARDOSO COSTA',
      nomeOutro: '',
      isTitular: true,
    },
    hospitaleiro: {
      irmaoSelecionado: 'Ir∴ HENRIQUE ROSALEN',
      nomeOutro: '',
      isTitular: true,
    },
    cobridorInterno: {
      irmaoSelecionado: 'Ir∴ ANDRE LUIZ BORGES',
      nomeOutro: '',
      isTitular: true,
    },
  },
  balaustres_lidos_json: [
    {
      numero: 43,
      statusAprovacao: 'aprovado_com_emendas',
      emendasObservacao:
        'com a ressalva de anotação do nome correto do Ir∴ Carlos Alberto de Almeida Leal',
    },
  ],
  expedientes_json: [],
  saco_propostas_itens_json: [
    {
      descricao: '1 prancha recebida a ser lida na ordem do dia.',
    },
  ],
  ordem_dia_json: [
    {
      tipoItemOrdemDia: 'deliberacao_comum',
      titulo:
        'Suspensão dos pedidos de quite placet dos Irmãos Márcio e Alexsander',
      resumoMateria:
        'Leitura de prancha do secretário acerca dos irmãos Márcio e Alexsander sobre a suspensão dos quites placet solicitados.',
      objetoManifestacao: true,
      tipoManifestacao: 'manifestacao_positiva',
      objetoVotacao: true,
      resultadoVotacao: 'aprovada_unanimidade',
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 14,
      qtdEsferasBrancas: 14,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 14,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Leitura de prancha do secretário acerca dos irmãos Márcio e Alexsander sobre a suspensão dos quites placet solicitados. Alguns irmãos fizeram considerações pontuais sobre o fato. Colocado em votação o cancelamento do pedido dos quites, o tema foi aprovado por unanimidade.',
    },
    {
      tipoItemOrdemDia: 'leitura_simples',
      titulo:
        'Prancha encaminhada à Bethel Áurea do Triângulo (Apresentação em Comemoração ao Dia dos Pais)',
      resumoMateria:
        'Foi lida, para conhecimento dos irmãos, a prancha informando a solicitação encaminhada à Bethel Áurea do Triângulo para apresentação em comemoração ao Dia dos Pais.',
      objetoManifestacao: false,
      tipoManifestacao: 'sem_manifestacao',
      objetoVotacao: false,
      cenarioEscrutinio: 'aprovado_limpo',
      tipoProcessoEscrutinio: 'Iniciação',
      nomeCandidato: '',
      totalVotantes: 14,
      qtdEsferasBrancas: 14,
      qtdEsferasPretas: 0,
      totalEsferasPrimeiroGiro: 14,
      resultadoProclamacao: 'APROVADO E LIMPO',
      prazoDiasJustificativa: '15',
      dataSessaoAnterior: '',
      statusJustificativa:
        'não foi apresentada qualquer justificação pelo obreiro opositor',
      textoRedacaoFinal:
        'Foi lida, para conhecimento dos irmãos, a prancha informando a solicitação encaminhada à Bethel Áurea do Triângulo para apresentação em comemoração ao Dia dos Pais.',
    },
  ],
  tempo_instrucao_json: {
    temaTitulo: 'São João Batista e a Maçonaria',
    apresentadorSelecionado: 'Ir∴ LEMUEL DELFINO ALVES',
    apresentadorOutro: '',
    resumoInstrucao:
      'Por comunicação do Ir∴ 2º Vig∴, é ocupado por nosso valoroso Ir∴ LEMUEL DELFINO ALVES, que apresentou o belo Trabalho "São João Batista e a Maçonaria", sendo aplaudido ao final dos trabalhos.',
  },
  palavra_bem_da_ordem_json: {
    textoConsolidadoAta: '',
    colunaSul: [
      {
        irmaoSelecionado: 'Ir∴ LINDOMAR APARECIDO FURNIEL DE OLIVEIRA',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Manifestou sua satisfação com a permanência dos irmãos Márcio e Alexsander na Oficina, destacando, em especial, a trajetória do irmão Márcio, que desde sua iniciação sempre demonstrou dedicação aos trabalhos, tendo ocupado diversos cargos na Loja. Ressaltou que o pedido de quite anteriormente apresentado causou surpresa, mas que recebe com alegria sua decisão de permanecer, manifestando a expectativa de que continue contribuindo ativamente com os trabalhos e assumindo as responsabilidades inerentes à Ordem. Quanto ao irmão Alexsander, mencionou que, por ser mais recente na Loja, ainda não teve a oportunidade de acompanhá-lo de forma mais próxima, mas também considera importante sua permanência. Na oportunidade, reforçou que a campanha de arrecadação de alimentos permanecerá até a próxima semana, restando apenas três sessões para as doações. Informou que os alimentos serão destinados ao projeto coordenado pela cunhada Eneida, que presta assistência a pessoas em situação de rua, ressaltando a importância da participação dos irmãos e a relevância da contribuição da Loja para essa iniciativa.',
      },
      {
        irmaoSelecionado: 'Ir∴ CARLOS ALBERTO DE ALMEIDA LEAL',
        nomeOutro: '',
        cargoIrmao: 'Chanceler substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Anunciou os irmãos aniversariantes, aos quais foi solicitada uma calorosa salva de palmas em homenagem à passagem de seus aniversários.',
      },
      {
        irmaoSelecionado: 'Ir∴ JOSE RUBENS BUIATTI',
        nomeOutro: '',
        cargoIrmao: '2º Vigilante substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Manifestou-se acerca do trabalho apresentado pelo irmão Lemuel, destacando que, embora já tenha acompanhado diversos estudos sobre João Batista, este se distinguiu pela abordagem pessoal e pela forma como o tema foi desenvolvido. Elogiou a originalidade da apresentação, ressaltando a profundidade das reflexões expostas, e parabenizou o irmão pela qualidade do trabalho.',
      },
    ],
    colunaNorte: [
      {
        irmaoSelecionado: 'Ir∴ ANDERSON CARDOSO COSTA',
        nomeOutro: '',
        cargoIrmao: 'Mestre de Cerimônias',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Manifestou-se favoravelmente ao retorno dos irmãos que solicitaram a suspensão dos pedidos de quite placet, destacando sua confiança no parecer emitido pela Comissão competente. Em relação ao irmão Márcio, ressaltou que o conhece há muitos anos e reconhece sua dedicação à Loja, atribuindo seu afastamento às exigências da vida acadêmica. Demonstrou satisfação com sua permanência e manifestou o desejo de que volte a participar ativamente dos trabalhos da Oficina. Quanto ao irmão Alexsander, recordou sua trajetória na Ordem, reconhecendo seu empenho para concluir as etapas da formação maçônica, apesar das dificuldades decorrentes da distância e dos deslocamentos. Destacou sua contribuição para a Loja e manifestou alegria por sua permanência, ainda que haja a expectativa de seu desligamento ao final do ano.',
      },
      {
        irmaoSelecionado: 'Ir∴ HENRIQUE ROSALEN',
        nomeOutro: '',
        cargoIrmao: 'Tesoureiro substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Por fim informou que o tronco de solidariedade colheu além de bons fluidos a medalha cunhada de R$ 38,00 (trinta e oito reais), que ficaram a cargo e julgo da hospitalaria.',
      },
      {
        irmaoSelecionado: 'Ir∴ ISAIAS FERREIRA DOS SANTOS',
        nomeOutro: '',
        cargoIrmao: '1º Vigilante substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Manifestou sua satisfação com a condução da harmonia pelo irmão Lindomar, destacando que as canções executadas proporcionaram um momento de reflexão e emoção. Também parabenizou o irmão Lemuel pelo trabalho apresentado, elogiando a qualidade das reflexões e a abordagem do tema. Na sequência, manifestou-se favoravelmente ao retorno do irmão Márcio, ressaltando suas qualidades pessoais e sua trajetória na Loja. Destacou que sua decisão de permanecer demonstra o valor que atribui à Maçonaria e manifestou a expectativa de que continue contribuindo ativamente com os trabalhos da Oficina. Por fim, parabenizou o irmão Paulo pela condução da sessão e justificou sua ausência na reunião anterior em razão de problemas de saúde.',
      },
    ],
    colunaOriente: [
      {
        irmaoSelecionado: 'Ir∴ LUIZ FERNANDO MARRA DE AQUINO',
        nomeOutro: '',
        cargoIrmao: '',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Parabenizou o irmão Lemuel pelo trabalho apresentado e pela oratória. Em seguida, solicitou ao secretário que, na ata que foi lida, fosse registrado também o encaminhamento realizado pelo Venerável Mestre ao Orador para a apreciação do pedido de quite placet do irmão Nélio, antes da votação, entendendo que tal procedimento faz parte dos acontecimentos da sessão e merece constar no registro, além do resultado da deliberação que foi aprovado por unanimidade.',
      },
      {
        irmaoSelecionado: 'Ir∴ ALDO BORGES DE FREITAS',
        nomeOutro: '',
        cargoIrmao: 'Orador substituto',
        lojaVisitante: '',
        orienteVisitante: '',
        resumoFala:
          'Manifestou apreço pelo trabalho apresentado pelo irmão Lemuel, destacando a profundidade das reflexões e a forma como o tema foi desenvolvido. Ressaltou, em especial, a mensagem de que a verdadeira grandeza não está no reconhecimento das pessoas, mas nos valores e princípios cultivados interiormente. Observou que o reconhecimento externo é passageiro e que o maçom deve buscar, acima de tudo, o aprimoramento moral e a fidelidade aos seus próprios princípios, conforme os ensinamentos da Ordem. Ao final, parabenizou o irmão, afirmando que o trabalho suscitou importantes reflexões.',
      },
    ],
    colunaAltar: [],
    palavraVeneravelMestre:
      'Parabenizou o irmão Lemuel pelo trabalho apresentado sobre São João Batista, destacando a importância da mensagem transmitida e fazendo referência ao exemplo de São João como aquele que proclama a verdade, mesmo diante das adversidades, sem buscar reconhecimento pessoal. Na sequência, informou que será apresentada uma proposta referente à organização dos jantares da Loja, conforme tratativas realizadas com o Venerável Mestre. Comunicou que, nas próximas sessões, será finalizado o projeto para apresentação aos irmãos, visando à deliberação sobre a divisão dos jantares em turnos, conforme aprovação realizada anteriormente.',
    palavraOrador:
      'O Orador destacou que a sessão transcorreu de forma equilibrada, contando com a presença de 12 irmãos Mestres, um irmão Aprendiz e um irmão Companheiro, formando o número adequado para o desenvolvimento dos trabalhos em sua plenitude. Ressaltou que, diante da regularidade dos procedimentos realizados, a sessão ocorreu em conformidade com as leis e regulamentos da Ordem.',
  },
  texto_liturgico_gerado:
    'Balaústre Nº 44 (30/06/2026) — Sessão Ordinária no Grau 1 (Aprendiz Maçom) — Loja Maçônica Alpha e Ômega Nº 3402.',
};

/**
 * Lista todos os Balaústres salvos da Loja (mesclando Supabase + cache local),
 * ordenados do mais recente para o mais antigo.
 */
export async function listarBalaustresSalvosSupabase(
  lojaId: string = DEFAULT_LOJA_ALPHA_OMEGA_ID
): Promise<BalaustreSupabaseRow[]> {
  const mapaPorChave = new Map<string, BalaustreSupabaseRow>();

  // Garante os Balaústres Nº 57, Nº 56, Nº 54, Nº 46 e Nº 44 (extraídos dos PDFs oficiais) disponíveis para a Loja 3402
  if (lojaId === DEFAULT_LOJA_ALPHA_OMEGA_ID) {
    mapaPorChave.set('57-2025-2027', SEED_BALAUSTRE_57_ROW);
    mapaPorChave.set('56-2025-2027', SEED_BALAUSTRE_56_ROW);
    mapaPorChave.set('54-2025-2027', SEED_BALAUSTRE_54_ROW);
    mapaPorChave.set('46-2025-2027', SEED_BALAUSTRE_46_ROW);
    mapaPorChave.set('44-2025-2027', SEED_BALAUSTRE_44_ROW);
  }

  // 1. Lê Balaústres salvos no localStorage pertencentes a esta Loja (ignorando registros antigos com numeração anterior corrigida)
  try {
    const chavesAntigasDescartar = new Set([
      '53:2026-09-29',
      '55:2026-10-13',
      '56:2026-10-20',
    ]);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('balaustre_3402_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as BalaustreSupabaseRow;
          const lojaDoRegistro = parsed?.loja_id || DEFAULT_LOJA_ALPHA_OMEGA_ID;
          if (parsed && parsed.numero_balaustre && lojaDoRegistro === lojaId) {
            if (
              chavesAntigasDescartar.has(
                `${parsed.numero_balaustre}:${parsed.data_sessao}`
              )
            ) {
              localStorage.removeItem(key);
              continue;
            }
            const chave = `${parsed.numero_balaustre}-${parsed.periodo_gestao || '2025-2027'}`;
            mapaPorChave.set(chave, parsed);
          }
        }
      }
    }
  } catch {
    // Ignora falha de leitura local
  }

  // 2. Busca no Supabase (`public.balaustres`)
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('balaustres')
        .select('*')
        .eq('loja_id', lojaId)
        .order('numero_balaustre', { ascending: false });

      if (!error && Array.isArray(data)) {
        const chavesAntigasDescartar = new Set([
          '53:2026-09-29',
          '55:2026-10-13',
          '56:2026-10-20',
        ]);
        for (const row of data as BalaustreSupabaseRow[]) {
          if (
            chavesAntigasDescartar.has(
              `${row.numero_balaustre}:${row.data_sessao}`
            )
          ) {
            continue;
          }
          const chave = `${row.numero_balaustre}-${row.periodo_gestao || '2025-2027'}`;
          mapaPorChave.set(chave, row);
        }
      }
    } catch {
      // Usa cache local se offline
    }
  }

  return Array.from(mapaPorChave.values()).sort(
    (a, b) => b.numero_balaustre - a.numero_balaustre
  );
}

/**
 * Exclui um Balaústre salvo no Supabase e no cache local.
 */
export async function excluirBalaustreSupabase(
  row: BalaustreSupabaseRow
): Promise<void> {
  localStorage.removeItem(`balaustre_3402_${row.numero_balaustre}`);

  if (supabaseClient) {
    if (row.id) {
      await supabaseClient.from('balaustres').delete().eq('id', row.id);
    } else {
      await supabaseClient
        .from('balaustres')
        .delete()
        .eq('loja_id', row.loja_id || DEFAULT_LOJA_ALPHA_OMEGA_ID)
        .eq('numero_balaustre', row.numero_balaustre)
        .eq('periodo_gestao', row.periodo_gestao || '2025-2027');
    }
  }
}

/**
 * Converte uma linha salva (`BalaustreSupabaseRow`) de volta para `BalaustreFormData`
 * para permitir reabrir, editar ou reimprimir qualquer Balaústre anterior no formulário
 * (inclusive Balaústres inseridos diretamente via script SQL `INSERT` no banco).
 */
export function converterRowParaFormData(
  row: BalaustreSupabaseRow
): BalaustreFormData {
  const configPadrao = carregarConfiguracaoLojaSalva();
  const diretoriaPadrao = carregarDiretoriaTitularSalva(row.loja_id);

  const cfgJson =
    row.configuracao_loja_json &&
    typeof row.configuracao_loja_json === 'object' &&
    Object.keys(row.configuracao_loja_json).length > 0
      ? row.configuracao_loja_json
      : null;

  const cargosPadrao = {
    veneravelMestre: {
      irmaoSelecionado: diretoriaPadrao.veneravelMestre,
      nomeOutro: '',
      isTitular: true,
    },
    primeiroVigilante: {
      irmaoSelecionado: diretoriaPadrao.primeiroVigilante,
      nomeOutro: '',
      isTitular: true,
    },
    segundoVigilante: {
      irmaoSelecionado: diretoriaPadrao.segundoVigilante,
      nomeOutro: '',
      isTitular: true,
    },
    orador: {
      irmaoSelecionado: diretoriaPadrao.orador,
      nomeOutro: '',
      isTitular: true,
    },
    secretario: {
      irmaoSelecionado: diretoriaPadrao.secretario,
      nomeOutro: '',
      isTitular: true,
    },
    tesoureiro: {
      irmaoSelecionado: diretoriaPadrao.tesoureiro,
      nomeOutro: '',
      isTitular: true,
    },
    chanceler: {
      irmaoSelecionado: diretoriaPadrao.chanceler,
      nomeOutro: '',
      isTitular: true,
    },
    mestreCerimonias: {
      irmaoSelecionado: diretoriaPadrao.mestreCerimonias,
      nomeOutro: '',
      isTitular: true,
    },
    hospitaleiro: {
      irmaoSelecionado: diretoriaPadrao.hospitaleiro,
      nomeOutro: '',
      isTitular: true,
    },
    cobridorInterno: {
      irmaoSelecionado: diretoriaPadrao.cobridorInterno,
      nomeOutro: '',
      isTitular: true,
    },
  };

  const cargosJson =
    row.cargos_json &&
    typeof row.cargos_json === 'object' &&
    Object.keys(row.cargos_json).length > 0
      ? { ...cargosPadrao, ...row.cargos_json }
      : cargosPadrao;

  const tiJson =
    row.tempo_instrucao_json &&
    typeof row.tempo_instrucao_json === 'object' &&
    Object.keys(row.tempo_instrucao_json).length > 0
      ? row.tempo_instrucao_json
      : null;

  const pboJson =
    row.palavra_bem_da_ordem_json &&
    typeof row.palavra_bem_da_ordem_json === 'object' &&
    Object.keys(row.palavra_bem_da_ordem_json).length > 0
      ? row.palavra_bem_da_ordem_json
      : null;

  return {
    configuracaoLoja: {
      ...configPadrao,
      ...(cfgJson || {}),
      gestao:
        cfgJson?.gestao ||
        row.periodo_gestao ||
        configPadrao.gestao ||
        '2025-2027',
    },
    numeroBalaustre: Number(row.numero_balaustre) || 141,
    dataSessao: row.data_sessao,
    horarioAbertura: String(row.horario_abertura || '20:00').slice(0, 5),
    grauTrabalhos: row.grau_trabalhos || 'aprendiz',
    tipoSessao: row.tipo_sessao || 'ordinaria',
    cargos: cargosJson,
    quorum: {
      qtdQuadroPresentes: row.qtd_quadro_presentes ?? 21,
      qtdVisitantesPresentes: row.qtd_visitantes_presentes ?? 0,
    },
    balaustresLidos: Array.isArray(row.balaustres_lidos_json)
      ? row.balaustres_lidos_json
      : [],
    expedientesRecebidos: Array.isArray(row.expedientes_json)
      ? row.expedientes_json
      : [],
    sacoPropostasResultadoGeral: row.saco_propostas_resultado_geral || '',
    itensSacoPropostas: Array.isArray(row.saco_propostas_itens_json)
      ? row.saco_propostas_itens_json
      : [],
    itensOrdemDia: Array.isArray(row.ordem_dia_json) ? row.ordem_dia_json : [],
    tempoInstrucao: {
      temaTitulo: tiJson?.temaTitulo ?? row.instrucao_tema_titulo ?? '',
      apresentadorSelecionado:
        tiJson?.apresentadorSelecionado ??
        row.instrucao_apresentador_nome ??
        '',
      apresentadorOutro: tiJson?.apresentadorOutro ?? '',
      resumoInstrucao: tiJson?.resumoInstrucao ?? row.instrucao_resumo ?? '',
    },
    troncoBeneficencia: {
      valorApurado: row.tronco_valor_apurado || 'R$ 0,00',
      valorPorExtenso: row.tronco_valor_por_extenso || 'zero reais',
      destinoConferencia:
        row.tronco_destino || 'A cargo e julgo da hospitalaria',
    },
    palavraBemDaOrdem: {
      textoConsolidadoAta:
        pboJson?.textoConsolidadoAta ?? row.texto_consolidado_item8 ?? '',
      colunaSul: Array.isArray(pboJson?.colunaSul) ? pboJson.colunaSul : [],
      colunaNorte: Array.isArray(pboJson?.colunaNorte)
        ? pboJson.colunaNorte
        : [],
      colunaOriente: Array.isArray(pboJson?.colunaOriente)
        ? pboJson.colunaOriente
        : [],
      colunaAltar: Array.isArray(pboJson?.colunaAltar)
        ? pboJson.colunaAltar
        : [],
      palavraOrador: pboJson?.palavraOrador ?? row.palavra_orador ?? '',
      palavraVeneravelMestre:
        pboJson?.palavraVeneravelMestre ?? row.palavra_veneravel_mestre ?? '',
    },
    horarioEncerramento: String(row.horario_encerramento || '22:00').slice(
      0,
      5
    ),
  };
}

