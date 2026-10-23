-- ============================================================================
-- MIGRATION 005 (AUTOCONTIDA E SEM ERRO DE ENUM):
-- Atualiza `irmaos_quadro` (CIM, Telefone, Status em TEXT e Membro Honorário),
-- cria `usuarios_cim` (Login por CIM), libera as políticas RLS e garante os
-- dados iniciais da Loja Maçônica Alpha e Ômega Nº 3402.
-- ============================================================================

-- 1. Garante a função de trigger de `updated_at`
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Ajusta a tabela `irmaos_quadro` (converte `situacao` para TEXT para aceitar
-- 'regular', 'licenciado', 'irregular' sem depender de ENUM e cria `membro_honorario`)
ALTER TABLE public.irmaos_quadro
  ADD COLUMN IF NOT EXISTS cim TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS membro_honorario BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'irmaos_quadro'
      AND column_name = 'situacao'
  ) THEN
    ALTER TABLE public.irmaos_quadro
      ALTER COLUMN situacao DROP DEFAULT;
    ALTER TABLE public.irmaos_quadro
      ALTER COLUMN situacao TYPE TEXT USING situacao::TEXT;
    ALTER TABLE public.irmaos_quadro
      ALTER COLUMN situacao SET DEFAULT 'regular';
  ELSE
    ALTER TABLE public.irmaos_quadro
      ADD COLUMN situacao TEXT NOT NULL DEFAULT 'regular';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_irmaos_quadro_cim ON public.irmaos_quadro(loja_id, cim);

-- 3. Cria a tabela `usuarios_cim` para Autenticação Restrita por Número CIM
CREATE TABLE IF NOT EXISTS public.usuarios_cim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  cim TEXT NOT NULL,
  irmao_nome TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'secretario', -- 'secretario' | 'veneravel' | 'orador' | 'obreiro' | 'super_admin'
  senha_acesso TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (loja_id, cim)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_cim_loja_cim ON public.usuarios_cim(loja_id, cim);

DROP TRIGGER IF EXISTS trg_usuarios_cim_updated_at ON public.usuarios_cim;
CREATE TRIGGER trg_usuarios_cim_updated_at
BEFORE UPDATE ON public.usuarios_cim
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.usuarios_cim ENABLE ROW LEVEL SECURITY;

-- 4. Garante as funções auxiliares de segurança multi-loja
CREATE OR REPLACE FUNCTION public.obter_loja_id_usuario_atual()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT loja_id
      FROM public.perfis_usuarios
      WHERE id = auth.uid() AND ativo = TRUE
      LIMIT 1
    ),
    '00000000-0000-0000-0000-000000003402'::uuid
  );
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
      AND papel::TEXT = 'super_admin'
      AND ativo = TRUE
  );
$$;

-- 5. Atualiza as Políticas de Segurança (RLS) para permitir leitura e gravação
DROP POLICY IF EXISTS "Usuarios veem apenas sua propria Loja" ON public.lojas;
DROP POLICY IF EXISTS "Secretario ou Veneravel atualiza sua Loja" ON public.lojas;
DROP POLICY IF EXISTS "Acesso a propria Loja" ON public.lojas;
CREATE POLICY "Acesso a propria Loja"
  ON public.lojas FOR ALL
  TO anon, authenticated
  USING (id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

DROP POLICY IF EXISTS "Acesso restrito ao Quadro da propria Loja" ON public.irmaos_quadro;
CREATE POLICY "Acesso restrito ao Quadro da propria Loja"
  ON public.irmaos_quadro FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

DROP POLICY IF EXISTS "Acesso restrito as Gestoes da propria Loja" ON public.gestoes_diretoria;
CREATE POLICY "Acesso restrito as Gestoes da propria Loja"
  ON public.gestoes_diretoria FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

DROP POLICY IF EXISTS "Acesso aos usuarios CIM da propria Loja" ON public.usuarios_cim;
CREATE POLICY "Acesso aos usuarios CIM da propria Loja"
  ON public.usuarios_cim FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

DROP POLICY IF EXISTS "Leitura de Lojas do catalogo oficial ou da propria Loja" ON public.lojas_catalogo;
CREATE POLICY "Leitura de Lojas do catalogo oficial ou da propria Loja"
  ON public.lojas_catalogo FOR SELECT
  TO anon, authenticated
  USING (
    loja_proprietaria_id IS NULL
    OR loja_proprietaria_id = public.obter_loja_id_usuario_atual()
    OR public.eh_super_admin()
  );

DROP POLICY IF EXISTS "Insercao de novas Lojas no catalogo da propria Loja" ON public.lojas_catalogo;
CREATE POLICY "Insercao de novas Lojas no catalogo da propria Loja"
  ON public.lojas_catalogo FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    loja_proprietaria_id = public.obter_loja_id_usuario_atual()
    OR public.eh_super_admin()
  );

DROP POLICY IF EXISTS "Leitura de frases padrao ou da propria Loja" ON public.frases_padrao_item8;
CREATE POLICY "Leitura de frases padrao ou da propria Loja"
  ON public.frases_padrao_item8 FOR SELECT
  TO anon, authenticated
  USING (
    loja_id IS NULL
    OR loja_id = public.obter_loja_id_usuario_atual()
    OR public.eh_super_admin()
  );

DROP POLICY IF EXISTS "Gerenciamento de frases da propria Loja" ON public.frases_padrao_item8;
CREATE POLICY "Gerenciamento de frases da propria Loja"
  ON public.frases_padrao_item8 FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

DROP POLICY IF EXISTS "Isolamento total de Balaustres por Loja" ON public.balaustres;
CREATE POLICY "Isolamento total de Balaustres por Loja"
  ON public.balaustres FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

DROP POLICY IF EXISTS "Isolamento de Balaustres Lidos por Loja" ON public.balaustres_lidos_sessao;
CREATE POLICY "Isolamento de Balaustres Lidos por Loja"
  ON public.balaustres_lidos_sessao FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

DROP POLICY IF EXISTS "Isolamento de Expedientes por Loja" ON public.balaustre_expedientes;
CREATE POLICY "Isolamento de Expedientes por Loja"
  ON public.balaustre_expedientes FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

DROP POLICY IF EXISTS "Isolamento de Ordem do Dia por Loja" ON public.balaustre_ordem_dia;
CREATE POLICY "Isolamento de Ordem do Dia por Loja"
  ON public.balaustre_ordem_dia FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

DROP POLICY IF EXISTS "Isolamento de Manifestacoes por Loja" ON public.balaustre_manifestacoes_colunas;
CREATE POLICY "Isolamento de Manifestacoes por Loja"
  ON public.balaustre_manifestacoes_colunas FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

-- ============================================================================
-- 6. GARANTE O REGISTRO DA LOJA ALPHA E ÔMEGA Nº 3402, DO QUADRO E DO CIM 3402
-- ============================================================================
INSERT INTO public.lojas (
  id,
  slug,
  invocacao,
  nome_loja,
  numero_loja,
  potencia_jurisdicao,
  reunioes_dia_hora,
  rito_potencia,
  endereco_templo,
  oriente_cidade_uf,
  email_loja,
  gestao_atual
) VALUES (
  '00000000-0000-0000-0000-000000003402',
  'alpha-e-omega-3402',
  'À Gl∴ do Supr∴ Arq∴ do Univ∴',
  'LOJA MAÇÔNICA ALPHA E ÔMEGA',
  '3402',
  'Jurisdicionada ao GRANDE ORIENTE DO BRASIL',
  'Reuniões às terças-feiras – 20:00 horas',
  'RITO BRASILEIRO',
  'Rua do Fazendeiro, 680',
  'Uberlândia-MG',
  'alphaeomega@cmt.org.br',
  '2025-2027'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.usuarios_cim (
  loja_id,
  cim,
  irmao_nome,
  papel,
  senha_acesso,
  ativo
) VALUES (
  '00000000-0000-0000-0000-000000003402',
  '3402',
  'Ir∴ MAXIMIANO EDUARDO PEREIRA',
  'secretario',
  '3402',
  TRUE
)
ON CONFLICT (loja_id, cim) DO NOTHING;
