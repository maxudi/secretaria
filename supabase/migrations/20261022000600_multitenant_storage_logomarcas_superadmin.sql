-- ============================================================================
-- MIGRATION 006: ARQUITETURA MULTI-TENANT (MULTI-LOJAS), BUCKET `logomarcas`
-- E CREDENCIAL DE SUPER USUÁRIO (`super_admin`)
-- ============================================================================

-- 1. Garante o bucket `logomarcas` público no Supabase Storage e libera políticas RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('logomarcas', 'logomarcas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Leitura publica de logomarcas" ON storage.objects;
CREATE POLICY "Leitura publica de logomarcas"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logomarcas');

DROP POLICY IF EXISTS "Upload de logomarcas das lojas" ON storage.objects;
CREATE POLICY "Upload de logomarcas das lojas"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'logomarcas');

DROP POLICY IF EXISTS "Atualizacao de logomarcas das lojas" ON storage.objects;
CREATE POLICY "Atualizacao de logomarcas das lojas"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'logomarcas')
  WITH CHECK (bucket_id = 'logomarcas');

DROP POLICY IF EXISTS "Exclusao de logomarcas das lojas" ON storage.objects;
CREATE POLICY "Exclusao de logomarcas das lojas"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'logomarcas');

-- 2. Atualiza as políticas RLS das tabelas para suportar múltiplas Lojas (Multi-Tenant)
-- quando autenticadas via tabela `usuarios_cim` (chave publishable/anon)
DROP POLICY IF EXISTS "Acesso a propria Loja" ON public.lojas;
DROP POLICY IF EXISTS "Multi-tenant acesso lojas" ON public.lojas;
CREATE POLICY "Multi-tenant acesso lojas"
  ON public.lojas FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito as Gestoes da propria Loja" ON public.gestoes_diretoria;
DROP POLICY IF EXISTS "Multi-tenant acesso gestoes_diretoria" ON public.gestoes_diretoria;
CREATE POLICY "Multi-tenant acesso gestoes_diretoria"
  ON public.gestoes_diretoria FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito ao Quadro da propria Loja" ON public.irmaos_quadro;
DROP POLICY IF EXISTS "Multi-tenant acesso irmaos_quadro" ON public.irmaos_quadro;
CREATE POLICY "Multi-tenant acesso irmaos_quadro"
  ON public.irmaos_quadro FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito aos usuarios CIM da propria Loja" ON public.usuarios_cim;
DROP POLICY IF EXISTS "Multi-tenant acesso usuarios_cim" ON public.usuarios_cim;
CREATE POLICY "Multi-tenant acesso usuarios_cim"
  ON public.usuarios_cim FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito aos Balaustres da propria Loja" ON public.balaustres;
DROP POLICY IF EXISTS "Multi-tenant acesso balaustres" ON public.balaustres;
CREATE POLICY "Multi-tenant acesso balaustres"
  ON public.balaustres FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito aos Balaustres Lidos da propria Loja" ON public.balaustres_lidos_sessao;
DROP POLICY IF EXISTS "Multi-tenant acesso balaustres_lidos_sessao" ON public.balaustres_lidos_sessao;
CREATE POLICY "Multi-tenant acesso balaustres_lidos_sessao"
  ON public.balaustres_lidos_sessao FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito aos Expedientes da propria Loja" ON public.balaustre_expedientes;
DROP POLICY IF EXISTS "Multi-tenant acesso balaustre_expedientes" ON public.balaustre_expedientes;
CREATE POLICY "Multi-tenant acesso balaustre_expedientes"
  ON public.balaustre_expedientes FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito a Ordem do Dia da propria Loja" ON public.balaustre_ordem_dia;
DROP POLICY IF EXISTS "Multi-tenant acesso balaustre_ordem_dia" ON public.balaustre_ordem_dia;
CREATE POLICY "Multi-tenant acesso balaustre_ordem_dia"
  ON public.balaustre_ordem_dia FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso restrito as Manifestacoes da propria Loja" ON public.balaustre_manifestacoes_colunas;
DROP POLICY IF EXISTS "Multi-tenant acesso balaustre_manifestacoes_colunas" ON public.balaustre_manifestacoes_colunas;
CREATE POLICY "Multi-tenant acesso balaustre_manifestacoes_colunas"
  ON public.balaustre_manifestacoes_colunas FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Insere a credencial de SUPER USUÁRIO (`super_admin`) para gestão Multi-Lojas
-- CIM: 99999 | Senha inicial: 99999
INSERT INTO public.usuarios_cim (
  loja_id,
  cim,
  irmao_nome,
  papel,
  senha_acesso,
  ativo
) VALUES (
  '00000000-0000-0000-0000-000000003402',
  '99999',
  'Super Administrador (Gestão Multi-Lojas)',
  'super_admin',
  '99999',
  TRUE
)
ON CONFLICT (loja_id, cim) DO UPDATE SET
  papel = 'super_admin',
  ativo = TRUE;

