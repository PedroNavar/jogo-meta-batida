-- ============================================================================
-- Jogo da Meta Batida — schema Postgres (Supabase)
-- Multi-cliente (tenant) desde a base. Motor reconstruído do contrato em
-- docs/contrato-api.md. Rode no SQL Editor do Supabase.
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- TENANT (cliente). Resolve marca, perguntas e lojas por cliente.
-- Resolução em runtime: por slug (subdomínio ou ?c=slug) ou pela rodada.
-- ---------------------------------------------------------------------------
create table tenant (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,                 -- ex.: 'sipolatti'
  nome          text not null,
  logo_url      text,                                 -- marca por cliente
  cor_primaria  text,
  mensagem_home text,
  -- senhas guardadas como hash (nunca em claro). Ver docs/deploy.md.
  senha_gerente_hash text not null,
  senha_admin_hash   text not null,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- LOJA / filial
-- ---------------------------------------------------------------------------
create table loja (
  tenant_id uuid not null references tenant(id) on delete cascade,
  filial    text not null,                            -- '03'
  nome      text,
  rotulo    text not null,                            -- '03 · Santa Mônica (Vila Velha/ES)'
  primary key (tenant_id, filial)
);

-- ---------------------------------------------------------------------------
-- PERGUNTA (banco mestre do cliente). 'base' marca perguntas Venda 4.0
-- compartilháveis entre clientes (copiadas na criação do tenant).
-- ---------------------------------------------------------------------------
create table pergunta (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenant(id) on delete cascade,
  texto      text not null,
  tipo       text,
  tema       text,
  opcoes     text[] not null check (array_length(opcoes,1) = 4),
  correta    smallint not null check (correta between 0 and 3),  -- NUNCA sai p/ jogador
  segundos   int check (segundos is null or segundos between 1 and 3600),
  imagem     text,
  status     text not null default 'pendente' check (status in ('pendente','aprovada')),
  ativa      boolean not null default true,
  base       boolean not null default false,
  criado_em  timestamptz not null default now()
);
create index on pergunta (tenant_id, ativa, status);

-- ---------------------------------------------------------------------------
-- RODADA
-- ---------------------------------------------------------------------------
create table rodada (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id) on delete cascade,
  nome        text not null,
  status      text not null default 'criada' check (status in ('criada','aberta','encerrada')),
  segundos    int  not null default 30 check (segundos between 1 and 3600),
  podio       text not null default 'geral' check (podio in ('geral','loja')),
  responsavel text,
  travada     boolean not null default true,     -- aguarda instrutor começar
  iniciada    boolean not null default false,    -- congela a lista de perguntas
  grupo       boolean not null default false,    -- rodada de loja/regional (link próprio)
  loja        text,                              -- rodada presa a uma filial (opcional)
  publico     text[],                            -- cargos permitidos (regional)
  criada_por  text,                              -- 'admin' | 'gerente'
  aberta_em    timestamptz,
  encerrada_em timestamptz,
  criado_em    timestamptz not null default now()
);
create index on rodada (tenant_id, status);

-- Perguntas congeladas da rodada (snapshot na entrada do 1º jogador) --------
create table rodada_pergunta (
  rodada_id  uuid not null references rodada(id) on delete cascade,
  ordem      int  not null,
  pergunta_id uuid not null references pergunta(id),
  -- snapshot imutável, para edições futuras não mexerem na rodada já iniciada
  texto    text not null,
  tema     text,
  produto  text,
  opcoes   text[] not null,
  correta  smallint not null,
  segundos int,
  imagem   text,
  primary key (rodada_id, ordem)
);

-- Lista de esperados (presença prevista) ------------------------------------
create table esperado (
  id        uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references rodada(id) on delete cascade,
  nome      text not null,
  loja      text,
  cargo     text
);

-- ---------------------------------------------------------------------------
-- JOGADOR (participação numa rodada). token = Bearer do jogador.
-- ---------------------------------------------------------------------------
create table jogador (
  id        uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references rodada(id) on delete cascade,
  nome      text not null,
  cargo     text not null,                 -- Gerente|Regional|Vendedor|Outro
  loja      text,
  token     text unique not null,
  pontos    int not null default 0,
  acertos   int not null default 0,
  erros     int not null default 0,
  situacao  text not null default 'aguardando'
            check (situacao in ('aguardando','em-jogo','terminou')),
  indice_atual int not null default 0,     -- aponta p/ rodada_pergunta.ordem
  pergunta_iniciada_em timestamptz,        -- base do cronômetro p/ pontuar velocidade
  entrou_em timestamptz not null default now(),
  -- nome único por rodada (regra "esse nome já jogou")
  unique (rodada_id, nome)
);
create index on jogador (rodada_id);
-- pódio precisa de ranking rápido:
create index on jogador (rodada_id, pontos desc);

-- ---------------------------------------------------------------------------
-- RESPOSTA (uma por jogador+pergunta; 2ª tentativa vira 409)
-- ---------------------------------------------------------------------------
create table resposta (
  jogador_id uuid not null references jogador(id) on delete cascade,
  ordem      int  not null,                -- rodada_pergunta.ordem respondida
  opcao      smallint not null check (opcao between 0 and 3),
  acertou    boolean not null,
  pontos     int not null,
  ms         int,                          -- tempo de resposta (ms) p/ auditoria
  respondido_em timestamptz not null default now(),
  primary key (jogador_id, ordem)
);

-- ---------------------------------------------------------------------------
-- REALTIME: o pódio vem de uma subscription nesta view materializada leve.
-- Alternativa simples: habilitar Realtime na tabela `jogador` e o telão/jogador
-- recomputam o top a cada mudança. Ver docs/realtime.md.
-- ---------------------------------------------------------------------------
-- Segurança: RLS LIGADO. Jogadores NUNCA leem `pergunta.correta` nem `resposta`.
-- Todo acesso de escrita e leitura sensível passa por Edge Function (service role).
alter table tenant          enable row level security;
alter table loja            enable row level security;
alter table pergunta        enable row level security;
alter table rodada          enable row level security;
alter table rodada_pergunta enable row level security;
alter table esperado        enable row level security;
alter table jogador         enable row level security;
alter table resposta        enable row level security;

-- Sem policies = ninguém acessa via anon/authenticated direto.
-- As Edge Functions usam a service role key (ignora RLS) e devolvem só o
-- que o contrato permite — em especial, o ranking SEM o gabarito.
-- A única exceção de leitura pública direta é o ranking do pódio, exposto por
-- uma policy restrita numa VIEW sem a coluna `correta` (criada em realtime.sql).
