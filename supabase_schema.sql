-- ============================================================================
-- SCHEMA SUPABASE: SECRETARIA DA ARLS ALPHA E ÔMEGA Nº 3402
-- ============================================================================

create table if not exists public.balaustres (
  id uuid primary key default gen_random_uuid(),
  configuracao_loja_json jsonb not null default '{}'::jsonb,
  numero_balaustre integer not null unique,
  data_sessao date not null,
  horario_abertura time not null default '20:00',
  horario_encerramento time not null,
  grau_trabalhos text not null check (grau_trabalhos in ('aprendiz', 'companheiro', 'mestre')),
  tipo_sessao text not null,
  cargos_json jsonb not null default '{}'::jsonb,
  qtd_quadro_presentes integer not null default 0,
  qtd_visitantes_presentes integer not null default 0,
  balaustres_lidos_json jsonb not null default '[]'::jsonb,
  expedientes_json jsonb not null default '[]'::jsonb,
  saco_propostas_resumo text,
  saco_propostas_itens_json jsonb not null default '[]'::jsonb,
  ordem_dia_json jsonb not null default '[]'::jsonb,
  tempo_instrucao_json jsonb not null default '{}'::jsonb,
  tronco_valor text not null default 'R$ 0,00',
  tronco_destino text,
  palavra_bem_da_ordem_json jsonb not null default '{}'::jsonb,
  texto_liturgico_gerado text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_balaustres_numero on public.balaustres (numero_balaustre desc);
create index if not exists idx_balaustres_data on public.balaustres (data_sessao desc);

