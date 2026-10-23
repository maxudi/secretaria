-- ============================================================================
-- MIGRATION 004: AJUSTE DE POLÍTICAS RLS PARA OPERAÇÃO IMEDIATA (ETAPA 2)
-- Permite que a Loja Padrão (Alpha e Ômega Nº 3402) sincronize Quadro, Diretoria
-- e Balaústres com a chave publishable (`anon`) antes mesmo da ativação da tela
-- de Login (Etapa 3), mantendo o isolamento multi-loja quando autenticado.
-- ============================================================================

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

-- Atualiza políticas da tabela `lojas`
DROP POLICY IF EXISTS "Usuarios veem apenas sua propria Loja" ON public.lojas;
DROP POLICY IF EXISTS "Secretario ou Veneravel atualiza sua Loja" ON public.lojas;
DROP POLICY IF EXISTS "Acesso a propria Loja" ON public.lojas;

CREATE POLICY "Acesso a propria Loja"
  ON public.lojas FOR ALL
  TO anon, authenticated
  USING (id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

-- Atualiza políticas de `irmaos_quadro`
DROP POLICY IF EXISTS "Acesso restrito ao Quadro da propria Loja" ON public.irmaos_quadro;
CREATE POLICY "Acesso restrito ao Quadro da propria Loja"
  ON public.irmaos_quadro FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

-- Atualiza políticas de `gestoes_diretoria`
DROP POLICY IF EXISTS "Acesso restrito as Gestoes da propria Loja" ON public.gestoes_diretoria;
CREATE POLICY "Acesso restrito as Gestoes da propria Loja"
  ON public.gestoes_diretoria FOR ALL
  TO anon, authenticated
  USING (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin())
  WITH CHECK (loja_id = public.obter_loja_id_usuario_atual() OR public.eh_super_admin());

-- Atualiza políticas de `lojas_catalogo`
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

-- Atualiza políticas de `frases_padrao_item8`
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

-- Atualiza políticas de `balaustres` e tabelas filhas
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

