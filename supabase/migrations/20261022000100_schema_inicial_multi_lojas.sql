-- ============================================================================
-- MIGRATION 001: ARQUITETURA MULTI-LOJAS (SAAS SECRETARIA MAÇÔNICA)
-- Banco de Dados: PostgreSQL / Supabase
-- Inclui: Tabelas Relacionais, Índices, Triggers de Auditoria e RLS (Segurança)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TIPOS ENUMERADOS (DOMÍNIOS LITÚRGICOS E ADMINISTRATIVOS)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.papel_usuario_loja AS ENUM (
    'super_admin',
    'veneravel',
    'secretario',
    'orador',
    'leitura'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.grau_maconico AS ENUM (
    'aprendiz',
    'companheiro',
    'mestre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.situacao_obreiro AS ENUM (
    'regular',
    'licenciado',
    'irregular',
    'quite_placet',
    'emérito',
    'inativo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_sessao_loja AS ENUM (
    'ordinaria',
    'magna_iniciacao',
    'magna_elevacao',
    'magna_exaltacao',
    'magna_instalacao_posse',
    'magna_outra',
    'extraordinaria',
    'funebre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_aprovacao_balaustre AS ENUM (
    'aprovado_sem_restricoes',
    'aprovado_com_emendas',
    'rejeitado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_expediente_recebido AS ENUM (
    'normal',
    'convite',
    'carta_consulta',
    'oficio_prancha'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.origem_oficio_prancha AS ENUM (
    'loja',
    'instituicao',
    'pessoa'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.destino_oficio_prancha AS ENUM (
    'lido_arquivado',
    'ordem_do_dia',
    'sob_malhete'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_item_ordem_dia AS ENUM (
    'leitura_simples',
    'deliberacao_comum',
    'escrutinio'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cenario_escrutinio AS ENUM (
    'aprovado_limpo',
    'divergencia_segundo_giro',
    'sobrestado_1_ou_2_pretas',
    'rejeitado_3_ou_mais_pretas',
    'desfecho_sessao_posterior'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coluna_manifestacao AS ENUM (
    'sul',
    'norte',
    'oriente',
    'altar'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. FUNÇÃO DE ATUALIZAÇÃO AUTOMÁTICA DE `updated_at`
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. TABELA `lojas` (MULTI-TENANT: CADA LOJA ASSINANTE DO SISTEMA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  invocacao TEXT NOT NULL DEFAULT 'À Gl∴ do Supr∴ Arq∴ do Univ∴',
  nome_loja TEXT NOT NULL,
  numero_loja TEXT NOT NULL,
  potencia_jurisdicao TEXT NOT NULL DEFAULT 'Jurisdicionada ao GRANDE ORIENTE DO BRASIL',
  reunioes_dia_hora TEXT NOT NULL DEFAULT 'Reuniões às terças-feiras – 20:00 horas',
  rito_potencia TEXT NOT NULL DEFAULT 'RITO BRASILEIRO',
  endereco_templo TEXT NOT NULL,
  oriente_cidade_uf TEXT NOT NULL,
  uf CHAR(2) NOT NULL DEFAULT 'MG',
  email_loja TEXT,
  gestao_atual TEXT NOT NULL DEFAULT '2025-2027',
  logo_url TEXT,
  ultimo_numero_balaustre INTEGER NOT NULL DEFAULT 124,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_lojas_updated_at
BEFORE UPDATE ON public.lojas
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- 4. TABELA `perfis_usuarios` (VINCULA USUÁRIO DO SUPABASE AUTH À LOJA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.perfis_usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL,
  nome_irmao TEXT NOT NULL,
  email TEXT NOT NULL,
  papel public.papel_usuario_loja NOT NULL DEFAULT 'secretario',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perfis_usuarios_loja_id ON public.perfis_usuarios(loja_id);

CREATE TRIGGER trg_perfis_usuarios_updated_at
BEFORE UPDATE ON public.perfis_usuarios
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- 5. TABELA `irmaos_quadro` (QUADRO DE OBREIROS DE CADA LOJA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.irmaos_quadro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome_exibicao TEXT NOT NULL, -- Ex: 'Ir∴ MARCOS FERREIRA VASCONCELOS'
  nome_civil TEXT NOT NULL,    -- Ex: 'MARCOS FERREIRA VASCONCELOS'
  cim TEXT,
  grau public.grau_maconico NOT NULL DEFAULT 'mestre',
  situacao TEXT NOT NULL DEFAULT 'regular', -- 'regular' | 'licenciado' | 'irregular'
  membro_honorario BOOLEAN NOT NULL DEFAULT FALSE,
  email TEXT,
  telefone TEXT,
  data_iniciacao DATE,
  data_elevacao DATE,
  data_exaltacao DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (loja_id, nome_exibicao)
);

CREATE INDEX IF NOT EXISTS idx_irmaos_quadro_loja_id ON public.irmaos_quadro(loja_id);

CREATE TRIGGER trg_irmaos_quadro_updated_at
BEFORE UPDATE ON public.irmaos_quadro
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- 6. TABELA `gestoes_diretoria` (DIRETORIA TITULAR POR GESTÃO: EX. 2025-2027)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gestoes_diretoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  periodo_gestao TEXT NOT NULL, -- Ex: '2025-2027'
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  veneravel_mestre_nome TEXT NOT NULL,
  primeiro_vigilante_nome TEXT NOT NULL,
  segundo_vigilante_nome TEXT NOT NULL,
  orador_nome TEXT NOT NULL,
  secretario_nome TEXT NOT NULL,
  tesoureiro_nome TEXT NOT NULL,
  chanceler_nome TEXT NOT NULL,
  mestre_cerimonias_nome TEXT NOT NULL,
  hospitaleiro_nome TEXT NOT NULL,
  cobridor_interno_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (loja_id, periodo_gestao)
);

CREATE INDEX IF NOT EXISTS idx_gestoes_diretoria_loja_id ON public.gestoes_diretoria(loja_id);

CREATE TRIGGER trg_gestoes_diretoria_updated_at
BEFORE UPDATE ON public.gestoes_diretoria
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- 7. TABELA `lojas_catalogo` (CATÁLOGO DE LOJAS VISITANTES / CONVITES / OFÍCIOS)
-- `loja_proprietaria_id` NULL = Catálogo Oficial Compartilhado (ex: GOB-MG)
-- `loja_proprietaria_id` preenchido = Loja customizada adicionada pela Loja cliente
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lojas_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_proprietaria_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  uf CHAR(2) NOT NULL DEFAULT 'MG',
  oriente TEXT NOT NULL,
  numero TEXT,
  nome_loja TEXT NOT NULL,
  nome_exibicao TEXT NOT NULL, -- Ex: 'A∴R∴L∴S∴ ALPHA E ÔMEGA Nº 3402'
  potencia TEXT DEFAULT 'GOB-MG',
  endereco_templo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lojas_catalogo_uf_oriente ON public.lojas_catalogo(uf, oriente);
CREATE INDEX IF NOT EXISTS idx_lojas_catalogo_proprietaria ON public.lojas_catalogo(loja_proprietaria_id);

-- ============================================================================
-- 8. TABELA `frases_padrao_item8` (BANCO DE FRASES DO ASSISTENTE DO ITEM 8)
-- `loja_id` NULL = Frase padrão oficial do sistema (visível para todas as Lojas)
-- `loja_id` preenchido = Frase personalizada daquela Loja
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.frases_padrao_item8 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  codigo_slug TEXT,
  titulo TEXT NOT NULL,
  palavra_chave TEXT NOT NULL,
  categoria TEXT NOT NULL,
  cargo TEXT,
  irmao_nome TEXT,
  texto_modelo TEXT NOT NULL,
  campos_variaveis TEXT[] DEFAULT '{}',
  ordem INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  personalizavel BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frases_item8_loja_categoria ON public.frases_padrao_item8(loja_id, categoria);

CREATE TRIGGER trg_frases_item8_updated_at
BEFORE UPDATE ON public.frases_padrao_item8
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- 9. TABELA PRINCIPAL `balaustres` E TABELAS RELACIONAIS FILHAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.balaustres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  gestao_id UUID REFERENCES public.gestoes_diretoria(id) ON DELETE SET NULL,
  numero_balaustre INTEGER NOT NULL,
  periodo_gestao TEXT NOT NULL DEFAULT '2025-2027',
  data_sessao DATE NOT NULL,
  horario_abertura TIME NOT NULL DEFAULT '20:00',
  horario_encerramento TIME NOT NULL DEFAULT '22:00',
  grau_trabalhos public.grau_maconico NOT NULL DEFAULT 'aprendiz',
  tipo_sessao public.tipo_sessao_loja NOT NULL DEFAULT 'ordinaria',

  -- Quórum (Chancelaria)
  qtd_quadro_presentes INTEGER NOT NULL DEFAULT 0,
  qtd_visitantes_presentes INTEGER NOT NULL DEFAULT 0,

  -- Saco de Propostas e Informações
  saco_propostas_resultado_geral TEXT,

  -- Tempo de Instrução
  instrucao_tema_titulo TEXT,
  instrucao_apresentador_nome TEXT,
  instrucao_resumo TEXT,

  -- Tronco de Beneficência
  tronco_valor_apurado TEXT NOT NULL DEFAULT 'R$ 0,00',
  tronco_valor_por_extenso TEXT NOT NULL DEFAULT 'zero reais',
  tronco_destino TEXT DEFAULT 'A cargo e julgo da hospitalaria',

  -- Palavra a Bem Geral e da Ordem (Altar e Orador/VM)
  texto_consolidado_item8 TEXT,
  palavra_orador TEXT,
  palavra_veneravel_mestre TEXT,
  emendas_ressalvas_final TEXT,

  -- Snapshots JSONB completos (garante fidelidade histórica exata da sessão no dia em que foi lavrada)
  configuracao_loja_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  cargos_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  balaustres_lidos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  expedientes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  saco_propostas_itens_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ordem_dia_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  tempo_instrucao_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  palavra_bem_da_ordem_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Minuta completa gerada
  texto_liturgico_gerado TEXT,

  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (loja_id, numero_balaustre, periodo_gestao)
);

CREATE INDEX IF NOT EXISTS idx_balaustres_loja_data ON public.balaustres(loja_id, data_sessao DESC);
CREATE INDEX IF NOT EXISTS idx_balaustres_loja_numero ON public.balaustres(loja_id, numero_balaustre DESC);

CREATE TRIGGER trg_balaustres_updated_at
BEFORE UPDATE ON public.balaustres
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- 9.1 Tabela Filha: Balaústres Anteriores Lidos na Sessão (Item 4.1)
CREATE TABLE IF NOT EXISTS public.balaustres_lidos_sessao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balaustre_id UUID NOT NULL REFERENCES public.balaustres(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  numero_balaustre_lido INTEGER NOT NULL,
  periodo_gestao TEXT NOT NULL DEFAULT '2025-2027',
  status_aprovacao public.status_aprovacao_balaustre NOT NULL DEFAULT 'aprovado_sem_restricoes',
  emendas_observacao TEXT,
  ordem INTEGER NOT NULL DEFAULT 1
);

-- 9.2 Tabela Filha: Expedientes Recebidos na Sessão (Item 4.2 - Normal, Convite, Carta Consulta, Ofício/Prancha)
CREATE TABLE IF NOT EXISTS public.balaustre_expedientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balaustre_id UUID NOT NULL REFERENCES public.balaustres(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo_expediente public.tipo_expediente_recebido NOT NULL DEFAULT 'normal',
  subtipo_convite TEXT,
  nomes_candidatos TEXT,
  nome_irmao TEXT,
  outro_detalhe_convite TEXT,
  loja_remetente TEXT,
  oriente_remetente TEXT,
  data_evento DATE,
  hora_evento TEXT,
  endereco_evento TEXT,
  origem_oficio public.origem_oficio_prancha,
  numero_oficio TEXT,
  uf_instituicao CHAR(2),
  oriente_instituicao TEXT,
  nome_instituicao TEXT,
  nome_pessoa TEXT,
  classificacao_oficio TEXT,
  outro_tipo_oficio TEXT,
  data_recebimento_oficio DATE,
  assunto_oficio TEXT,
  destino_oficio public.destino_oficio_prancha,
  enviado_ordem_dia BOOLEAN NOT NULL DEFAULT FALSE,
  descricao_final TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1
);

-- 9.3 Tabela Filha: Itens da Ordem do Dia e Escrutínios Secretos (Item 6.1)
CREATE TABLE IF NOT EXISTS public.balaustre_ordem_dia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balaustre_id UUID NOT NULL REFERENCES public.balaustres(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo_item public.tipo_item_ordem_dia NOT NULL DEFAULT 'deliberacao_comum',
  titulo TEXT NOT NULL,
  resumo_materia TEXT,
  objeto_manifestacao BOOLEAN NOT NULL DEFAULT FALSE,
  tipo_manifestacao TEXT,
  objeto_votacao BOOLEAN NOT NULL DEFAULT FALSE,
  resultado_votacao TEXT,
  cenario_escrutinio public.cenario_escrutinio,
  tipo_processo_escrutinio TEXT,
  nome_candidato TEXT,
  total_votantes INTEGER,
  qtd_esferas_brancas INTEGER,
  qtd_esferas_pretas INTEGER,
  total_esferas_primeiro_giro INTEGER,
  resultado_proclamacao TEXT,
  prazo_dias_justificativa TEXT,
  data_sessao_anterior TEXT,
  status_justificativa TEXT,
  texto_redacao_final TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1
);

-- 9.4 Tabela Filha: Manifestações nas Colunas e Altar (Item 8)
CREATE TABLE IF NOT EXISTS public.balaustre_manifestacoes_colunas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balaustre_id UUID NOT NULL REFERENCES public.balaustres(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  coluna public.coluna_manifestacao NOT NULL,
  irmao_nome TEXT NOT NULL,
  eh_visitante BOOLEAN NOT NULL DEFAULT FALSE,
  loja_visitante TEXT,
  oriente_visitante TEXT,
  cargo_na_sessao TEXT, -- NULL ou 'SEM_CARGO' quando falou sem cargo
  resumo_fala TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1
);

-- ============================================================================
-- 10. SEGURANÇA E ISOLAMENTO MAÇÔNICO (ROW LEVEL SECURITY - RLS)
-- Garante que apenas usuários autenticados da respectiva Loja vejam seus dados
-- ============================================================================

CREATE OR REPLACE FUNCTION public.obter_loja_id_usuario_atual()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT loja_id
  FROM public.perfis_usuarios
  WHERE id = auth.uid() AND ativo = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.eh_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfis_usuarios
    WHERE id = auth.uid()
      AND papel = 'super_admin'
      AND ativo = TRUE
  );
$$;

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irmaos_quadro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestoes_diretoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frases_padrao_item8 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balaustres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balaustres_lidos_sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balaustre_expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balaustre_ordem_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balaustre_manifestacoes_colunas ENABLE ROW LEVEL SECURITY;

-- Políticas para `lojas`
CREATE POLICY "Usuarios veem apenas sua propria Loja"
  ON public.lojas FOR SELECT
  TO authenticated
  USING (id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

CREATE POLICY "Secretario ou Veneravel atualiza sua Loja"
  ON public.lojas FOR UPDATE
  TO authenticated
  USING (id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

-- Políticas para `perfis_usuarios`
CREATE POLICY "Usuarios veem perfis da mesma Loja"
  ON public.perfis_usuarios FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

-- Políticas para `irmaos_quadro`
CREATE POLICY "Acesso restrito ao Quadro da propria Loja"
  ON public.irmaos_quadro FOR ALL
  TO authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

-- Políticas para `gestoes_diretoria`
CREATE POLICY "Acesso restrito as Gestoes da propria Loja"
  ON public.gestoes_diretoria FOR ALL
  TO authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

-- Políticas para `lojas_catalogo` (Lojas globais + Lojas criadas pela própria Loja)
CREATE POLICY "Leitura de Lojas do catalogo oficial ou da propria Loja"
  ON public.lojas_catalogo FOR SELECT
  TO authenticated
  USING (
    loja_proprietaria_id IS NULL
    OR loja_proprietaria_id = public.obter_loja_id_usuario_atual()
    OR public.eh_super_admin()
  );

CREATE POLICY "Insercao de novas Lojas no catalogo da propria Loja"
  ON public.lojas_catalogo FOR INSERT
  TO authenticated
  WITH CHECK (
    loja_proprietaria_id = public.obter_loja_id_usuario_atual()
    OR public.eh_super_admin()
  );

-- Políticas para `frases_padrao_item8` (Frases padrão do sistema + Frases da própria Loja)
CREATE POLICY "Leitura de frases padrao ou da propria Loja"
  ON public.frases_padrao_item8 FOR SELECT
  TO authenticated
  USING (
    loja_id IS NULL
    OR loja_id = public.obter_loja_id_usuario_atual()
    OR public.eh_super_admin()
  );

CREATE POLICY "Gerenciamento de frases da propria Loja"
  ON public.frases_padrao_item8 FOR ALL
  TO authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

-- Políticas para `balaustres` e tabelas filhas
CREATE POLICY "Isolamento total de Balaustres por Loja"
  ON public.balaustres FOR ALL
  TO authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

CREATE POLICY "Isolamento de Balaustres Lidos por Loja"
  ON public.balaustres_lidos_sessao FOR ALL
  TO authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

CREATE POLICY "Isolamento de Expedientes por Loja"
  ON public.balaustre_expedientes FOR ALL
  TO authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

CREATE POLICY "Isolamento de Ordem do Dia por Loja"
  ON public.balaustre_ordem_dia FOR ALL
  TO authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

CREATE POLICY "Isolamento de Manifestacoes por Loja"
  ON public.balaustre_manifestacoes_colunas FOR ALL
  TO authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

